# Operator Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an autonomous AI agent that monitors 3 projects for a work-study student and delivers proactive briefs — unprompted.

**Architecture:** FastAPI backend with Gemini 3 Flash function calling loop, HuggingFace urgency scoring, deterministic initiative engine, SSE streaming to a React frontend with dark terminal aesthetic and TTS voice output.

**Tech Stack:** Python (FastAPI, google-genai, sentence-transformers), React (Vite on Replit), SSE, Web Speech API

**Spec:** `docs/superpowers/specs/2026-03-14-operator-design.md`

---

## File Structure

```
backend/
├── config.json          # 3 projects (school, company, startup)
├── mock_data.py         # hardcoded emails, events, search results
├── tools.py             # 3 Gemini-callable functions
├── urgency.py           # HuggingFace cross-encoder scorer
├── initiative.py        # 4 deterministic alert rules
├── agent.py             # Gemini function calling loop + on_event callback
├── main.py              # FastAPI + SSE endpoint
├── requirements.txt     # Python deps
├── .env                 # API keys (not committed)
└── test_smoke.py        # Smoke tests for critical paths

frontend/  (React on Replit)
├── src/
│   ├── App.jsx
│   ├── components/
│   │   ├── Header.jsx
│   │   ├── ProjectCard.jsx
│   │   ├── ToolFeed.jsx
│   │   └── BriefPanel.jsx
│   ├── hooks/
│   │   └── useOperatorSSE.js
│   └── index.css
├── index.html
└── package.json
```

---

## Chunk 1: Phase 1 — Fondations

### Task 1: Init backend project

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/.env`
- Create: `backend/config.json`

- [ ] **Step 1: Create `backend/requirements.txt`**

```
google-genai>=1.0.0
sentence-transformers>=3.0.0
fastapi>=0.115.0
uvicorn>=0.30.0
sse-starlette>=2.0.0
python-dotenv>=1.0.0
```

- [ ] **Step 2: Create `backend/.env`**

```
GOOGLE_API_KEY=your_key_here
```

- [ ] **Step 3: Create `backend/config.json`**

```json
{
  "mode": "demo",
  "projects": [
    {
      "id": "school",
      "name": "Master IA \u2014 Sorbonne",
      "contact": "prof.martinez@sorbonne.fr",
      "deadline": "2026-03-18T23:59:00",
      "color": "#00FF88",
      "keywords": ["cours", "rendu", "memoire", "soutenance", "TP"]
    },
    {
      "id": "company",
      "name": "Alternance \u2014 BNP Paribas",
      "contact": "sophie.renard@bnpparibas.com",
      "deadline": "2026-03-17T09:00:00",
      "color": "#FF4444",
      "keywords": ["sprint", "daily", "jira", "livrable", "prod"]
    },
    {
      "id": "startup",
      "name": "Side Project \u2014 NoctaAI",
      "contact": "yassine@noctaai.com",
      "deadline": "2026-04-05T00:00:00",
      "color": "#FF8800",
      "keywords": ["NoctaAI", "MVP", "landing", "beta", "funding"]
    }
  ]
}
```

- [ ] **Step 4: Install dependencies**

Run: `cd backend && pip install -r requirements.txt`
Expected: All packages install. `torch` CPU-only pulled by sentence-transformers (~2min).

- [ ] **Step 5: Commit**

```bash
git init
echo ".env" > .gitignore
echo "__pycache__/" >> .gitignore
echo "*.pyc" >> .gitignore
git add backend/requirements.txt backend/config.json .gitignore
git commit -m "init: backend project with deps and config"
```

---

### Task 2: Mock data

**Files:**
- Create: `backend/mock_data.py`

- [ ] **Step 1: Create `backend/mock_data.py`**

```python
MOCK_EMAILS = {
    "school": [
        {
            "from": "prof.martinez@sorbonne.fr",
            "subject": "Rendu TP Deep Learning",
            "body": "Le rendu du TP sur les transformers est pour mercredi 18 mars 23h59. Format notebook + rapport PDF. Pas d'extension possible.",
            "date": "2026-03-12",
            "days_since_reply": 0,
        },
        {
            "from": "admin-master@sorbonne.fr",
            "subject": "Soutenance memoire - date fixee",
            "body": "Votre soutenance est fixee au 15 avril. Merci de confirmer votre sujet avant le 25 mars.",
            "date": "2026-03-13",
            "days_since_reply": 1,
        },
    ],
    "company": [
        {
            "from": "sophie.renard@bnpparibas.com",
            "subject": "Re: Dashboard analytics - feedback",
            "body": "Le product owner attend les corrections sur le dashboard avant lundi matin. Les KPIs ne remontent pas correctement en prod. C'est bloquant pour la review sprint.",
            "date": "2026-03-08",
            "days_since_reply": 6,
        },
        {
            "from": "tech-lead@bnpparibas.com",
            "subject": "Daily standup notes",
            "body": "Action item pour toi : fixer le bug sur le filtre date du dashboard. Sprint review mardi.",
            "date": "2026-03-13",
            "days_since_reply": 1,
        },
    ],
    "startup": [
        {
            "from": "yassine@noctaai.com",
            "subject": "Re: Landing page v2",
            "body": "La landing est live mais le taux de conversion est a 0.8%. On doit refaire le hero. Tu peux t'en occuper ce weekend ?",
            "date": "2026-03-11",
            "days_since_reply": 3,
        },
        {
            "from": "newsletter@techcrunch.com",
            "subject": "Y Combinator ouvre les candidatures W26",
            "body": "YC Winter 2026 applications are now open. Deadline: April 10. Focus on AI-native startups.",
            "date": "2026-03-14",
            "days_since_reply": None,
        },
    ],
}

