_URGENCY_KEYWORDS = [
    "urgent", "bloquant", "blocking", "deadline", "critique", "critical",
    "avant lundi", "avant mardi", "avant mercredi", "asap", "immediatement",
    "pas de reponse", "no reply", "en attente", "waiting", "overdue",
    "sprint review", "livrable", "retard", "action item",
]


def load_model():
    """No-op — kept for API compatibility."""
    pass


def score_urgency(email_text: str) -> float:
    """Score how urgent an email is (0-1) using keyword matching."""
    text_lower = email_text.lower()
    keyword_hits = sum(1 for kw in _URGENCY_KEYWORDS if kw in text_lower)
    return round(min(keyword_hits / 3.0, 1.0), 3)


def score_emails(emails: list[dict]) -> list[dict]:
    """Score a list of email dicts. Adds 'urgency_score' key to each."""
    for email in emails:
        email["urgency_score"] = score_urgency(email["body"])
    return emails
