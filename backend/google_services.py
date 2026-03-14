"""Real Google API wrappers for Gmail, Calendar, and Docs."""

import base64
import re
from datetime import datetime, timedelta, timezone

from googleapiclient.discovery import build

from google_auth import get_credentials


def _get_gmail_service():
    creds = get_credentials()
    if not creds:
        return None
    return build("gmail", "v1", credentials=creds)


def _get_calendar_service():
    creds = get_credentials()
    if not creds:
        return None
    return build("calendar", "v3", credentials=creds)


def _get_docs_service():
    creds = get_credentials()
    if not creds:
        return None
    return build("docs", "v1", credentials=creds)


def _extract_body(payload: dict) -> str:
    """Extract plain text body from Gmail message payload."""
    if payload.get("body", {}).get("data"):
        return base64.urlsafe_b64decode(payload["body"]["data"]).decode("utf-8", errors="replace")

    parts = payload.get("parts", [])
    for part in parts:
        if part.get("mimeType") == "text/plain" and part.get("body", {}).get("data"):
            return base64.urlsafe_b64decode(part["body"]["data"]).decode("utf-8", errors="replace")
        # Recurse into multipart
        if part.get("parts"):
            result = _extract_body(part)
            if result:
                return result

    return ""


def _get_header(headers: list[dict], name: str) -> str:
    """Get a header value by name from Gmail message headers."""
    for h in headers:
        if h["name"].lower() == name.lower():
            return h["value"]
    return ""


def _days_since(date_str: str) -> int | None:
    """Calculate days since an email date. Returns None if unparseable."""
    try:
        # Gmail dates are like "Fri, 14 Mar 2026 10:30:00 +0100"
        # Try multiple formats
        for fmt in ["%a, %d %b %Y %H:%M:%S %z", "%d %b %Y %H:%M:%S %z"]:
            try:
                dt = datetime.strptime(date_str, fmt)
                return (datetime.now(timezone.utc) - dt).days
            except ValueError:
                continue
        return None
    except Exception:
        return None


def fetch_emails(project_id: str, keywords: list[str] | None = None, max_results: int = 10) -> list[dict]:
    """Fetch recent emails from Gmail, optionally filtered by project keywords.

    Returns list of dicts with: from, subject, body, date, days_since_reply
    """
    service = _get_gmail_service()
    if not service:
        return []

    # Build search query from project keywords
    query = ""
    if keywords:
        query = " OR ".join(keywords)
        query = f"({query})"
    query += " newer_than:14d"

    try:
        results = service.users().messages().list(
            userId="me",
            q=query.strip(),
            maxResults=max_results,
        ).execute()

        messages = results.get("messages", [])
        emails = []

        for msg_meta in messages:
            msg = service.users().messages().get(
                userId="me",
                id=msg_meta["id"],
                format="full",
            ).execute()

            headers = msg.get("payload", {}).get("headers", [])
            from_addr = _get_header(headers, "From")
            subject = _get_header(headers, "Subject")
            date_str = _get_header(headers, "Date")
            body = _extract_body(msg.get("payload", {}))

            # Truncate body for context window efficiency
            if len(body) > 500:
                body = body[:500] + "..."

            days = _days_since(date_str)

            emails.append({
                "from": from_addr,
                "subject": subject,
                "body": body,
                "date": date_str,
                "days_since_reply": days,
            })

        return emails

    except Exception as e:
        print(f"Gmail API error: {e}")
        return []


def fetch_events(project_id: str, keywords: list[str] | None = None, days_ahead: int = 7) -> list[dict]:
    """Fetch upcoming calendar events, optionally filtered by keywords.

    Returns list of dicts with: title, time, prep_block
    """
    service = _get_calendar_service()
    if not service:
        return []

    now = datetime.now(timezone.utc)
    time_min = now.isoformat()
    time_max = (now + timedelta(days=days_ahead)).isoformat()

    try:
        # Search query with keywords if provided
        q = " ".join(keywords) if keywords else None

        results = service.events().list(
            calendarId="primary",
            timeMin=time_min,
            timeMax=time_max,
            maxResults=20,
            singleEvents=True,
            orderBy="startTime",
            q=q,
        ).execute()

        items = results.get("items", [])
        events = []

        for item in items:
            start = item["start"].get("dateTime", item["start"].get("date", ""))
            title = item.get("summary", "Sans titre")

            # Detect prep blocks: events with "prep" in title or short (<=30min) events
            # right before other events
            is_prep = bool(re.search(r"prep|preparation|revision", title, re.IGNORECASE))

            events.append({
                "title": title,
                "time": start,
                "prep_block": is_prep,
            })

        return events

    except Exception as e:
        print(f"Calendar API error: {e}")
        return []


def fetch_doc_content(doc_id: str) -> dict:
    """Fetch a Google Doc's title and text content.

    Args:
        doc_id: The Google Docs document ID (from the URL).

    Returns dict with: title, content (plain text excerpt)
    """
    service = _get_docs_service()
    if not service:
        return {"title": "", "content": "Not authenticated with Google."}

    try:
        doc = service.documents().get(documentId=doc_id).execute()
        title = doc.get("title", "Untitled")

        # Extract plain text from document body
        body = doc.get("body", {})
        content_parts = []

        for element in body.get("content", []):
            paragraph = element.get("paragraph")
            if paragraph:
                for elem in paragraph.get("elements", []):
                    text_run = elem.get("textRun")
                    if text_run:
                        content_parts.append(text_run.get("content", ""))

        full_text = "".join(content_parts).strip()

        # Truncate for context efficiency
        if len(full_text) > 2000:
            full_text = full_text[:2000] + "..."

        return {"title": title, "content": full_text}

    except Exception as e:
        print(f"Docs API error: {e}")
        return {"title": "", "content": f"Error reading document: {e}"}


def list_recent_docs(max_results: int = 5) -> list[dict]:
    """List recently modified Google Docs using the Drive API.

    Returns list of dicts with: id, title, modified_time
    """
    creds = get_credentials()
    if not creds:
        return []

    try:
        drive = build("drive", "v3", credentials=creds)
        results = drive.files().list(
            q="mimeType='application/vnd.google-apps.document'",
            orderBy="modifiedTime desc",
            pageSize=max_results,
            fields="files(id, name, modifiedTime)",
        ).execute()

        files = results.get("files", [])
        return [
            {"id": f["id"], "title": f["name"], "modified_time": f["modifiedTime"]}
            for f in files
        ]

    except Exception as e:
        print(f"Drive API error: {e}")
        return []