MOCK_EVENTS = {
    "school": [
        {"title": "TP Deep Learning - rendu", "time": "2026-03-18T23:59", "prep_block": False},
        {"title": "Cours NLP avance", "time": "2026-03-15T09:00", "prep_block": True},
    ],
    "company": [
        {"title": "Sprint Review", "time": "2026-03-17T10:00", "prep_block": False},
        {"title": "Daily Standup", "time": "2026-03-14T09:30", "prep_block": True},
    ],
    "startup": [],
}

MOCK_SEARCH = {
    "school": "Sorbonne Universite - les inscriptions au Master IA 2026 battent des records, +40% de candidatures.",
    "company": "BNP Paribas lance un nouveau programme d'acceleration data & IA pour ses alternants.",
    "startup": "Y Combinator ouvre les candidatures Winter 2026. Deadline 10 avril. Focus AI-native startups.",
}
```

- [ ] **Step 2: Verify import works**

Run: `cd backend && python -c "from mock_data import MOCK_EMAILS; print(len(MOCK_EMAILS['company']))"`
Expected: `2`

- [ ] **Step 3: Commit**

```bash
git add backend/mock_data.py
git commit -m "feat: add mock data for 3 demo projects"
```

---

### Task 3: Smoke test Gemini API

**Files:**
- Create: `backend/test_smoke.py`

- [ ] **Step 1: Create smoke test file**

```python
import os
from dotenv import load_dotenv

load_dotenv()


def test_gemini_connection():
    from google import genai

    api_key = os.getenv("GOOGLE_API_KEY")
    assert api_key and api_key != "your_key_here", "GOOGLE_API_KEY not set in .env"

    client = genai.Client(api_key=api_key)

    # Verify available models — use gemini-2.0-flash (Gemini 3 Flash may have a different ID)
    # If the hackathon provides a different model name, update MODEL_NAME here
    MODEL_NAME = "gemini-2.0-flash"

    response = client.models.generate_content(
        model=MODEL_NAME,
        contents="Reply with exactly: OK",
    )
    assert "OK" in response.text
    print(f"Gemini OK (model={MODEL_NAME}): {response.text.strip()}")


def test_gemini_function_calling_api():
    """Verify the SDK supports the function calling API we need."""
    from google.genai import types

    # Verify Part.from_function_response exists
    assert hasattr(types.Part, "from_function_response"), (
        "types.Part.from_function_response not found — SDK version may be incompatible. "
        "Try: pip install --upgrade google-genai"
    )
    print("Gemini SDK function calling API: OK")


def test_huggingface_model():
    import torch
    from sentence_transformers import CrossEncoder

    model = CrossEncoder(
        "cross-encoder/ms-marco-MiniLM-L6-v2",
        default_activation_function=torch.nn.Sigmoid(),
    )
    pairs = [("urgent action required deadline missed", "Le product owner attend les corrections avant lundi. C'est bloquant.")]
    scores = model.predict(pairs)
    score = float(scores[0])
    assert 0.0 <= score <= 1.0
    print(f"HuggingFace OK: score={score:.3f}")


