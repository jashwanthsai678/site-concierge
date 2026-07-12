from collections.abc import AsyncIterator

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.brain.interfaces import LLMClient
from app.models.base import Base


class FakeLLMClient(LLMClient):
    """Test double — no real Ollama call. `chat(json_mode=True)` returns
    canned extraction JSON; `chat(json_mode=False)`/`chat_stream` return a
    canned reply. Configurable per-test via the constructor.
    """

    def __init__(self, reply_text: str = "Got it, what's your budget?", extraction_json: str | None = None):
        self.reply_text = reply_text
        self.extraction_json = extraction_json or (
            '{"name": null, "phone": null, "email": null, "budget": null, '
            '"location": "Canada", "intent": "Master\'s in Computer Science", '
            '"intent_score": 80, "lead_score": 65, '
            '"summary": "Visitor wants to study in Canada.", "next_action": "Ask about budget"}'
        )
        self.chat_calls: list[dict] = []

    async def chat(self, messages: list[dict], *, json_mode: bool = False) -> dict:
        self.chat_calls.append({"messages": messages, "json_mode": json_mode})
        content = self.extraction_json if json_mode else self.reply_text
        return {"content": content, "thinking": None}

    async def chat_stream(self, messages: list[dict]) -> AsyncIterator[str]:
        for word in self.reply_text.split(" "):
            yield word + " "

    async def is_healthy(self) -> bool:
        return True


@pytest.fixture
def fake_llm_client() -> FakeLLMClient:
    return FakeLLMClient()


@pytest_asyncio.fixture
async def db_session() -> AsyncIterator[AsyncSession]:
    # In-memory SQLite, StaticPool so the single connection (and its
    # in-memory data) is shared across the whole test instead of each
    # checkout getting its own throwaway :memory: database.
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session

    await engine.dispose()
