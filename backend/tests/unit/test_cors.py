from app.api.cors import origin_allowed
from app.models.business import Business


def _business(allowed_origins: list[str]) -> Business:
    return Business(
        slug="biz", name="Biz", industry="x", greeting_template="hi",
        persona_description="hi", allowed_origins=allowed_origins,
    )


def test_registered_origin_is_allowed():
    business = _business(["https://theirsite.com"])
    assert origin_allowed(business, "https://theirsite.com") is True


def test_unregistered_origin_is_rejected():
    business = _business(["https://theirsite.com"])
    assert origin_allowed(business, "https://evil.example") is False


def test_missing_origin_header_is_rejected():
    business = _business(["https://theirsite.com"])
    assert origin_allowed(business, None) is False


def test_apps_own_origin_is_always_allowed_regardless_of_business_registration():
    business = _business([])  # nothing registered for this business
    assert origin_allowed(business, "http://localhost:5173") is True
