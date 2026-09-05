from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.api.routers import conversations
from app.models.conversation import Conversation

# FK enforcement isn't turned on for this in-memory test engine (see
# conftest.py), so a Conversation can be seeded directly without a real
# Visitor/Business row — only business_id itself matters for this test.


def _make_client(db_session: AsyncSession) -> TestClient:
    app = FastAPI()
    app.include_router(conversations.router)

    async def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    return TestClient(app)


async def test_get_conversation_messages_404s_when_business_id_does_not_match(db_session: AsyncSession):
    """Regression test: this endpoint previously took no business_id at
    all, letting any caller read any business's full visitor transcript by
    guessing a conversation id."""
    conversation = Conversation(visitor_id=1, business_id=1)
    db_session.add(conversation)
    await db_session.flush()
    await db_session.commit()

    client = _make_client(db_session)

    wrong_business = client.get(f"/api/conversations/{conversation.id}/messages", params={"business_id": 999})
    assert wrong_business.status_code == 404

    right_business = client.get(f"/api/conversations/{conversation.id}/messages", params={"business_id": 1})
    assert right_business.status_code == 200
