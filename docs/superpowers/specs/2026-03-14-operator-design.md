# Operator — Design Spec

**Date:** 2026-03-14
**Context:** Gemini 3 Paris Hackathon — 7 hours — 2 people
**Stack:** Gemini 3 Flash + FastAPI + React (Replit) + HuggingFace

## 1. Problem

Professionals (here: a student in work-study) juggle 3+ active projects across email, calendar, and the web. No tool monitors all projects simultaneously and speaks first.

## 2. Solution

Operator is an autonomous agent that:
- Loads 3 projects from config
- Scans emails, calendar, and web per project (mocked for demo)
- Scores urgency via HuggingFace cross-encoder
- Applies deterministic initiative rules (silence, deadline, external signal)
- Delivers a proactive multi-project brief — unprompted — via text + voice

## 3. Demo Persona

An alternance student with 3 active projects:

| Project | Context | Expected Status |
|---------|---------|-----------------|
| Master IA — Sorbonne | TP deadline in 4 days, soutenance to confirm | GREEN / READY |
| Alternance — BNP Paribas | Manager silent 6 days, blocking bug, sprint review Monday, no prep block | RED / URGENT |
| Side Project — NoctaAI | YC W26 applications opened this morning | ORANGE / SIGNAL |

## 4. Architecture

```
Frontend (React / Replit)
    │
    │ SSE (Server-Sent Events)
    │
Backend (FastAPI / local or Replit)
    ├── config.json          → 3 projects
    ├── mock_data.py         → simulated emails, events, search
    ├── tools.py             → 3 functions declared to Gemini
    ├── agent.py             → Gemini function calling loop
    ├── urgency.py           → HuggingFace cross-encoder
    ├── initiative.py        → deterministic alert rules
    ├── tts.py               → TTS fallback (Google Cloud)
    └── main.py              → FastAPI endpoints
```

### Data flow

1. Frontend calls `POST /api/run`
2. Backend loads `config.json` → 3 projects
3. For each project, Gemini calls tools via function calling
4. Each tool call is streamed to frontend via SSE (animated feed)
5. HuggingFace scores email urgency
6. Initiative engine evaluates: silence, deadline, external signal
7. All results + alerts injected into Gemini context
8. Gemini generates the proactive brief
9. Brief streamed to frontend + read aloud via TTS

## 5. Data Model

### config.json

```json
{
  "mode": "demo",
  "projects": [
    {
      "id": "school",
      "name": "Master IA — Sorbonne",
      "contact": "prof.martinez@sorbonne.fr",
      "deadline": "2026-03-18T23:59:00",
      "color": "#00FF88",
      "keywords": ["cours", "rendu", "memoire", "soutenance", "TP"]
    },
    {
      "id": "company",
      "name": "Alternance — BNP Paribas",
      "contact": "sophie.renard@bnpparibas.com",
      "deadline": "2026-03-17T09:00:00",
      "color": "#FF4444",
      "keywords": ["sprint", "daily", "jira", "livrable", "prod"]
    },
    {
      "id": "startup",
      "name": "Side Project — NoctaAI",
      "contact": "yassine@noctaai.com",
      "deadline": "2026-04-05T00:00:00",
      "color": "#FF8800",
      "keywords": ["NoctaAI", "MVP", "landing", "beta", "funding"]
    }
  ]
}
```

### Mock data

Emails, events, and search results are hardcoded in `mock_data.py` to tell a coherent story:
- **School:** TP deadline in 4 days, soutenance date confirmation needed
- **Company:** Manager silent 6 days, blocking dashboard bug, sprint review Monday with no prep block
- **Startup:** YC W26 opened this morning, landing page conversion low

## 6. Backend Components

### tools.py — 3 functions declared to Gemini

- `read_emails(project_id: str) -> str` — returns mock emails for a project
- `get_events(project_id: str) -> str` — returns mock calendar events
- `search_web(project_id: str) -> str` — returns mock search results for project keywords

Note: `score_urgency` is NOT a Gemini tool. It is called deterministically by the backend on all emails returned by `read_emails`. Gemini only generates the final brief text.

### urgency.py — HuggingFace scoring

- Model: `cross-encoder/ms-marco-MiniLM-L6-v2` (no hyphen between L and 6)
- Initialized with `CrossEncoder('cross-encoder/ms-marco-MiniLM-L6-v2', default_activation_function=torch.nn.Sigmoid())` to ensure output is normalized 0-1 (raw logits are unbounded without this)
- Loaded once at startup
- Scores relevance between query "urgent action required deadline missed no reply blocked" and email text
- Returns float 0-1 (after sigmoid activation)

### initiative.py — Deterministic alert rules

4 rules evaluated per project:
1. **Silence:** `days_since_reply >= 5` → URGENT
2. **Deadline:** `hours_to_deadline < 48` AND no prep block → URGENT
3. **External signal:** search urgency score > 0.6 → SIGNAL
4. **Email urgency:** any email score > 0.8 → URGENT

Output: `{status: "READY"|"URGENT"|"SIGNAL", alerts: [str]}`