if __name__ == "__main__":
    test_gemini_connection()
    test_gemini_function_calling_api()
    test_huggingface_model()
    print("All smoke tests passed.")
```

- [ ] **Step 2: Run smoke tests**

Run: `cd backend && python test_smoke.py`
Expected: Both tests pass, prints scores. First HuggingFace run downloads model (~80MB).

- [ ] **Step 3: Commit**

```bash
git add backend/test_smoke.py
git commit -m "test: smoke tests for Gemini and HuggingFace"
```

---

## Chunk 2: Phase 2 — Backend

### Task 4: Tools (Gemini-callable functions)

**Files:**
- Create: `backend/tools.py`

- [ ] **Step 1: Create `backend/tools.py`**

```python
import json
from mock_data import MOCK_EMAILS, MOCK_EVENTS, MOCK_SEARCH


def read_emails(project_id: str) -> str:
    """Read recent emails for a project. Returns sender, subject, body, and days since last reply."""
    emails = MOCK_EMAILS.get(project_id, [])
    if not emails:
        return f"No emails found for project {project_id}."
    lines = []
    for e in emails:
        silence = f"{e['days_since_reply']} days ago" if e["days_since_reply"] is not None else "N/A (newsletter)"
        lines.append(
            f"From: {e['from']}\n"
            f"Subject: {e['subject']}\n"
            f"Body: {e['body']}\n"
            f"Last reply: {silence}\n"
        )
    return "\n---\n".join(lines)


def get_events(project_id: str) -> str:
    """Get upcoming calendar events for a project. Shows title, time, and whether a prep block exists."""
    events = MOCK_EVENTS.get(project_id, [])
    if not events:
        return f"No upcoming events for project {project_id}."
    lines = []
    for ev in events:
        prep = "YES" if ev["prep_block"] else "NO"
        lines.append(f"{ev['title']} at {ev['time']} (prep block: {prep})")
    return "\n".join(lines)


def search_web(project_id: str) -> str:
    """Search for recent external signals relevant to a project (news, funding, announcements)."""
    result = MOCK_SEARCH.get(project_id, "No relevant external signals found.")
    return result
```

- [ ] **Step 2: Test tools manually**

Run: `cd backend && python -c "from tools import read_emails; print(read_emails('company'))"`
Expected: Prints BNP Paribas emails formatted.

- [ ] **Step 3: Commit**

```bash
git add backend/tools.py
git commit -m "feat: 3 Gemini-callable tool functions with mock data"
```

---

### Task 5: Urgency scorer

**Files:**
- Create: `backend/urgency.py`

- [ ] **Step 1: Create `backend/urgency.py`**

```python
import torch
from sentence_transformers import CrossEncoder

_URGENCY_QUERY = "urgent action required deadline missed no reply blocked critical"

_model = None


def _get_model():
    global _model
    if _model is None:
        _model = CrossEncoder(
            "cross-encoder/ms-marco-MiniLM-L6-v2",
            default_activation_function=torch.nn.Sigmoid(),
        )
    return _model


def load_model():
    """Call at startup to pre-load the model."""
    _get_model()


def score_urgency(email_text: str) -> float:
    """Score how urgent an email is (0-1). Higher = more urgent."""
    model = _get_model()
    pairs = [(_URGENCY_QUERY, email_text)]
    scores = model.predict(pairs)
    return round(float(scores[0]), 3)


def score_emails(emails: list[dict]) -> list[dict]:
    """Score a list of email dicts. Adds 'urgency_score' key to each."""
    for email in emails:
        email["urgency_score"] = score_urgency(email["body"])
    return emails
```

- [ ] **Step 2: Test urgency scoring**

Run: `cd backend && python -c "from urgency import score_urgency; print(score_urgency('Le product owner attend les corrections. C est bloquant pour la sprint review.'))" `
Expected: A float between 0 and 1 (likely > 0.5 for this urgent text).

- [ ] **Step 3: Commit**

```bash
git add backend/urgency.py
git commit -m "feat: HuggingFace urgency scorer with sigmoid activation"
```

---

### Task 6: Initiative engine

**Files:**
- Create: `backend/initiative.py`

- [ ] **Step 1: Create `backend/initiative.py`**

```python
from datetime import datetime, timezone


