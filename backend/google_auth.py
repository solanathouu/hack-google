"""Google OAuth 2.0 flow for Gmail, Calendar, and Docs APIs."""

import os
import json
from pathlib import Path

from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request

SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/documents.readonly",
]

TOKEN_PATH = Path(__file__).parent / "token.json"
CLIENT_SECRET_PATH = Path(__file__).parent / "client_secret.json"

# In-memory credentials cache (single-user demo)
_credentials: Credentials | None = None


def _get_redirect_uri() -> str:
    return os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/auth/callback")


def has_client_secret() -> bool:
    """Check if OAuth client_secret.json is configured."""
    return CLIENT_SECRET_PATH.exists()


def get_auth_url() -> str | None:
    """Generate the Google OAuth consent URL."""
    if not has_client_secret():
        return None

    flow = Flow.from_client_secrets_file(
        str(CLIENT_SECRET_PATH),
        scopes=SCOPES,
        redirect_uri=_get_redirect_uri(),
    )
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
    )
    return auth_url


def handle_callback(authorization_code: str) -> Credentials:
    """Exchange the authorization code for credentials."""
    global _credentials

    flow = Flow.from_client_secrets_file(
        str(CLIENT_SECRET_PATH),
        scopes=SCOPES,
        redirect_uri=_get_redirect_uri(),
    )
    flow.fetch_token(code=authorization_code)
    _credentials = flow.credentials

    # Persist token for reuse across restarts
    TOKEN_PATH.write_text(_credentials.to_json())
    return _credentials


def get_credentials() -> Credentials | None:
    """Get valid credentials, refreshing if needed."""
    global _credentials

    if _credentials and _credentials.valid:
        return _credentials

    if _credentials and _credentials.expired and _credentials.refresh_token:
        _credentials.refresh(Request())
        TOKEN_PATH.write_text(_credentials.to_json())
        return _credentials

    # Try loading from persisted token
    if TOKEN_PATH.exists():
        _credentials = Credentials.from_authorized_user_file(str(TOKEN_PATH), SCOPES)
        if _credentials.valid:
            return _credentials
        if _credentials.expired and _credentials.refresh_token:
            _credentials.refresh(Request())
            TOKEN_PATH.write_text(_credentials.to_json())
            return _credentials

    return None


def is_authenticated() -> bool:
    """Check if we have valid Google credentials."""
    return get_credentials() is not None


def logout():
    """Clear stored credentials."""
    global _credentials
    _credentials = None
    if TOKEN_PATH.exists():
        TOKEN_PATH.unlink()