### agent.py — Gemini function calling loop

1. Build system prompt (Operator persona)
2. Inject project list + 3 tools (read_emails, get_events, search_web)
3. Use the SDK's built-in `ChatSession` to handle thought signatures automatically (Gemini 3 mandates thought signatures during function calling — manual history manipulation will cause 400 errors)
4. Gemini calls tools autonomously
5. Each call emitted via `on_event()` callback
6. Tool results returned to Gemini via ChatSession
7. Backend runs `score_urgency()` + `evaluate_project()` deterministically on collected data
8. Initiative results injected into final Gemini prompt
9. Gemini generates final brief
10. **Max 15 tool call iterations, 30s total timeout.** If exceeded, force brief generation with data collected so far.

### main.py — FastAPI

- `GET /api/run` → starts the agent loop AND returns an SSE stream directly (no separate POST + GET — avoids race condition where events are lost between POST response and SSE connect)
- SSE event types:
  - `tool_call` — tool name, project, status "running"
  - `tool_result` — tool name, project, result, status "done"
  - `urgency` — project, score
  - `brief` — final brief text (no audio_b64 — TTS is browser-side via Web Speech API)

CORS enabled for Replit frontend domain.

## 7. Frontend Components (React)

### Layout

```
Header        — "OPERATOR" logo + "Lancer le scan" button
ProjectCards  — 3 cards side by side, color-coded border-left
ToolFeed      — animated log of tool calls (slide-in, progress bars)
BriefPanel    — typewriter text + Play audio button
```

### Components

- `App.jsx` — layout, manages SSE connection
- `ProjectCard.jsx` — name, status badge (READY/URGENT/SIGNAL), alerts list, color
- `ToolFeed.jsx` — scrolling feed, each line: tool name + project + duration + progress bar
- `BriefPanel.jsx` — typewriter text effect + TTS play button
- `Header.jsx` — logo + trigger button

### Hook: useOperatorSSE(runId)

Consumes SSE stream, returns `{ toolCalls, projects, brief }`.

### Aesthetic

- Background: `#0a0a0a`
- Text: `#00FF88` (green terminal)
- Font: `JetBrains Mono` or `Fira Code`
- Cards: `border-left: 4px solid {project.color}`
- Tool feed: slide-in animation per line
- Brief: typewriter CSS effect
- Badges: pulsing red for URGENT

## 8. TTS

Primary: **Web Speech API** (browser-side, zero setup, no backend involvement)
- `lang: 'fr-FR'`, `rate: 1.1`, `pitch: 0.9`
- Frontend calls `speechSynthesis.speak()` directly with the brief text received via SSE

Fallback: **Google Cloud Text-to-Speech** via backend `tts.py` endpoint — only if Web Speech API sounds too robotic during rehearsal. In that case, add `audio_b64` to the `brief` SSE event.

## 9. System Prompt

```
You are Operator — a Jarvis-class autonomous agent for busy professionals.
You monitor multiple active projects simultaneously.
You speak first. You do not wait to be asked.

On startup:
1. Load all active projects from context
2. Scan Gmail, Calendar, and Search for each project
3. Score urgency using provided signals
4. Deliver a proactive multi-project status brief — unprompted

Rules:
- Never ask for clarification. Make reasonable assumptions.
- Never explain what you are doing. Just do it.
- Output must be 5 bullets max per project. Ruthlessly concise.
- If a tool fails, skip it and note the gap.
- Each project gets its own brief block. Never mix project contexts.
- Start with the most urgent project.
- The human is busy. Every word must earn its place.
- Speak in French.
```

## 10. Out of Scope (do NOT build)

- Mode prod (Gmail clustering via sentence-transformers)
- Real Gmail/Calendar API OAuth
- Continuous monitoring loop
- User authentication
- Database / persistence
- Deployment beyond Replit

## 11. Risks

| Risk | Mitigation |
|------|-----------|
| Gemini function calling unpredictable | Deterministic initiative engine as backbone; Gemini only generates text |
| HuggingFace model slow to load | Load once at startup, not per request |
| SSE connection drops | Frontend auto-reconnect + fallback polling |
| Demo breaks on stage | "Lancer le scan" button for manual trigger, rehearse 5x |
| Web Speech API sounds bad | Google Cloud TTS fallback ready |
| Gemini tool loop hangs | Max 15 iterations + 30s timeout, force brief with partial data |

## 12. Dependencies

### Python (backend)
- `google-genai` — Gemini 3 Flash SDK
- `sentence-transformers` — HuggingFace cross-encoder (installs `torch` CPU-only)
- `fastapi` — API framework
- `uvicorn` — ASGI server
- `sse-starlette` — Server-Sent Events for FastAPI

### Frontend (React on Replit)
- React template on Replit (includes react, react-dom, vite)
- No additional packages needed

### Environment variables
- `GOOGLE_API_KEY` — Gemini API key (from Google AI Studio)
- `HF_TOKEN` — HuggingFace token (optional, model is public)
