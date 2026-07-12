from pydantic import BaseModel, Field, field_validator


class LeadExtraction(BaseModel):
    """The structured-output contract asked of the LLM after every user
    turn. Deliberately does NOT include `category`/`stage` — those are
    backend-computed (crm/scoring.py, brain/stage_strategy.py), never
    trusted from the model's own self-assessment.
    """

    name: str | None = None
    phone: str | None = None
    email: str | None = None
    budget: str | None = None
    location: str | None = None
    intent: str | None = None
    intent_score: int = Field(default=0)
    lead_score: int = Field(default=0)
    summary: str = ""
    next_action: str = ""

    @field_validator("intent_score", "lead_score", mode="before")
    @classmethod
    def clamp_score(cls, v: object) -> int:
        # Small local models occasionally emit a stringified number or an
        # out-of-range value — coerce to a safe default rather than raising,
        # since a malformed score must never crash a live conversation turn.
        try:
            return max(0, min(100, int(v)))  # type: ignore[arg-type]
        except (TypeError, ValueError):
            return 0

    @field_validator("name", "phone", "email", "budget", "location", "intent", mode="before")
    @classmethod
    def blank_to_none(cls, v: object) -> object:
        if isinstance(v, str) and not v.strip():
            return None
        return v
