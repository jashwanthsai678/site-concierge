from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.api.routers import onboarding
from app.models.business import Business

# A bare app with only the router under test — not app.main.app, whose
# lifespan seeds the real dev database and fires a real warm-up call to
# TokenRouter. This keeps the test hermetic (in-memory db, no network).


def _make_client(db_session: AsyncSession) -> TestClient:
    app = FastAPI()
    app.include_router(onboarding.router)

    async def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    return TestClient(app)


_CREATE_PAYLOAD = {
    "slug": "test-biz",
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


def test_add_knowledge_items_for_unknown_business_404s(db_session: AsyncSession):
    client = _make_client(db_session)
    response = client.post("/api/onboarding/businesses/9999/knowledge", json={"items": []})
    assert response.status_code == 404


async def test_add_knowledge_items_persists_rows(db_session: AsyncSession):
    business = Business(
        slug="kb-biz", name="KB Biz", industry="services",
        greeting_template="Hi!", persona_description="You are helpful.",
    )
    db_session.add(business)
    await db_session.flush()
    await db_session.commit()

    client = _make_client(db_session)
    response = client.post(
        f"/api/onboarding/businesses/{business.id}/knowledge",
        json={"items": [{"category": "faq", "question": "Q?", "content": "A."}]},
    )

    assert response.status_code == 201
    assert response.json() == {"items_added": 1}


async def test_trigger_ingestion_returns_503_when_vector_store_unreachable(db_session: AsyncSession, monkeypatch):
    business = Business(
        slug="ingest-biz", name="Ingest Biz", industry="services",
        greeting_template="Hi!", persona_description="You are helpful.",
    )
    db_session.add(business)
    await db_session.flush()
    await db_session.commit()

    monkeypatch.setattr(
        onboarding, "ingest_business", AsyncMock(side_effect=ConnectionError("no vector store")),
    )
    client = _make_client(db_session)
    response = client.post(f"/api/onboarding/businesses/{business.id}/ingest", json={})

    assert response.status_code == 503


async def test_trigger_ingestion_returns_chunk_count_on_success(db_session: AsyncSession, monkeypatch):
    business = Business(
        slug="ingest-ok-biz", name="Ingest OK Biz", industry="services",
        greeting_template="Hi!", persona_description="You are helpful.",
    )
    db_session.add(business)
    await db_session.flush()
    await db_session.commit()

    monkeypatch.setattr(onboarding, "ingest_business", AsyncMock(return_value=7))
    client = _make_client(db_session)
    response = client.post(f"/api/onboarding/businesses/{business.id}/ingest", json={})

    assert response.status_code == 200
    assert response.json() == {"chunks_ingested": 7}
