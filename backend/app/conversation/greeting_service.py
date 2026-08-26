from app.models.business import Business


def build_greeting(business: Business) -> str:
    """Turn-1 greeting. Deliberately NOT an LLM call — this is what makes
    "greet the visitor within 2 seconds" a guarantee rather than a hope,
    since it never waits on model load or generation latency.
    """
    try:
        return business.greeting_template.format(business_name=business.name)
    except (KeyError, IndexError):
        return business.greeting_template