def evaluate_project(project: dict, emails: list[dict], events: list[dict], search_score: float) -> dict:
    """Evaluate a project's status based on deterministic rules.

    Returns:
        {"status": "READY"|"URGENT"|"SIGNAL", "alerts": [str]}
    """
    alerts = []
    status = "READY"

    # Rule 1: Silence detected
    reply_days = [
        e["days_since_reply"]
        for e in emails
        if e.get("days_since_reply") is not None
    ]
    if reply_days:
        max_silence = max(reply_days)
        if max_silence >= 5:
            contact = emails[0]["from"]
            alerts.append(f"Silence depuis {max_silence} jours de {contact}")
            status = "URGENT"

    # Rule 2: Deadline < 48h without prep block
    deadline = datetime.fromisoformat(project["deadline"])
    now = datetime.now()
    hours_to_deadline = (deadline - now).total_seconds() / 3600
    has_prep = any(e.get("prep_block", False) for e in events)
    if hours_to_deadline < 48 and not has_prep:
        alerts.append(f"Deadline dans {int(hours_to_deadline)}h - aucun bloc de prep")
        status = "URGENT"

    # Rule 3: External signal relevant
    if search_score > 0.6:
        alerts.append("Signal externe pertinent detecte")
        if status != "URGENT":
            status = "SIGNAL"

    # Rule 4: High urgency email
    urgency_scores = [e.get("urgency_score", 0) for e in emails]
    if any(s > 0.8 for s in urgency_scores):
        alerts.append("Email a haute urgence detecte")
        status = "URGENT"

    return {"status": status, "alerts": alerts}
```

- [ ] **Step 2: Test initiative engine**

Run: `cd backend && python -c "
from initiative import evaluate_project
result = evaluate_project(
    {'deadline': '2026-03-17T09:00:00'},
    [{'from': 'sophie@bnp.com', 'days_since_reply': 6, 'urgency_score': 0.85, 'body': 'test'}],
    [{'prep_block': False}],
    0.3
)
print(result)
"`
Expected: `{'status': 'URGENT', 'alerts': ['Silence depuis 6 jours de sophie@bnp.com', ...]}`

- [ ] **Step 3: Commit**

```bash
git add backend/initiative.py
git commit -m "feat: deterministic initiative engine with 4 alert rules"
```

---

### Task 7: Agent loop (Gemini function calling)

**Files:**
- Create: `backend/agent.py`

- [ ] **Step 1: Create `backend/agent.py`**

```python
import asyncio
import json
import os
import time
from typing import AsyncGenerator, Callable

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
        on_event: callback(event_dict) called for each step

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
        model="gemini-2.0-flash",
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
    collected_data = {}  # project_id -> {emails, events, search}

    while iterations < MAX_ITERATIONS and (time.time() - start_time) < TIMEOUT_SECONDS:
        # Check if there are function calls
        function_calls = []
        for part in response.candidates[0].content.parts:
            if part.function_call:
                function_calls.append(part.function_call)

        if not function_calls:
            break  # No more tool calls, Gemini is done

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

            # Execute the tool
            tool_fn = TOOL_FUNCTIONS.get(tool_name)
            if tool_fn:
                try:
                    result = tool_fn(**tool_args)
                except Exception as e:
                    result = f"Error: {str(e)}"
            else:
                result = f"Unknown tool: {tool_name}"

            # Track collected data
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
```

- [ ] **Step 2: Test agent loop standalone**

Run: `cd backend && python -c "
import asyncio
from agent import run_operator
import json

with open('config.json') as f:
    config = json.load(f)

async def print_event(e):
    print(f'  [{e[\"type\"]}] {e.get(\"tool\", e.get(\"project\", \"\"))} {e.get(\"status\", \"\")}')

async def main():
    brief = await run_operator(config['projects'], print_event)
    print('---BRIEF---')
    print(brief)

asyncio.run(main())
"`
Expected: Tool calls printed step by step, then a French brief covering 3 projects. BNP Paribas should be first (most urgent).

- [ ] **Step 3: Commit**

```bash
git add backend/agent.py
git commit -m "feat: Gemini function calling agent loop with initiative engine"
```

---

### Task 8: FastAPI + SSE endpoint

