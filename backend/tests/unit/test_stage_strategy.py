import pytest

from app.brain.stage_strategy import LeadFields, compute_stage
from app.models.conversation import Stage

EMPTY = LeadFields()
WITH_INTEREST = LeadFields(location="Canada", intent="Master's in CS")
WITH_BUDGET = LeadFields(location="Canada", intent="Master's in CS", budget="15-20 lakhs")
WITH_CONTACT = LeadFields(
    location="Canada", intent="Master's in CS", budget="15-20 lakhs",
    name="Asha", phone="9999999999",
)


@pytest.mark.parametrize(
    "fields, turn_count, message, current_stage, expected",
    [
        (EMPTY, 1, "hi there", Stage.GREETING, Stage.DISCOVERY),
        (WITH_INTEREST, 2, "I want to study in Canada", Stage.DISCOVERY, Stage.QUALIFICATION),
        (WITH_BUDGET, 3, "around 15-20 lakhs", Stage.QUALIFICATION, Stage.RECOMMENDATION),
        (WITH_CONTACT, 4, "my name is Asha, here's my number", Stage.RECOMMENDATION, Stage.CLOSING),
    ],
)
def test_ladder_progression(fields, turn_count, message, current_stage, expected):
    assert compute_stage(fields, turn_count=turn_count, last_user_message=message, current_stage=current_stage) == expected


def test_objection_keyword_overrides_ladder_stage_but_not_discovery():
    # Ladder would say QUALIFICATION (has interest, no budget), but an
    # objection keyword should detour to OBJECTION_HANDLING.
    stage = compute_stage(
        WITH_INTEREST, turn_count=2,
        last_user_message="This sounds too expensive for me",
        current_stage=Stage.QUALIFICATION,
    )
    assert stage == Stage.OBJECTION_HANDLING


def test_objection_keyword_ignored_during_discovery():
    # Ladder says DISCOVERY (no interest known yet) — objection detour
    # should not fire before discovery even starts.
    stage = compute_stage(
        EMPTY, turn_count=1,
        last_user_message="not sure what I want, but let's see",
        current_stage=Stage.GREETING,
    )
    assert stage == Stage.DISCOVERY


def test_booking_keyword_at_closing_advances_to_booking():
    stage = compute_stage(
        WITH_CONTACT, turn_count=5,
        last_user_message="Yes, let's book a call for Tuesday",
        current_stage=Stage.CLOSING,
    )
    assert stage == Stage.BOOKING


def test_booking_is_monotonic_never_regresses():
    # Even with empty fields (which would otherwise ladder to DISCOVERY),
    # once BOOKING is reached it must never regress.
    stage = compute_stage(
        EMPTY, turn_count=6,
        last_user_message="actually never mind",
        current_stage=Stage.BOOKING,
    )
    assert stage == Stage.BOOKING


def test_booking_keyword_without_closing_readiness_does_not_advance():
    # "yes"/"sure" alone shouldn't trigger booking if we're not at the
    # closing rung of the ladder yet.
    stage = compute_stage(
        WITH_INTEREST, turn_count=2,
        last_user_message="yes, sounds good",
        current_stage=Stage.DISCOVERY,
    )
    assert stage == Stage.QUALIFICATION
