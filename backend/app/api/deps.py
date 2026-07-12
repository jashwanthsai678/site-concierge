from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession

from app.brain.interfaces import LLMClient
from app.brain.ollama_client import OllamaClient
from app.config.settings import get_settings
from app.database.session import async_session_factory
from app.knowledge.interfaces import KnowledgeProvider
from app.knowledge.static_knowledge_provider import StaticKnowledgeProvider

_llm_client: OllamaClient | None = None


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        yield session


def get_llm_client() -> LLMClient:
    global _llm_client
    if _llm_client is None:
        _llm_client = OllamaClient(get_settings())
    return _llm_client


def get_knowledge_provider() -> KnowledgeProvider:
    # Swap seam: a future RagKnowledgeProvider implementing the same
    # `KnowledgeProvider` interface drops in here without touching any
    # caller (brain/prompt_builder.py never imports a concrete provider).
    return StaticKnowledgeProvider()
