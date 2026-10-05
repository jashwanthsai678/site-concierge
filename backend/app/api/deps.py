from collections.abc import AsyncGenerator

from fastapi import Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.brain.groq_client import GroqClient
from app.brain.interfaces import LLMClient
from app.config.settings import get_settings
from app.database.session import async_session_factory
from app.knowledge.interfaces import KnowledgeProvider
from app.knowledge.rag_knowledge_provider import RagKnowledgeProvider
from app.models.base import utcnow
from app.models.business import Business
from app.models.business_session import BusinessSession
from app.models.staff_session import StaffSession
from app.models.staff_user import StaffUser

_llm_client: GroqClient | None = None
_knowledge_provider: RagKnowledgeProvider | None = None


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        yield session


async def resolve_session_business(db: AsyncSession, token: str) -> Business | None:
    """Token -> Business, or None if the token is unknown/expired. Split out
    of `get_current_business` because WebSocket handlers can't use FastAPI's
    header injection (browsers can't set headers on a WS handshake), so
    /ws/dashboard authenticates the same session token off a query param —
    and must apply exactly the same expiry rules, not a second copy of them
    that can drift.
    """
    session = (
        await db.execute(select(BusinessSession).where(BusinessSession.token == token))
    ).scalar_one_or_none()
    if session is None:
        return None

    # Sessions used to never expire at all. SQLite doesn't preserve tzinfo
    # across a round trip even with DateTime(timezone=True), so `expires_at`
    # can come back naive here — normalize both sides to naive UTC for the
    # comparison rather than assume the driver's behavior.
    expires_at = session.expires_at
    now = utcnow()
    if expires_at.tzinfo is None:
        now = now.replace(tzinfo=None)
    if expires_at < now:
        await db.delete(session)
        await db.commit()
        return None

    return await db.get(Business, session.business_id)


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

    business = await resolve_session_business(db, token)
    if business is None:
        raise HTTPException(status_code=401, detail="Invalid or expired session.")
    return business


async def get_current_staff(
    authorization: str | None = Header(default=None), db: AsyncSession = Depends(get_db),
) -> StaffUser:
    """Internal team auth — completely separate token space from
    get_current_business (see models/staff_session.py). A business bearer
    token is never valid here and vice versa, so a compromised customer
    session can't reach team-only routes.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or malformed Authorization header.")
    token = authorization.removeprefix("Bearer ").strip()

    session = (
        await db.execute(select(StaffSession).where(StaffSession.token == token))
    ).scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=401, detail="Invalid or expired session.")

    expires_at = session.expires_at
    now = utcnow()
    if expires_at.tzinfo is None:
        now = now.replace(tzinfo=None)
    if expires_at < now:
        await db.delete(session)
        await db.commit()
        raise HTTPException(status_code=401, detail="Invalid or expired session.")

    staff = await db.get(StaffUser, session.staff_user_id)
    if staff is None or not staff.is_active:
        raise HTTPException(status_code=401, detail="Invalid or expired session.")
    return staff


def get_llm_client() -> LLMClient:
    global _llm_client
    if _llm_client is None:
        _llm_client = GroqClient(get_settings())
    return _llm_client


def get_knowledge_provider() -> KnowledgeProvider:
    global _knowledge_provider
    if _knowledge_provider is None:
        _knowledge_provider = RagKnowledgeProvider()
    return _knowledge_provider
