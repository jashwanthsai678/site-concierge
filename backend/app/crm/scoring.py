from app.models.lead import LeadCategory

_HOT_THRESHOLD = 70
_WARM_THRESHOLD = 40


def categorize(lead_score: int) -> LeadCategory:
    """Deterministic score -> category mapping. The extraction LLM proposes
    a numeric score; this function — not the model — decides the category,
    so the dashboard's Hot/Warm/Cold label is always audit-consistent with
    the number next to it.
    """
    if lead_score >= _HOT_THRESHOLD:
        return LeadCategory.HOT
    if lead_score >= _WARM_THRESHOLD:
        return LeadCategory.WARM
    return LeadCategory.COLD
