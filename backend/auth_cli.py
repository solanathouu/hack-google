"""CLI script to authenticate Google account (manual code paste)."""

import json
from pathlib import Path

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow

SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/documents.readonly",
    "https://www.googleapis.com/auth/drive.metadata.readonly",
]

CLIENT_SECRET_PATH = Path(__file__).parent / "client_secret.json"
TOKEN_PATH = Path(__file__).parent / "token.json"

REDIRECT_URI = "urn:ietf:wg:oauth:2.0:oob"


def main():
    with open(CLIENT_SECRET_PATH) as f:
        client_config = json.load(f)

    if "web" in client_config:
        web = client_config["web"]
        config = {
            "installed": {
                "client_id": web["client_id"],
                "client_secret": web["client_secret"],
                "auth_uri": web["auth_uri"],
                "token_uri": web["token_uri"],
                "redirect_uris": ["urn:ietf:wg:oauth:2.0:oob", "http://localhost"],
            }
        }
    else:
        config = client_config

    flow = Flow.from_client_config(config, scopes=SCOPES, redirect_uri="http://localhost:8091/")

    auth_url, _ = flow.authorization_url(access_type="offline", prompt="consent")

    print("\n=== Google OAuth ===")
    print(f"\nOpen this URL in your browser:\n\n{auth_url}\n")
    print("After granting permissions, you'll be redirected to localhost.")
    print("Copy the FULL URL from your browser address bar and paste it here.\n")

    redirect_url = input("Paste the redirect URL here: ").strip()

    flow.fetch_token(authorization_response=redirect_url)
    creds = flow.credentials

    TOKEN_PATH.write_text(creds.to_json())
    print(f"\nToken saved to {TOKEN_PATH}")
    print("You're authenticated! All Google API tools are now live.")


if __name__ == "__main__":
    main()
