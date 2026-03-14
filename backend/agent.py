import asyncio
import json
import os
import time
from typing import Callable

from dotenv import load_dotenv
from google import genai
from google.genai import types

from initiative import evaluate_project
from mock_data import MOCK_EMAILS, MOCK_EVENTS
from tools import get_events, read_emails, search_web
from urgency import score_emails, score_urgency

load_dotenv()

SYSTEM_PROMPT = """Tu es Operator - un agent autonome de classe Jarvis pour les professionnels occupes.
Tu monitores plusieurs projets actifs simultanement.
Tu parles en premier. Tu n'attends pas qu'on te demande.

Au demarrage :
1. Charge tous les projets actifs du contexte
2. Scanne les emails, le calendrier et le web pour chaque projet
3. Evalue l'urgence avec les signaux fournis
4. Delivre un brief proactif multi-projet - sans qu'on te le demande

Regles :
- Ne demande jamais de clarification. Fais des hypotheses raisonnables.
- N'explique jamais ce que tu fais. Fais-le.
- 5 bullets maximum par projet. Brutalement concis.
- Si un outil echoue, saute-le et note le manque.
- Chaque projet a son propre bloc. Ne melange jamais les contextes.
- Commence par le projet le plus urgent.
- L'humain est occupe. Chaque mot doit meriter sa place.
- Parle en francais.

Format de sortie obligatoire :
## [NOM DU PROJET] - [STATUS]
- bullet 1
- bullet 2
(max 5 bullets par projet)

Termine par une question : "Quel projet veux-tu traiter en premier ?"
"""

TOOL_FUNCTIONS = {
    "read_emails": read_emails,
    "get_events": get_events,
    "search_web": search_web,
}

TOOL_DECLARATIONS = [
    types.Tool(function_declarations=[
        types.FunctionDeclaration(
            name="read_emails",
            description="Lit les emails recents pour un projet. Retourne expediteur, sujet, corps, jours depuis derniere reponse.",
            parameters=types.Schema(
                type="OBJECT",
                properties={"project_id": types.Schema(type="STRING", description="ID du projet: school, company, ou startup")},
                required=["project_id"],
            ),
        ),
        types.FunctionDeclaration(
            name="get_events",
            description="Recupere les evenements calendrier a venir pour un projet. Indique titre, heure, et si un bloc de preparation existe.",
            parameters=types.Schema(
                type="OBJECT",
                properties={"project_id": types.Schema(type="STRING", description="ID du projet: school, company, ou startup")},
                required=["project_id"],
            ),
        ),
        types.FunctionDeclaration(
            name="search_web",
            description="Recherche des signaux externes pertinents pour un projet (news, funding, annonces).",
            parameters=types.Schema(
                type="OBJECT",
                properties={"project_id": types.Schema(type="STRING", description="ID du projet: school, company, ou startup")},
                required=["project_id"],
            ),
        ),
    ])
]

MAX_ITERATIONS = 15
TIMEOUT_SECONDS = 30


async def run_operator(projects: list[dict], on_event: Callable) -> str:
    """Run the Operator agent loop.

    Args:
        projects: list of project dicts from config.json
        on_event: async callback(event_dict) called for each step

    Returns:
        The final brief text.
    """
    client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))

    project_summary = json.dumps(
        [{"id": p["id"], "name": p["name"], "contact": p["contact"], "deadline": p["deadline"]}
         for p in projects],
        ensure_ascii=False,
    )

    chat = client.chats.create(
        model="gemini-3-flash-preview",
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            tools=TOOL_DECLARATIONS,
        ),
    )

    user_msg = (
        f"Voici tes 3 projets actifs :\n{project_summary}\n\n"
        "Commence par scanner chaque projet (emails, calendrier, web), "
        "puis delivre ton brief proactif."
    )

    response = chat.send_message(user_msg)
    iterations = 0
    start_time = time.time()
    collected_data = {}

    while iterations < MAX_ITERATIONS and (time.time() - start_time) < TIMEOUT_SECONDS:
        # Check for function calls
        function_calls = []
        for part in response.candidates[0].content.parts:
            if part.function_call:
                function_calls.append(part.function_call)

        if not function_calls:
            break

        # Execute each function call
        function_responses = []
        for fc in function_calls:
            tool_name = fc.name
            tool_args = dict(fc.args) if fc.args else {}

            await on_event({
                "type": "tool_call",
                "tool": tool_name,
                "project": tool_args.get("project_id", ""),
                "status": "running",
            })

            tool_fn = TOOL_FUNCTIONS.get(tool_name)
            if tool_fn:
                try:
                    result = tool_fn(**tool_args)
                except Exception as e:
                    result = f"Error: {str(e)}"
            else:
                result = f"Unknown tool: {tool_name}"

            pid = tool_args.get("project_id", "")
            if pid not in collected_data:
                collected_data[pid] = {}
            collected_data[pid][tool_name] = result

            await on_event({
                "type": "tool_result",
                "tool": tool_name,
                "project": pid,
                "result": result[:200],
                "status": "done",
            })

            function_responses.append(
                types.Part.from_function_response(
                    name=tool_name,
                    response={"result": result},
                )
            )

            iterations += 1

        # Send function results back to Gemini
        response = chat.send_message(function_responses)

    # --- Deterministic scoring phase (single pass, cached) ---
    evaluations = {}
    for pid, data in collected_data.items():
        emails = MOCK_EMAILS.get(pid, [])
        scored_emails = score_emails([dict(e) for e in emails])

        for e in scored_emails:
            await on_event({
                "type": "urgency",
                "project": pid,
                "email_subject": e["subject"],
                "score": e["urgency_score"],
            })

        project = next((p for p in projects if p["id"] == pid), {})
        events = MOCK_EVENTS.get(pid, [])
        search_score = score_urgency(data.get("search_web", ""))

        evaluation = evaluate_project(project, scored_emails, events, search_score)
        evaluations[pid] = {"evaluation": evaluation, "project": project}

        await on_event({
            "type": "initiative",
            "project": pid,
            "status": evaluation["status"],
            "alerts": evaluation["alerts"],
        })

    # --- Final brief with initiative context (reuse cached evaluations) ---
    initiative_summary = ""
    for pid, cached in evaluations.items():
        evaluation = cached["evaluation"]
        project = cached["project"]
        initiative_summary += (
            f"\n[{project.get('name', pid)}] Status: {evaluation['status']}\n"
            f"Alertes: {'; '.join(evaluation['alerts']) if evaluation['alerts'] else 'aucune'}\n"
        )

    brief_prompt = (
        f"Voici les evaluations d'urgence de tes 3 projets :\n{initiative_summary}\n\n"
        "Genere maintenant ton brief proactif final. Commence par le plus urgent. "
        "5 bullets max par projet. Sois brutalement concis. Parle en francais."
    )

    brief_response = chat.send_message(brief_prompt)
    brief_text = brief_response.text

    await on_event({
        "type": "brief",
        "text": brief_text,
    })

    return brief_text
