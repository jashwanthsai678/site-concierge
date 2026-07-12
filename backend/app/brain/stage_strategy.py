from dataclasses import dataclass

from app.models.conversation import Stage

# Rule-based, not LLM-self-reported: a 1.7B local model claiming its own
# stage is both unreliable (small models drift on meta-format instructions)
# and unfalsifiable (it could claim "qualification" having asked nothing).
# Stage is instead computed from which Lead fields are ALREADY populated —
# an auditable, pure, unit-testable signal — plus a small keyword heuristic
# layered on top for objection/booking signals, since those are about what
# the visitor just SAID, not what's been collected so far.

_OBJECTION_KEYWORDS = (
    "not sure", "too expensive", "however", "doubt", "hesitant",
    "worried", "concern", "but i", "but the", "what if",
)
_BOOKING_KEYWORDS = (
    "book", "schedule", "call me", "let's meet", "sounds good",
    "works for me", "yes", "sure", "okay let", "ok let",
)


@dataclass(frozen=True)
class LeadFields:
    name: str | None = None
    phone: str | None = None
    email: str | None = None
    budget: str | None = None
    location: str | None = None
    intent: str | None = None


def compute_stage(fields: LeadFields, *, turn_count: int, last_user_message: str, current_stage: Stage) -> Stage:
    """Pure function: (fields collected so far, turn count, last thing the
    visitor said, current persisted stage) -> next stage. No I/O, no LLM
    call — fully unit-testable with table-driven cases.
    """
    if current_stage == Stage.BOOKING:
        return Stage.BOOKING  # monotonic: never regress out of booking

    message = (last_user_message or "").lower()
    ladder_stage = _compute_ladder_stage(
        has_interest=bool(fields.location or fields.intent),
        has_budget=bool(fields.budget),
        has_contact=bool(fields.name and (fields.phone or fields.email)),
        turn_count=turn_count,
    )

    if ladder_stage == Stage.CLOSING and _contains_any(message, _BOOKING_KEYWORDS):
        return Stage.BOOKING

    if ladder_stage != Stage.DISCOVERY and _contains_any(message, _OBJECTION_KEYWORDS):
        return Stage.OBJECTION_HANDLING

    return ladder_stage


def _compute_ladder_stage(*, has_interest: bool, has_budget: bool, has_contact: bool, turn_count: int) -> Stage:
    if not has_interest:
        return Stage.DISCOVERY
    if not has_budget:
        return Stage.QUALIFICATION
    if not has_contact:
        return Stage.RECOMMENDATION
    return Stage.CLOSING


def _contains_any(message: str, keywords: tuple[str, ...]) -> bool:
    return any(keyword in message for keyword in keywords)
