from collections.abc import AsyncGenerator

from fastapi import Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.brain.interfaces import LLMClient
from app.brain.token_router_client import TokenRouterClient
from app.config.settings import get_settings
from app.database.session import async_session_factory
from app.knowledge.interfaces import KnowledgeProvider
from app.knowledge.static_knowledge_provider import StaticKnowledgeProvider
from app.models.business import Business
from app.models.business_session import BusinessSession

_llm_client: TokenRouterClient | None = None
_knowledge_provider: StaticKnowledgeProvider | None = None


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        yield session


async def get_current_business(
    authorization: str | None = Header(default=None), db: AsyncSession = Depends(get_db),
) -> Business:
    """Portal auth — resolves an opaque bearer token (see
    models/business_session.py) to the Business that's logged in. Every
    client-facing portal endpoint (api/routers/portal.py) depends on this
    instead of trusting a business_id passed in the request, which is what
    makes those endpoints "only your own data" rather than "any data you
    ask for."
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or malformed Authorization header.")
    token = authorization.removeprefix("Bearer ").strip()

    session = (
        await db.execute(select(BusinessSession).where(BusinessSession.token == token))
    ).scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=401, detail="Invalid or expired session.")

    business = await db.get(Business, session.business_id)
    if business is None:
        raise HTTPException(status_code=401, detail="Invalid or expired session.")
    return business


def get_llm_client() -> LLMClient:
    global _llm_client
    if _llm_client is None:
        _llm_client = TokenRouterClient(get_settings())
    return _llm_client


def get_knowledge_provider() -> KnowledgeProvider:
    global _knowledge_provider
    if _knowledge_provider is None:
        _knowledge_provider = StaticKnowledgeProvider()
    return _knowledge_provider
