from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession

from app.brain.interfaces import LLMClient
from app.brain.token_router_client import TokenRouterClient
from app.config.settings import get_settings
from app.database.session import async_session_factory
from app.knowledge.interfaces import KnowledgeProvider
from app.knowledge.rag_knowledge_provider import RagKnowledgeProvider

_llm_client: TokenRouterClient | None = None
_knowledge_provider: RagKnowledgeProvider | None = None


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        yield session


def get_llm_client() -> LLMClient:
    global _llm_client
    if _llm_client is None:
        _llm_client = TokenRouterClient(get_settings())
    return _llm_client


def get_knowledge_provider() -> KnowledgeProvider:
    global _knowledge_provider
    if _knowledge_provider is None:
        _knowledge_provider = RagKnowledgeProvider()
    return _knowledge_provider