**Files:**
- Create: `backend/main.py`

- [ ] **Step 1: Create `backend/main.py`**

```python
import asyncio
import json
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse

from agent import run_operator
from urgency import load_model

load_dotenv()

# Fail fast if API key is missing
api_key = os.getenv("GOOGLE_API_KEY")
if not api_key or api_key == "your_key_here":
    raise RuntimeError("GOOGLE_API_KEY not set. Check backend/.env")


@asynccontextmanager
async def lifespan(app):
    load_model()
    print("HuggingFace model loaded.")
    yield


app = FastAPI(title="Operator", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def load_config():
    with open("config.json") as f:
        return json.load(f)


@app.get("/api/run")
async def run():
    config = load_config()
    queue = asyncio.Queue()

    async def on_event(event: dict):
        await queue.put(event)

    async def generator():
        task = asyncio.create_task(run_operator(config["projects"], on_event))

        while True:
            try:
                event = await asyncio.wait_for(queue.get(), timeout=1.0)
                yield {"event": event["type"], "data": json.dumps(event, ensure_ascii=False)}
                if event["type"] == "brief":
                    break
            except asyncio.TimeoutError:
                if task.done():
                    break
                continue

        await task

    return EventSourceResponse(generator())


@app.get("/api/health")
async def health():
    return {"status": "ok"}
```

- [ ] **Step 2: Run the server**

Run: `cd backend && uvicorn main:app --host 0.0.0.0 --port 8000 --reload`
Expected: Server starts, prints "HuggingFace model loaded."

- [ ] **Step 3: Test SSE endpoint**

Run (in another terminal): `curl -N http://localhost:8000/api/run`
Expected: Stream of SSE events (tool_call, tool_result, urgency, initiative, brief).

- [ ] **Step 4: Commit**

```bash
git add backend/main.py
git commit -m "feat: FastAPI server with SSE streaming endpoint"
```

---

## Chunk 3: Phase 2 — Frontend (parallel with Chunk 2)

### Task 9: React project setup on Replit

- [ ] **Step 1: Create React project on Replit**

Use the "React (Vite)" template on Replit. This gives you `react`, `react-dom`, `vite` pre-configured.

- [ ] **Step 2: Set up `index.css` — dark theme base**

Replace `src/index.css` with:

```css
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap');

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  background: #0a0a0a;
  color: #e0e0e0;
  font-family: 'JetBrains Mono', monospace;
  min-height: 100vh;
}

:root {
  --green: #00FF88;
  --red: #FF4444;
  --orange: #FF8800;
  --bg: #0a0a0a;
  --card-bg: #111111;
  --border: #222222;
  --text-dim: #666666;
}
```

- [ ] **Step 3: Commit**

---

### Task 10: Header component

**Files:**
- Create: `src/components/Header.jsx`

- [ ] **Step 1: Create `src/components/Header.jsx`**

```jsx
import { useState } from 'react';

export default function Header({ onScan, isScanning }) {
  return (
    <header style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '24px 32px',
      borderBottom: '1px solid var(--border)',
    }}>
      <div>
        <h1 style={{
          fontSize: '28px',
          fontWeight: 700,
          color: 'var(--green)',
          letterSpacing: '4px',
        }}>
          &#9632; OPERATOR
        </h1>
        <p style={{
          fontSize: '12px',
          color: 'var(--text-dim)',
          marginTop: '4px',
          fontStyle: 'italic',
        }}>
          The AI Agent That Works While You Talk.
        </p>
      </div>
      <button
        onClick={onScan}
        disabled={isScanning}
        style={{
          background: isScanning ? 'var(--border)' : 'var(--green)',
          color: '#0a0a0a',
          border: 'none',
          padding: '12px 24px',
          fontFamily: 'inherit',
          fontSize: '14px',
          fontWeight: 700,
          cursor: isScanning ? 'not-allowed' : 'pointer',
          letterSpacing: '2px',
        }}
      >
        {isScanning ? 'SCANNING...' : 'LANCER LE SCAN'}
      </button>
    </header>
  );
}
```

- [ ] **Step 2: Commit**

---

### Task 11: ProjectCard component

**Files:**
- Create: `src/components/ProjectCard.jsx`

- [ ] **Step 1: Create `src/components/ProjectCard.jsx`**

