from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.api.routers import auth, leads
from app.models.business import Business
from app.models.lead import Lead
from app.utils.security import hash_password

# FK enforcement isn't turned on for this in-memory test engine (see
# conftest.py), so a Lead can be seeded directly without real Conversation
# rows — but the Business rows here are real, because the whole point of
# these tests is that the endpoint resolves the business from a session
# token rather than trusting anything the caller says.

PASSWORD = "correct-horse-battery-staple"


def _make_client(db_session: AsyncSession) -> TestClient:
    app = FastAPI()
    app.include_router(auth.router)
    app.include_router(leads.router)

    async def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    return TestClient(app)


async def _seed_business(db_session: AsyncSession, slug: str) -> Business:
    business = Business(
        slug=slug,
        email=f"owner@{slug}.example",
        hashed_password=hash_password(PASSWORD),
        name=slug,
        industry="services",
        greeting_template="Hi!",
        persona_description="You are helpful.",
    )
    db_session.add(business)
    await db_session.flush()
    await db_session.commit()
    return business


async def _seed_lead(db_session: AsyncSession, *, business_id: int, conversation_id: int) -> Lead:
    lead = Lead(conversation_id=conversation_id, business_id=business_id, summary="s", next_action="n")
    db_session.add(lead)
    await db_session.flush()
    await db_session.commit()
    return lead


def _login(client: TestClient, business: Business) -> dict[str, str]:
    response = client.post("/api/auth/login", json={"email": business.email, "password": PASSWORD})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['token']}"}


async def test_lead_endpoints_reject_an_unauthenticated_caller(db_session: AsyncSession):
    """These endpoints used to take `?business_id=` with no auth at all, so
    anyone who could reach the API could read any business's lead PII.
    """
    business = await _seed_business(db_session, "leads-owner")
    lead = await _seed_lead(db_session, business_id=business.id, conversation_id=1)
    client = _make_client(db_session)

    assert client.get("/api/leads").status_code == 401
    assert client.get(f"/api/leads/{lead.id}").status_code == 401
    assert client.patch(f"/api/leads/{lead.id}/status", json={"status": "contacted"}).status_code == 401
    # The old escape hatch must not still work.
    assert client.get("/api/leads", params={"business_id": business.id}).status_code == 401


async def test_a_business_only_sees_its_own_leads(db_session: AsyncSession):
    owner = await _seed_business(db_session, "leads-mine")
    other = await _seed_business(db_session, "leads-theirs")
    mine = await _seed_lead(db_session, business_id=owner.id, conversation_id=1)
    await _seed_lead(db_session, business_id=other.id, conversation_id=2)

    client = _make_client(db_session)
    headers = _login(client, owner)

    response = client.get("/api/leads", headers=headers)
    assert response.status_code == 200
    assert [lead["id"] for lead in response.json()] == [mine.id]


async def test_reading_another_businesss_lead_404s(db_session: AsyncSession):
    owner = await _seed_business(db_session, "leads-a")
    other = await _seed_business(db_session, "leads-b")
    theirs = await _seed_lead(db_session, business_id=other.id, conversation_id=1)

    client = _make_client(db_session)
    headers = _login(client, owner)

    assert client.get(f"/api/leads/{theirs.id}", headers=headers).status_code == 404


async def test_updating_another_businesss_lead_status_404s(db_session: AsyncSession):
    owner = await _seed_business(db_session, "leads-c")
    other = await _seed_business(db_session, "leads-d")
    theirs = await _seed_lead(db_session, business_id=other.id, conversation_id=1)

    client = _make_client(db_session)
    headers = _login(client, owner)

    response = client.patch(f"/api/leads/{theirs.id}/status", json={"status": "contacted"}, headers=headers)
    assert response.status_code == 404


async def test_updating_your_own_lead_status_succeeds(db_session: AsyncSession):
    owner = await _seed_business(db_session, "leads-e")
    mine = await _seed_lead(db_session, business_id=owner.id, conversation_id=1)

    client = _make_client(db_session)
    headers = _login(client, owner)

    response = client.patch(f"/api/leads/{mine.id}/status", json={"status": "contacted"}, headers=headers)
    assert response.status_code == 200
    assert response.json()["status"] == "contacted"
