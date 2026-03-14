"""Tool functions exposed to Gemini. Uses real Google APIs when authenticated, mock data otherwise."""

import json
from pathlib import Path

from google_auth import is_authenticated
from google_services import fetch_emails, fetch_events, fetch_doc_content, list_recent_docs
from mock_data import MOCK_EMAILS, MOCK_EVENTS, MOCK_SEARCH


def _load_project_keywords(project_id: str) -> list[str]:
    """Load keywords for a project from config.json."""
    config_path = Path(__file__).parent / "config.json"
    with open(config_path) as f:
        config = json.load(f)
    for p in config.get("projects", []):
        if p["id"] == project_id:
            return p.get("keywords", [])
    return []


def read_emails(project_id: str) -> str:
    """Read recent emails for a project. Uses Gmail API if authenticated, mock data otherwise."""
    if is_authenticated():
        keywords = _load_project_keywords(project_id)
        emails = fetch_emails(project_id, keywords=keywords)
        if not emails:
            return f"No emails found for project {project_id}."
        lines = []
        for e in emails:
            days = e.get("days_since_reply")
            silence = f"{days} days ago" if days is not None else "unknown"
            lines.append(
                f"From: {e['from']}\n"
                f"Subject: {e['subject']}\n"
                f"Body: {e['body']}\n"
                f"Last reply: {silence}"
            )
        return "\n---\n".join(lines)

    # Fallback to mock data
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
            f"Last reply: {silence}"
        )
    return "\n---\n".join(lines)


def get_events(project_id: str) -> str:
    """Get upcoming calendar events for a project. Uses Calendar API if authenticated, mock data otherwise."""
    if is_authenticated():
        keywords = _load_project_keywords(project_id)
        events = fetch_events(project_id, keywords=keywords)
        if not events:
            return f"No upcoming events for project {project_id}."
        lines = []
        for ev in events:
            prep = "YES" if ev["prep_block"] else "NO"
            lines.append(f"{ev['title']} at {ev['time']} (prep block: {prep})")
        return "\n".join(lines)

    # Fallback to mock data
    events = MOCK_EVENTS.get(project_id, [])
    if not events:
        return f"No upcoming events for project {project_id}."
    lines = []
    for ev in events:
        prep = "YES" if ev["prep_block"] else "NO"
        lines.append(f"{ev['title']} at {ev['time']} (prep block: {prep})")
    return "\n".join(lines)


def search_web(project_id: str) -> str:
    """Search for recent external signals relevant to a project."""
    return MOCK_SEARCH.get(project_id, "No relevant external signals found.")


def read_doc(doc_id: str) -> str:
    """Read a Google Doc by its document ID. Returns title and content."""
    if not is_authenticated():
        return "Not connected to Google. Please authenticate first."

    result = fetch_doc_content(doc_id)
    if not result["content"]:
        return f"Could not read document {doc_id}."

    return f"Title: {result['title']}\n\nContent:\n{result['content']}"


def list_docs() -> str:
    """List recently modified Google Docs."""
    if not is_authenticated():
        return "Not connected to Google. Please authenticate first."

    docs = list_recent_docs(max_results=10)
    if not docs:
        return "No recent Google Docs found."

    lines = []
    for d in docs:
        lines.append(f"- {d['title']} (ID: {d['id']}, modified: {d['modified_time']})")
    return "\n".join(lines)