```jsx
const STATUS_CONFIG = {
  STANDBY: { label: 'STANDBY', bg: '#222', color: '#666' },
  READY: { label: 'READY', bg: '#00FF8833', color: '#00FF88' },
  URGENT: { label: 'URGENT', bg: '#FF444433', color: '#FF4444' },
  SIGNAL: { label: 'SIGNAL', bg: '#FF880033', color: '#FF8800' },
};

export default function ProjectCard({ project, status, alerts }) {
  const st = STATUS_CONFIG[status] || STATUS_CONFIG.STANDBY;

  return (
    <div style={{
      background: 'var(--card-bg)',
      borderLeft: `4px solid ${project.color}`,
      padding: '20px',
      flex: 1,
      minWidth: '250px',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
      }}>
        <span style={{ fontSize: '11px', color: 'var(--text-dim)', letterSpacing: '2px' }}>
          PROJECT
        </span>
        <span style={{
          fontSize: '11px',
          fontWeight: 700,
          padding: '4px 10px',
          background: st.bg,
          color: st.color,
          letterSpacing: '1px',
          animation: status === 'URGENT' ? 'pulse 1.5s infinite' : 'none',
        }}>
          {st.label}
        </span>
      </div>

      <h3 style={{ fontSize: '16px', color: '#fff', marginBottom: '8px' }}>
        {project.name}
      </h3>

      {project.contact && (
        <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '12px' }}>
          {project.contact}
        </p>
      )}

      {alerts && alerts.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {alerts.map((alert, i) => (
            <li key={i} style={{
              fontSize: '12px',
              color: st.color,
              padding: '4px 0',
              borderTop: '1px solid var(--border)',
            }}>
              {alert}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add pulse animation to `index.css`**

Append to `src/index.css`:

```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes slideIn {
  from { transform: translateX(-20px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
```

- [ ] **Step 3: Commit**

---

### Task 12: ToolFeed component

**Files:**
- Create: `src/components/ToolFeed.jsx`

- [ ] **Step 1: Create `src/components/ToolFeed.jsx`**

```jsx
const STATUS_ICONS = {
  running: '\u25CF',  // filled circle
  done: '\u2713',     // checkmark
  waiting: '\u25CB',  // empty circle
};

const PROJECT_COLORS = {
  school: '#00FF88',
  company: '#FF4444',
  startup: '#FF8800',
};

export default function ToolFeed({ toolCalls }) {
  if (!toolCalls || toolCalls.length === 0) {
    return (
      <div style={{
        background: 'var(--card-bg)',
        padding: '20px',
        borderTop: '1px solid var(--border)',
      }}>
        <h4 style={{ fontSize: '11px', color: 'var(--text-dim)', letterSpacing: '2px', marginBottom: '8px' }}>
          TOOL FEED
        </h4>
        <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
          En attente du scan...
        </p>
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--card-bg)',
      padding: '20px',
      borderTop: '1px solid var(--border)',
      maxHeight: '200px',
      overflowY: 'auto',
    }}>
      <h4 style={{ fontSize: '11px', color: 'var(--text-dim)', letterSpacing: '2px', marginBottom: '12px' }}>
        TOOL FEED
      </h4>
      {toolCalls.map((tc, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '6px 0',
            fontSize: '13px',
            animation: 'slideIn 0.3s ease-out',
            animationDelay: `${i * 0.1}s`,
            animationFillMode: 'both',
          }}
        >
          <span style={{ color: tc.status === 'done' ? '#00FF88' : tc.status === 'running' ? '#FF8800' : '#666' }}>
            {STATUS_ICONS[tc.status] || STATUS_ICONS.waiting}
          </span>
          <span style={{ color: '#fff', minWidth: '140px' }}>{tc.tool}({tc.project})</span>
          <div style={{
            flex: 1,
            height: '4px',
            background: '#222',
            borderRadius: '2px',
            overflow: 'hidden',
          }}>
            <div style={{
              width: tc.status === 'done' ? '100%' : tc.status === 'running' ? '60%' : '0%',
              height: '100%',
              background: PROJECT_COLORS[tc.project] || 'var(--green)',
              transition: 'width 0.5s ease',
            }} />
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-dim)', minWidth: '40px', textAlign: 'right' }}>
            {tc.status === 'done' ? 'done' : tc.status === 'running' ? '...' : 'wait'}
          </span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

---

### Task 13: BriefPanel component

**Files:**
- Create: `src/components/BriefPanel.jsx`

- [ ] **Step 1: Create `src/components/BriefPanel.jsx`**

```jsx
import { useState, useEffect } from 'react';

export default function BriefPanel({ briefText }) {
  const [displayedText, setDisplayedText] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);

  // Typewriter effect
  useEffect(() => {
    if (!briefText) {
      setDisplayedText('');
      return;
    }
    setDisplayedText('');
    let i = 0;
    const interval = setInterval(() => {
      if (i < briefText.length) {
        setDisplayedText(briefText.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 15);
    return () => clearInterval(interval);
  }, [briefText]);

  const handleSpeak = () => {
    if (isPlaying) {
      speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(briefText);
    utterance.lang = 'fr-FR';
    utterance.rate = 1.1;
    utterance.pitch = 0.9;
    utterance.onend = () => setIsPlaying(false);
    speechSynthesis.speak(utterance);
    setIsPlaying(true);
  };

  if (!briefText) {
    return null;
  }

  return (
    <div style={{
      background: 'var(--card-bg)',
      padding: '24px',
      borderTop: '1px solid var(--border)',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
      }}>
        <h4 style={{ fontSize: '11px', color: 'var(--text-dim)', letterSpacing: '2px' }}>
          BRIEF
        </h4>
        <button
          onClick={handleSpeak}
          style={{
            background: 'none',
            border: '1px solid var(--green)',
            color: 'var(--green)',
            padding: '6px 16px',
            fontFamily: 'inherit',
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          {isPlaying ? '\u23F9 Stop' : '\uD83D\uDD0A Play'}
        </button>
      </div>
      <div style={{
        fontSize: '14px',
        lineHeight: '1.6',
        whiteSpace: 'pre-wrap',
        color: '#e0e0e0',
      }}>
        {displayedText}
        {displayedText.length < (briefText?.length || 0) && (
          <span style={{ animation: 'pulse 0.8s infinite', color: 'var(--green)' }}>|</span>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

---

## Chunk 4: Phase 3 — Integration

### Task 14: SSE hook

**Files:**
- Create: `src/hooks/useOperatorSSE.js`

- [ ] **Step 1: Create `src/hooks/useOperatorSSE.js`**

```jsx
import { useState, useCallback } from 'react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export default function useOperatorSSE() {
  const [toolCalls, setToolCalls] = useState([]);
  const [projectStatuses, setProjectStatuses] = useState({});
  const [briefText, setBriefText] = useState(null);
  const [isScanning, setIsScanning] = useState(false);

  const startScan = useCallback(() => {
    setToolCalls([]);
    setProjectStatuses({});
    setBriefText(null);
    setIsScanning(true);

    const source = new EventSource(`${BACKEND_URL}/api/run`);

    source.addEventListener('tool_call', (e) => {
      const data = JSON.parse(e.data);
      setToolCalls(prev => [...prev, { tool: data.tool, project: data.project, status: 'running' }]);
    });

    source.addEventListener('tool_result', (e) => {
      const data = JSON.parse(e.data);
      setToolCalls(prev =>
        prev.map(tc =>
          tc.tool === data.tool && tc.project === data.project && tc.status === 'running'
            ? { ...tc, status: 'done' }
            : tc
        )
      );
    });

    source.addEventListener('urgency', (e) => {
      const data = JSON.parse(e.data);
      // Urgency events update project info but don't set status yet
    });

    source.addEventListener('initiative', (e) => {
      const data = JSON.parse(e.data);
      setProjectStatuses(prev => ({
        ...prev,
        [data.project]: { status: data.status, alerts: data.alerts },
      }));
    });

    source.addEventListener('brief', (e) => {
      const data = JSON.parse(e.data);
      setBriefText(data.text);
      setIsScanning(false);
      source.close();
    });

    source.onerror = () => {
      setIsScanning(false);
      source.close();
    };
  }, []);

  return { toolCalls, projectStatuses, briefText, isScanning, startScan };
}
```

- [ ] **Step 2: Commit**

---

### Task 15: App.jsx — assemble everything

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Replace `src/App.jsx`**

```jsx
import Header from './components/Header';
import ProjectCard from './components/ProjectCard';
import ToolFeed from './components/ToolFeed';
import BriefPanel from './components/BriefPanel';
import useOperatorSSE from './hooks/useOperatorSSE';

const PROJECTS = [
  { id: 'school', name: 'Master IA \u2014 Sorbonne', contact: 'prof.martinez@sorbonne.fr', color: '#00FF88' },
  { id: 'company', name: 'Alternance \u2014 BNP Paribas', contact: 'sophie.renard@bnpparibas.com', color: '#FF4444' },
  { id: 'startup', name: 'Side Project \u2014 NoctaAI', contact: 'yassine@noctaai.com', color: '#FF8800' },
];

export default function App() {
  const { toolCalls, projectStatuses, briefText, isScanning, startScan } = useOperatorSSE();

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <Header onScan={startScan} isScanning={isScanning} />

      <div style={{
        display: 'flex',
        gap: '16px',
        padding: '24px 32px',
      }}>
        {PROJECTS.map(project => {
          const ps = projectStatuses[project.id];
          return (
            <ProjectCard
              key={project.id}
              project={project}
              status={ps?.status || 'STANDBY'}
              alerts={ps?.alerts || []}
            />
          );
        })}
      </div>

      <div style={{ padding: '0 32px' }}>
        <ToolFeed toolCalls={toolCalls} />
        <BriefPanel briefText={briefText} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Set env variable on Replit**

Add to Replit Secrets or `.env`: `VITE_BACKEND_URL=http://localhost:8000` (or your backend URL).

- [ ] **Step 3: Run frontend + backend together**

Backend: `cd backend && uvicorn main:app --host 0.0.0.0 --port 8000`
Frontend: Replit auto-runs on `npm run dev`

- [ ] **Step 4: Click "LANCER LE SCAN" and verify full flow**

Expected:
1. Cards start as STANDBY (grey)
2. Tool feed animates step by step
3. Cards update to READY/URGENT/SIGNAL with alerts
4. Brief appears with typewriter effect
5. Play button reads brief aloud in French

- [ ] **Step 5: Commit**

```bash
git add src/
git commit -m "feat: full integration — SSE hook + App assembly"
```

---

## Chunk 5: Phase 4 — Polish & Demo

### Task 16: Auto-run mode for demo

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Add auto-scan on load**

In `App.jsx`, add a `useEffect` to auto-trigger the scan after a 2-second delay:

```jsx
import { useEffect } from 'react';

// Inside App component, add:
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('demo') === 'true') {
    const timer = setTimeout(() => startScan(), 2000);
    return () => clearTimeout(timer);
  }
}, [startScan]);
```

Access with `?demo=true` in the URL to auto-start. Without the param, manual button works normally.

- [ ] **Step 2: Commit**

```bash
git commit -am "feat: auto-scan demo mode via ?demo=true URL param"
```

---

### Task 17: System prompt tuning

- [ ] **Step 1: Test 3 variations of the system prompt**

In `backend/agent.py`, try these variations and pick the one that produces the best 90-second brief:

**Variation A (current):** General Operator persona in French.

**Variation B:** Add explicit structure format:
```
Format de sortie obligatoire :
## [NOM DU PROJET] — [STATUS]
- bullet 1
- bullet 2
(max 5 bullets)
Termine par une question : "Quel projet veux-tu traiter en premier ?"
```

**Variation C:** Add the demo story context explicitly:
```
Context: tu monitores un etudiant en alternance. Il a 3 projets :
un master IA, une alternance en entreprise, et une startup qu'il monte.
Tu dois l'alerter sur ce qui est urgent MAINTENANT.
```

- [ ] **Step 2: Pick the best variation and update `agent.py`**

- [ ] **Step 3: Commit**

```bash
git commit -am "tune: system prompt optimized for demo"
```

---

### Task 18: Demo rehearsal checklist

- [ ] **Step 1: Run 5 full end-to-end demos**

For each run, check:
- [ ] Operator speaks first (brief appears without user prompt)
- [ ] BNP Paribas is first (most urgent)
- [ ] All 3 projects covered
- [ ] Tool feed animates correctly
- [ ] TTS voice works in French
- [ ] Total time < 90 seconds
- [ ] No errors in console

- [ ] **Step 2: Fix any issues found**

- [ ] **Step 3: Final commit**

```bash
git commit -am "polish: demo ready"
```
