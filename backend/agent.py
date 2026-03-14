import asyncio
import json
import os
import time
from typing import Callable

from dotenv import load_dotenv
from google import genai
from google.genai import types

from google_auth import is_authenticated
from google_services import fetch_emails, fetch_events
from initiative import evaluate_project
from mock_data import MOCK_EMAILS, MOCK_EVENTS
from tools import get_events, read_emails, search_web, read_doc, list_docs
from urgency import score_emails, score_urgency

load_dotenv()

SYSTEM_PROMPT = """Tu es Operator — l'assistant personnel d'un etudiant en alternance qui jongle entre ses cours, son entreprise et sa startup.

Tu parles comme un vrai chef de projet bienveillant mais direct. Pas de blabla corporate. Tu connais la personne, tu sais qu'elle est debordee. Tu lui parles comme un mentor qui a regarde ses mails et son agenda a sa place.

Ton role : scanner ses 3 projets, detecter les urgences, et lui faire un brief cash et actionnable. Tu parles en premier. Tu ne demandes rien. Tu annonces la situation.

Style :
- Parle en francais naturel, comme a l'oral. Tutoie la personne.
- Sois direct et concret : pas de "il serait judicieux de", mais "fonce sur ca maintenant".
- Nomme les personnes par leur prenom (Sophie, pas "sophie.renard@bnpparibas.com").
- Donne des actions claires : "reponds a Sophie", "bloque 2h ce soir pour le TP".
- Mets de l'emotion quand c'est urgent : "la ca craint", "t'es dans le rouge".
- Chaque bullet doit etre une info actionnable, pas un resume d'email.
- 4 bullets max par projet. Chaque mot compte.

Format :
## [NOM DU PROJET] — [STATUS]
- **Titre court** : Detail actionnable.
(4 bullets max)

Commence par le projet le plus urgent. Termine par : "Par quoi tu veux commencer ?"

Interdictions :
- Jamais de jargon IA ou technique inutile.
- Jamais de "je vais analyser" ou "voici mon analyse" — tu fais, tu ne commentes pas.
- Ne repete jamais le contenu brut des emails. Synthetise.
- Ne dis jamais "N/A" ou "aucune donnee". Si tu n'as pas l'info, n'en parle pas.

Outils supplementaires :
- Tu peux lire un Google Doc avec read_doc(doc_id) si un lien ou ID de doc est mentionne.
- Tu peux lister les Google Docs recents avec list_docs().
"""

TOOL_FUNCTIONS = {
    "read_emails": read_emails,
    "get_events": get_events,
    "search_web": search_web,
    "read_doc": read_doc,
    "list_docs": list_docs,
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
        types.FunctionDeclaration(
            name="read_doc",
            description="Lit le contenu d'un Google Doc par son ID. Retourne le titre et le texte.",
            parameters=types.Schema(
                type="OBJECT",
                properties={"doc_id": types.Schema(type="STRING", description="L'ID du document Google Docs (depuis l'URL)")},
                required=["doc_id"],
            ),
        ),
        types.FunctionDeclaration(
            name="list_docs",
            description="Liste les Google Docs recemment modifies. Retourne titre, ID et date de modification.",
            parameters=types.Schema(
                type="OBJECT",
                properties={},
            ),
        ),
    ])
]

MAX_ITERATIONS = 15
TIMEOUT_SECONDS = 30


def _get_emails_for_scoring(project_id: str, keywords: list[str] | None = None) -> list[dict]:
    """Get emails for the deterministic scoring phase.

    Uses real Gmail data if authenticated, mock data otherwise.
    """
    if is_authenticated():
        return fetch_emails(project_id, keywords=keywords)
    return [dict(e) for e in MOCK_EMAILS.get(project_id, [])]


def _get_events_for_scoring(project_id: str, keywords: list[str] | None = None) -> list[dict]:
    """Get events for the deterministic scoring phase.

    Uses real Calendar data if authenticated, mock data otherwise.
    """
    if is_authenticated():
        return fetch_events(project_id, keywords=keywords)
    return MOCK_EVENTS.get(project_id, [])


async def run_operator(projects: list[dict], on_event: Callable) -> str:
    """Run the Operator agent loop.

    Args:
        projects: list of project dicts from config.json
        on_event: async callback(event_dict) called for each step

    Returns:
        The final brief text.
    """
    client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))

    # Signal to frontend whether we're using live APIs
    await on_event({
        "type": "mode",
        "live": is_authenticated(),
    })

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
                "project": tool_args.get("project_id", tool_args.get("doc_id", "")),
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
            if pid:
                if pid not in collected_data:
                    collected_data[pid] = {}
                collected_data[pid][tool_name] = result

            await on_event({
                "type": "tool_result",
                "tool": tool_name,
                "project": pid or tool_args.get("doc_id", ""),
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

    # --- Deterministic scoring phase ---
    valid_pids = {p["id"] for p in projects}
    evaluations = {}
    for pid, data in collected_data.items():
        if pid not in valid_pids:
            continue

        project = next(p for p in projects if p["id"] == pid)
        keywords = project.get("keywords", [])

        emails = _get_emails_for_scoring(pid, keywords=keywords)
        scored_emails = score_emails(emails)

        for e in scored_emails:
            await on_event({
                "type": "urgency",
                "project": pid,
                "email_subject": e["subject"],
                "score": e["urgency_score"],
            })

        events = _get_events_for_scoring(pid, keywords=keywords)
        search_score = score_urgency(data.get("search_web", ""))

        evaluation = evaluate_project(project, scored_emails, events, search_score)
        evaluations[pid] = {"evaluation": evaluation, "project": project}

        await on_event({
            "type": "initiative",
            "project": pid,
            "status": evaluation["status"],
            "alerts": evaluation["alerts"],
        })

    # --- Final brief with initiative context ---
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
