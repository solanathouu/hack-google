# Oppy — AI Voice Assistant

## Current Project State

| Aspect | Status |
|--------|--------|
| Backend (FastAPI + Gemini) | ✅ Working |
| Frontend (React + Voice) | ✅ Working |
| TTS (Gemini 2.5 Flash) | ✅ Working — chunked sentence-by-sentence |
| STT (Web Speech API) | ✅ Working — auto-detect language |
| Chat (Gemini 3 Flash) | ✅ Persistent session, bilingual FR/EN |
| Wake word ("Oppy") | ✅ Working — requires mic auth via orb click first |
| Avatar (OppyFace SVG) | ✅ Animated eyes + mouth |
| Design | ✅ Gemini-inspired, white bg, Google Sans |
| Mock data | ✅ 12 emails + 13 events, Eugenia/BNP/NoctaAI |
| Gmail/Calendar API | ✅ Real drafts + events created |
| Replit config | ✅ .replit + start.sh ready |
| Deployment | 🔄 Replit import not yet tested |

## Architecture

```
Frontend (React 18 + Vite)
  → Web Speech API (STT) → POST /api/chat (SSE) → Gemini 3 Flash
  → POST /api/tts → Gemini 2.5 Flash TTS → WAV audio playback
  → OppyFace SVG (animated eyes/mouth)
  → ProjectCards drawer (expandable, links to Gmail/Calendar)

Backend (FastAPI)
  → agent.py: system prompts, persistent chat session, agent loop
  → tts.py: Gemini TTS → WAV conversion
  → mock_data.py: emails, events, search signals
  → main.py: API endpoints + static file serving for production
```

## Key Files

- `backend/agent.py` — System prompts (scan + chat), chat session, agent loop
- `backend/main.py` — FastAPI endpoints (/api/chat, /api/tts, /api/project/{id}/sources)
- `backend/tts.py` — Gemini TTS with WAV header wrapping
- `backend/mock_data.py` — All mock emails, events, search signals
- `frontend/src/App.jsx` — Main orchestrator (phase state machine: IDLE→LISTENING→THINKING→SPEAKING)
- `frontend/src/components/OppyFace.jsx` — SVG animated face
- `frontend/src/components/JarvisOrb.jsx` — Orb with phase animations
- `frontend/src/hooks/useTTS.js` — TTS with chunked sentence playback
- `frontend/src/hooks/useWakeWord.js` — Wake word detection
- `frontend/src/hooks/useSpeechRecognition.js` — Conversation STT

## How to Run (Dev)

Terminal 1: `cd backend && uvicorn main:app --host 0.0.0.0 --port 8000`
Terminal 2: `cd frontend && npx vite --host 0.0.0.0 --port 5173`

Open http://localhost:5173

## Known Issues

- Backend must be restarted when code changes (no --reload to avoid zombie SSE connections)
- Wake word requires mic authorization via first orb click (Chrome blocks auto-start)
- `BACKEND_URL` uses `localhost:8000` in dev, relative `''` in production
- Chat session is persistent per server process (restarts reset conversation)

## Next Immediate Action

Test Replit deployment: import from GitHub, add GOOGLE_API_KEY secret, run `bash start.sh`.
