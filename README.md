# Oppy — AI Voice Assistant for Multi-Project Management

Oppy is a voice-first AI assistant built on Google's Gemini ecosystem. It helps students and professionals juggling multiple projects (school, work, startup) stay on top of everything through natural voice conversation.

## What it does

Oppy connects to your Gmail and Google Calendar, analyzes urgency across all your projects, and talks to you like a direct, caring mentor. Ask it about your schedule, your emails, or what to prioritize — it answers with actionable advice.

**Key features:**
- Voice conversation powered by Gemini 3 Flash (chat) and Gemini 2.5 Flash TTS (speech)
- Wake word activation — say "Oppy" to start hands-free
- Animated SVG avatar with eye tracking, blinking, and mouth animation
- Real Gmail and Google Calendar integration
- Expandable project cards with direct action links
- Gemini-inspired UI (Google Sans, white theme, Google color palette)

## Tech stack

| Layer | Tech |
|-------|------|
| Backend | Python, FastAPI, SSE streaming |
| AI | Gemini 3 Flash (chat + function calling), Gemini 2.5 Flash Preview TTS |
| Frontend | React 18, Vite, Web Speech API |
| APIs | Gmail API, Google Calendar API |

## Quick start

### Prerequisites
- Python 3.11+
- Node.js 18+
- A [Google AI API key](https://aistudio.google.com/apikey)

### Setup

```bash
# Clone
git clone https://github.com/solanathouu/hack-google.git
cd hack-google

# Backend
cd backend
pip install -r requirements.txt
echo "GOOGLE_API_KEY=your_key_here" > .env

# Frontend
cd ../frontend
npm install
```

### Run (development)

Terminal 1 — backend:
```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000
```

Terminal 2 — frontend:
```bash
cd frontend
npx vite --host 0.0.0.0 --port 5173
```

Open http://localhost:5173

### Run (production / Replit)

```bash
bash start.sh
```

This builds the frontend and serves everything from FastAPI on port 8000.

## How to use

1. Open the app — Oppy's avatar appears
2. Click the orb to authorize your microphone
3. Once the green "Micro actif" dot appears, say **"Oppy"** or click again
4. Ask anything: "What's my schedule today?", "Tell me about Sophie's email", "What should I prioritize?"
5. Oppy answers vocally and listens for your next question
6. Say "merci" or "au revoir" to end the conversation

## Project structure

```
backend/
  main.py          — FastAPI app, API endpoints, static file serving
  agent.py         — Gemini agent loop, chat session, system prompts
  tts.py           — Gemini TTS audio generation
  mock_data.py     — Demo emails, events, web signals
  urgency.py       — Keyword-based urgency scoring
  initiative.py    — Project health evaluation
  tools.py         — Tool functions (read_emails, get_events, search_web)
  config.json      — Project definitions

frontend/src/
  App.jsx                    — Main orchestrator (phase state machine)
  components/
    JarvisOrb.jsx            — Animated orb with phase-based effects
    OppyFace.jsx             — SVG face (sparkle eyes + mouth)
    ConversationOverlay.jsx  — Chat transcript display
    ProjectCard.jsx          — Expandable project card with sources
    ProjectCardsDrawer.jsx   — Bottom drawer for project cards
  hooks/
    useOperatorSSE.js        — Chat API communication
    useTTS.js                — Gemini TTS playback
    useWakeWord.js           — Wake word detection
    useSpeechRecognition.js  — Speech-to-text for conversation
```

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/chat` | Send a message, get SSE streamed response |
| POST | `/api/tts` | Convert text to speech (WAV audio) |
| GET | `/api/project/{id}/sources` | Get emails, events, signals for a project |
| GET | `/api/health` | Health check |

## License

MIT
