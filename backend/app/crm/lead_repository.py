from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.lead import Lead


class LeadRepository:
    """Isolates SQLAlchemy query construction from lead business rules
    (scoring, status transitions) — see crm/lead_service.py.
    """

    def __init__(self, db: AsyncSession):
        self._db = db

    async def get_by_conversation_id(self, conversation_id: int) -> Lead | None:
        result = await self._db.execute(select(Lead).where(Lead.conversation_id == conversation_id))
        return result.scalar_one_or_none()

    async def get_by_id(self, lead_id: int) -> Lead | None:
        return await self._db.get(Lead, lead_id)

    async def create(self, *, conversation_id: int, business_id: int) -> Lead:
        lead = Lead(conversation_id=conversation_id, business_id=business_id)
        self._db.add(lead)
        await self._db.flush()
        return lead

    async def list_by_business(self, business_id: int, *, limit: int = 100, offset: int = 0) -> list[Lead]:
        result = await self._db.execute(
            select(Lead)
            .where(Lead.business_id == business_id)
            .order_by(Lead.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())
