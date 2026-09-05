from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.api.routers import onboarding

# A bare app with only the router under test — not app.main.app, whose
# lifespan seeds the real dev database and fires a real warm-up call to
# Groq. This keeps the test hermetic (in-memory db, no network).


def _make_client(db_session: AsyncSession) -> TestClient:
    app = FastAPI()
    app.include_router(onboarding.router)

    async def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    return TestClient(app)


_CREATE_PAYLOAD = {
    "slug": "test-biz",
    "email": "owner@test-biz.example",
    "password": "correct-horse-battery-staple",
    "name": "Test Biz",
    "industry": "services",
    "persona_description": "You are a helpful consultant.",
    "greeting_template": "Hi, I'm here to help!",
    "landing_page_slug": "test-biz-demo",
    "ad_creative_headline": "Headline",
    "ad_creative_body": "Body",
}


def test_create_business_persists_business_and_campaign(db_session: AsyncSession):
    client = _make_client(db_session)
    response = client.post("/api/onboarding/businesses", json=_CREATE_PAYLOAD)

    assert response.status_code == 201
    body = response.json()
    assert body["business"]["slug"] == "test-biz"
    assert body["business"]["mascot_key"] == "default"
    assert body["landing_page_slug"] == "test-biz-demo"


def test_create_business_rejects_duplicate_slug(db_session: AsyncSession):
    client = _make_client(db_session)
    client.post("/api/onboarding/businesses", json=_CREATE_PAYLOAD)

    duplicate = {**_CREATE_PAYLOAD, "landing_page_slug": "different-slug"}
    response = client.post("/api/onboarding/businesses", json=duplicate)

    assert response.status_code == 409


def test_create_business_returns_a_usable_session_token(db_session: AsyncSession):
    """Regression test: onboarding used to require a second, separate step
    (add_knowledge_items/trigger_ingestion) with no auth at all — any caller
    could add knowledge to or trigger ingestion for ANY business by
    guessing its id. Those endpoints were removed in favor of the frontend
    using the already-authenticated /api/portal/knowledge and
    /api/portal/ingest with the token issued here, same as a fresh login.
    """
    client = _make_client(db_session)
    response = client.post("/api/onboarding/businesses", json=_CREATE_PAYLOAD)

    assert response.status_code == 201
    token = response.json()["token"]
    assert token and isinstance(token, str)
