import re

import torch
from sentence_transformers import CrossEncoder

_URGENCY_KEYWORDS = [
    "urgent", "bloquant", "blocking", "deadline", "critique", "critical",
    "avant lundi", "avant mardi", "avant mercredi", "asap", "immediatement",
    "pas de reponse", "no reply", "en attente", "waiting", "overdue",
    "sprint review", "livrable", "retard", "action item",
]

_model = None


def _get_model():
    global _model
    if _model is None:
        _model = CrossEncoder(
            "cross-encoder/ms-marco-MiniLM-L6-v2",
            activation_fn=torch.nn.Sigmoid(),
        )
    return _model


def load_model():
    """Call at startup to pre-load the model."""
    _get_model()


def score_urgency(email_text: str) -> float:
    """Score how urgent an email is (0-1). Higher = more urgent.

    Uses HuggingFace cross-encoder for semantic scoring + keyword boosting
    to handle French text properly (cross-encoder trained on English MS-MARCO).
    """
    model = _get_model()

    # Cross-encoder semantic score (English query for best results)
    pairs = [("urgent deadline missed action required immediately", email_text)]
    raw_scores = model.predict(pairs)
    semantic_score = float(raw_scores[0])

    # Keyword-based urgency boost (handles French text)
    text_lower = email_text.lower()
    keyword_hits = sum(1 for kw in _URGENCY_KEYWORDS if kw in text_lower)
    keyword_score = min(keyword_hits / 3.0, 1.0)  # normalize: 3+ keywords = max

    # Combine: keyword score dominates since cross-encoder struggles with French
    final_score = max(semantic_score, keyword_score)
    return round(final_score, 3)


def score_emails(emails: list[dict]) -> list[dict]:
    """Score a list of email dicts. Adds 'urgency_score' key to each."""
    for email in emails:
        email["urgency_score"] = score_urgency(email["body"])
    return emails
