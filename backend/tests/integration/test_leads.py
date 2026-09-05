from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.api.routers import leads
from app.models.lead import Lead

# FK enforcement isn't turned on for this in-memory test engine (see
# conftest.py), so a Lead can be seeded directly without real Conversation/
# Business rows — only business_id itself matters for these tests.


def _make_client(db_session: AsyncSession) -> TestClient:
    app = FastAPI()
    app.include_router(leads.router)

    async def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    return TestClient(app)


async def _seed_lead(db_session: AsyncSession, *, business_id: int, conversation_id: int) -> Lead:
    lead = Lead(conversation_id=conversation_id, business_id=business_id, summary="s", next_action="n")
    db_session.add(lead)
    await db_session.flush()
    await db_session.commit()
    return lead


async def test_get_lead_404s_when_business_id_does_not_match(db_session: AsyncSession):
    """Regression test: get_lead/update_lead_status previously took no
    business_id at all, letting any caller read or edit any business's
    lead by guessing an id. This is the same trust model list_leads
    already used (a caller-supplied business_id) — not full auth, but at
    least consistently scoped."""
    lead = await _seed_lead(db_session, business_id=1, conversation_id=1)
    client = _make_client(db_session)

    wrong_business = client.get(f"/api/leads/{lead.id}", params={"business_id": 999})
    assert wrong_business.status_code == 404

    right_business = client.get(f"/api/leads/{lead.id}", params={"business_id": 1})
    assert right_business.status_code == 200


async def test_update_lead_status_404s_when_business_id_does_not_match(db_session: AsyncSession):
    lead = await _seed_lead(db_session, business_id=1, conversation_id=1)
    client = _make_client(db_session)

    wrong_business = client.patch(
        f"/api/leads/{lead.id}/status", params={"business_id": 999}, json={"status": "contacted"},
    )
    assert wrong_business.status_code == 404

    right_business = client.patch(
        f"/api/leads/{lead.id}/status", params={"business_id": 1}, json={"status": "contacted"},
    )
    assert right_business.status_code == 200
    assert right_business.json()["status"] == "contacted"
