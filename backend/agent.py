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

SYSTEM_PROMPT = """Tu es Oppy — l'assistant personnel d'un etudiant en alternance qui jongle entre ses cours, son entreprise et sa startup.

Tu parles comme un vrai chef de projet bienveillant mais direct. Pas de blabla corporate. Tu connais la personne, tu sais qu'elle est debordee. Tu lui parles comme un mentor qui a regarde ses mails et son agenda a sa place.

Ton role : scanner ses 3 projets, detecter les urgences, et lui faire un brief cash et actionnable. Tu parles en premier. Tu ne demandes rien. Tu annonces la situation.

Style :
- Parle en francais naturel, comme a l'oral. Tutoie la personne.
- Sois direct et concret : pas de "il serait judicieux de", mais "fonce sur ca maintenant".
- Nomme les personnes par leur prenom (Sophie, pas "sophie.renard@bnpparibas.com").
- Donne des actions claires : "reponds a Sophie", "bloque 2h ce soir pour le TP".
- Mets de l'emotion quand c'est urgent : "la ca craint", "t'es dans le rouge".

Format OBLIGATOIRE :
- Ecris en paragraphes fluides, comme si tu parlais a quelqu'un. PAS de listes a puces, PAS de tirets, PAS de bullet points.
- Utilise des phrases completes et enchaine les idees naturellement.
- Separe chaque projet par son nom en gras sur une ligne, puis un paragraphe de 3-5 phrases qui resume la situation et dit quoi faire.
- Le ton doit etre celui d'un pote qui te brief en 2 minutes au telephone.

Exemple de format attendu :

**Alternance BNP — URGENT**

La ca craint. Sophie t'a ecrit il y a 6 jours et tu n'as toujours pas repondu, elle va finir par escalader. En plus les KPIs sont casses en prod et le filtre date deconne, le PO attend que ce soit fixe avant lundi matin sinon la sprint review de mardi sera un desastre. Reponds-lui ce soir, meme un message court pour dire que tu es dessus, et bloque ton samedi pour debugger le dashboard.

Commence par le projet le plus urgent. Termine par : "Par quoi tu veux commencer ?"

Interdictions :
- JAMAIS de tirets, puces, bullet points, listes numerotees. Uniquement des phrases et paragraphes.
- Jamais de jargon IA ou technique inutile.
- Jamais de "je vais analyser" ou "voici mon analyse" — tu fais, tu ne commentes pas.
- Ne repete jamais le contenu brut des emails. Synthetise.
- Ne dis jamais "N/A" ou "aucune donnee". Si tu n'as pas l'info, n'en parle pas.
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


def build_operator_context(projects: list[dict]) -> str:
    """Build a summary of projects for Gemini context."""
    return json.dumps(
        [{"id": p["id"], "name": p["name"], "contact": p["contact"], "deadline": p["deadline"]}
         for p in projects],
        ensure_ascii=False,
    )


def build_data_context(projects: list[dict]) -> str:
    """Build a full data dump of emails, events and search results for chat context."""
    lines = []
    for p in projects:
        pid = p["id"]
        lines.append(f"\n=== {p['name']} (id: {pid}) ===")
        emails = MOCK_EMAILS.get(pid, [])
        if emails:
            lines.append("Emails:")
            for e in emails:
                silence = f"{e['days_since_reply']}j sans reponse" if e["days_since_reply"] is not None else "newsletter"
                lines.append(f"  - De: {e['from']} | Sujet: {e['subject']} | {silence}")
                lines.append(f"    {e['body']}")
        events = MOCK_EVENTS.get(pid, [])
        if events:
            lines.append("Calendrier:")
            for ev in events:
                prep = "oui" if ev["prep_block"] else "non"
                lines.append(f"  - {ev['title']} a {ev['time']} (bloc prep: {prep})")
    return "\n".join(lines)


def create_chat_session(projects: list[dict]):
    """Create a persistent Gemini chat session with full project context.

    Returns (client, chat) — caller must keep client alive.
    """
    client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))

    data_context = build_data_context(projects)
    project_summary = build_operator_context(projects)

    chat_system = (
        "You are Oppy, a personal voice assistant for a work-study student.\n"
        "You are in CONVERSATION mode. The user talks to you and asks questions.\n\n"
        "LANGUAGE RULE: Detect the language the user speaks and ALWAYS reply in the SAME language. "
        "If the user speaks French, reply in French. If the user speaks English, reply in English. "
        "Match their language exactly.\n\n"
        "ABSOLUTE RULE: Read the user's question and answer ONLY that question. "
        "Never give a full briefing unless explicitly asked. "
        "If they ask about their schedule, give JUST today's events. "
        "If they ask about a specific email, summarize JUST that email. "
        "If they ask about a project, talk JUST about that project.\n\n"
        "Style:\n"
        "- Be direct and natural, like a friend. Use 'tu' in French, casual tone in English.\n"
        "- 2-5 sentences max. Short and punchy.\n"
        "- Use first names (Sophie, not sophie.renard@bnpparibas.com).\n"
        "- End with a concrete action or follow-up question.\n"
        "- NEVER repeat a previous answer.\n"
        "- No bullet points. Only sentences and paragraphs.\n\n"
        f"Active projects:\n{project_summary}\n\n"
        f"Full data:\n{data_context}"
    )

    chat = client.chats.create(
        model="gemini-3-flash-preview",
        config=types.GenerateContentConfig(
            system_instruction=chat_system,
        ),
    )
    return client, chat


async def chat_with_operator(message: str, chat_session, on_event: Callable) -> str:
    """Answer a user question using a persistent chat session.

    Args:
        message: User's question/request.
        chat_session: Persistent Gemini chat session.
        on_event: Async callback for streaming events.

    Returns:
        The assistant's text response.
    """
    response = chat_session.send_message(message)
    reply = response.text

    await on_event({
        "type": "chat_reply",
        "text": reply,
    })

    return reply


async def run_operator(projects: list[dict], on_event: Callable) -> str:
    """Run the Oppy agent loop.

    Args:
        projects: list of project dicts from config.json
        on_event: async callback(event_dict) called for each step

    Returns:
        The final brief text.
    """
    client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))

    project_summary = build_operator_context(projects)

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
    # Only process known project IDs (skip unknown ones Gemini may have invented)
    valid_pids = {p["id"] for p in projects}
    evaluations = {}
    for pid, data in collected_data.items():
        if pid not in valid_pids:
            continue

        emails = MOCK_EMAILS.get(pid, [])
        scored_emails = score_emails([dict(e) for e in emails])

        for e in scored_emails:
            await on_event({
                "type": "urgency",
                "project": pid,
                "email_subject": e["subject"],
                "score": e["urgency_score"],
            })

        project = next(p for p in projects if p["id"] == pid)
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
