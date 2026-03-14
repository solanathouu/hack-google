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
            f"Last reply: {silence}"
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
    return MOCK_SEARCH.get(project_id, "No relevant external signals found.")
