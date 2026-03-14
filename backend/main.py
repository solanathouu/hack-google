import asyncio
import json
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from sse_starlette.sse import EventSourceResponse

from agent import run_operator
from google_auth import get_auth_url, handle_callback, has_client_secret, is_authenticated, logout
from urgency import load_model

load_dotenv()

# Fail fast if Gemini API key is missing
api_key = os.getenv("GOOGLE_API_KEY")
if not api_key or api_key == "your_key_here":
    raise RuntimeError("GOOGLE_API_KEY not set. Check backend/.env")

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


@asynccontextmanager
async def lifespan(app):
    load_model()
    print("HuggingFace model loaded.")
    if has_client_secret():
        print("OAuth client_secret.json found. Google API integration enabled.")
    else:
        print("No client_secret.json found. Running in mock/demo mode.")
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


# ---- OAuth Endpoints ----

@app.get("/api/auth/status")
async def auth_status():
    """Check if user is authenticated with Google APIs."""
    return {
        "authenticated": is_authenticated(),
        "oauth_available": has_client_secret(),
    }


@app.get("/api/auth/login")
async def auth_login():
    """Redirect to Google OAuth consent screen."""
    url = get_auth_url()
    if not url:
        return {"error": "OAuth not configured. Place client_secret.json in backend/."}
    return RedirectResponse(url)


@app.get("/api/auth/callback")
async def auth_callback(code: str = Query(...)):
    """Handle Google OAuth callback."""
    handle_callback(code)
    return RedirectResponse(f"{FRONTEND_URL}?auth=success")


@app.get("/api/auth/logout")
async def auth_logout():
    """Clear Google credentials."""
    logout()
    return {"status": "logged_out"}


# ---- Core Endpoints ----

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
    return {
        "status": "ok",
        "google_authenticated": is_authenticated(),
        "oauth_available": has_client_secret(),
    }
