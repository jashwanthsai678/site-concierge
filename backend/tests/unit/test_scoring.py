import pytest

from app.crm.scoring import categorize
from app.models.lead import LeadCategory
from app.schemas.lead_extraction import LeadExtraction


@pytest.mark.parametrize(
    "score, expected",
    [
        (0, LeadCategory.COLD),
        (39, LeadCategory.COLD),
        (40, LeadCategory.WARM),
        (69, LeadCategory.WARM),
        (70, LeadCategory.HOT),
        (100, LeadCategory.HOT),
    ],
)
def test_categorize_thresholds(score, expected):
    assert categorize(score) == expected


@pytest.mark.parametrize(
    "raw_value, expected",
    [
        (150, 100),
        (-10, 0),
        ("85", 85),
        ("not a number", 0),
        (None, 0),
    ],
)
def test_lead_extraction_clamps_scores_defensively(raw_value, expected):
    extraction = LeadExtraction(intent_score=raw_value, lead_score=raw_value)
    assert extraction.intent_score == expected
    assert extraction.lead_score == expected


def test_lead_extraction_blank_strings_become_none():
    extraction = LeadExtraction(name="   ", phone="9999999999")
    assert extraction.name is None
    assert extraction.phone == "9999999999"
