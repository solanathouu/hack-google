import asyncio
import json
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from agent import chat_with_operator, create_chat_session, run_operator
from mock_data import MOCK_EMAILS, MOCK_EVENTS, MOCK_SEARCH
from tts import generate_speech
from urgency import load_model

load_dotenv()

# Fail fast if API key is missing
api_key = os.getenv("GOOGLE_API_KEY")
if not api_key or api_key == "your_key_here":
    raise RuntimeError("GOOGLE_API_KEY not set. Check backend/.env")


# Persistent chat session (created on first /api/chat call)
_chat_client = None
_chat_session = None


def get_chat_session():
    global _chat_client, _chat_session
    if _chat_session is None:
        config = load_config()
        _chat_client, _chat_session = create_chat_session(config["projects"])
    return _chat_session


@asynccontextmanager
async def lifespan(app):
    load_model()
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
    from pathlib import Path
    config_path = Path(__file__).parent / "config.json"
    with open(config_path) as f:
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


class TTSRequest(BaseModel):
    text: str


class ChatRequest(BaseModel):
    message: str


@app.post("/api/tts")
async def tts(req: TTSRequest):
    audio_bytes = generate_speech(req.text)
    return Response(content=audio_bytes, media_type="audio/wav")


@app.post("/api/chat")
async def chat(req: ChatRequest):
    session = get_chat_session()
    queue = asyncio.Queue()

    async def on_event(event: dict):
        await queue.put(event)

    async def generator():
        task = asyncio.create_task(
            chat_with_operator(req.message, session, on_event)
        )

        while True:
            try:
                event = await asyncio.wait_for(queue.get(), timeout=1.0)
                yield {"event": event["type"], "data": json.dumps(event, ensure_ascii=False)}
                if event["type"] == "chat_reply":
                    break
            except asyncio.TimeoutError:
                if task.done():
                    break
                continue

        await task

    return EventSourceResponse(generator())


@app.get("/api/project/{project_id}/sources")
async def project_sources(project_id: str):
    emails = MOCK_EMAILS.get(project_id, [])
    events = MOCK_EVENTS.get(project_id, [])
    search = MOCK_SEARCH.get(project_id, "")
    return {
        "emails": emails,
        "events": events,
        "search": search,
    }


@app.get("/api/health")
async def health():
    return {"status": "ok"}
