from datetime import datetime


def evaluate_project(project: dict, emails: list[dict], events: list[dict], search_score: float) -> dict:
    """Evaluate a project's status based on deterministic rules.

    Returns:
        {"status": "READY"|"URGENT"|"SIGNAL", "alerts": [str]}
    """
    alerts = []
    status = "READY"

    # Rule 1: Silence detected
    reply_days = [
        e["days_since_reply"]
        for e in emails
        if e.get("days_since_reply") is not None
    ]
    if reply_days:
        max_silence = max(reply_days)
        if max_silence >= 5:
            contact = emails[0]["from"]
            alerts.append(f"Silence depuis {max_silence} jours de {contact}")
            status = "URGENT"

    # Rule 2: Deadline < 48h without prep block
    deadline = datetime.fromisoformat(project["deadline"])
    now = datetime.now()
    hours_to_deadline = (deadline - now).total_seconds() / 3600
    has_prep = any(e.get("prep_block", False) for e in events)
    if hours_to_deadline < 48 and not has_prep:
        alerts.append(f"Deadline dans {int(hours_to_deadline)}h - aucun bloc de prep")
        status = "URGENT"

    # Rule 3: External signal relevant
    if search_score > 0.6:
        alerts.append("Signal externe pertinent detecte")
        if status != "URGENT":
            status = "SIGNAL"

    # Rule 4: High urgency email
    urgency_scores = [e.get("urgency_score", 0) for e in emails]
    if any(s > 0.8 for s in urgency_scores):
        alerts.append("Email a haute urgence detecte")
        status = "URGENT"

    return {"status": status, "alerts": alerts}
