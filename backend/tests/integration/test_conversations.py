from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.api.routers import auth, conversations
from app.models.business import Business
from app.models.conversation import Conversation
from app.utils.security import hash_password

# Transcripts are the most sensitive rows in this database — whatever a
# visitor said out loud, verbatim. These endpoints used to accept a
# caller-supplied `?business_id=`, so anyone could read anyone's.

PASSWORD = "correct-horse-battery-staple"


def _make_client(db_session: AsyncSession) -> TestClient:
    app = FastAPI()
    app.include_router(auth.router)
    app.include_router(conversations.router)

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


async def _seed_conversation(db_session: AsyncSession, business_id: int) -> Conversation:
    conversation = Conversation(visitor_id=1, business_id=business_id)
    db_session.add(conversation)
    await db_session.flush()
    await db_session.commit()
    return conversation


def _login(client: TestClient, business: Business) -> dict[str, str]:
    response = client.post("/api/auth/login", json={"email": business.email, "password": PASSWORD})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['token']}"}


async def test_conversation_endpoints_reject_an_unauthenticated_caller(db_session: AsyncSession):
    business = await _seed_business(db_session, "convo-owner")
    conversation = await _seed_conversation(db_session, business.id)
    client = _make_client(db_session)

    assert client.get("/api/conversations").status_code == 401
    assert client.get(f"/api/conversations/{conversation.id}/messages").status_code == 401
    # The old escape hatch must not still work.
    assert client.get("/api/conversations", params={"business_id": business.id}).status_code == 401


async def test_a_business_only_lists_its_own_conversations(db_session: AsyncSession):
    owner = await _seed_business(db_session, "convo-mine")
    other = await _seed_business(db_session, "convo-theirs")
    mine = await _seed_conversation(db_session, owner.id)
    await _seed_conversation(db_session, other.id)

    client = _make_client(db_session)
    headers = _login(client, owner)

    response = client.get("/api/conversations", headers=headers)
    assert response.status_code == 200
    assert [c["id"] for c in response.json()] == [mine.id]


async def test_reading_another_businesss_transcript_404s(db_session: AsyncSession):
    owner = await _seed_business(db_session, "convo-a")
    other = await _seed_business(db_session, "convo-b")
    theirs = await _seed_conversation(db_session, other.id)

    client = _make_client(db_session)
    headers = _login(client, owner)

    assert client.get(f"/api/conversations/{theirs.id}/messages", headers=headers).status_code == 404


async def test_reading_your_own_transcript_succeeds(db_session: AsyncSession):
    owner = await _seed_business(db_session, "convo-c")
    mine = await _seed_conversation(db_session, owner.id)

    client = _make_client(db_session)
    headers = _login(client, owner)

    assert client.get(f"/api/conversations/{mine.id}/messages", headers=headers).status_code == 200
