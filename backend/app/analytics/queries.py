from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.appointment import Appointment
from app.models.conversation import Conversation
from app.models.lead import Lead, LeadCategory
from app.models.visitor import Visitor

# "Qualified" = the extraction LLM's own guardrailed scoring judged this
# lead worth a human's attention (Hot or Warm) — see crm/scoring.py.
_QUALIFIED_CATEGORIES = (LeadCategory.HOT, LeadCategory.WARM)


def _window(column, start: datetime | None, end: datetime | None):
    clauses = []
    if start is not None:
        clauses.append(column >= start)
    if end is not None:
        clauses.append(column < end)
    return clauses


async def count_visitors(db: AsyncSession, business_id: int, start: datetime | None = None, end: datetime | None = None) -> int:
    stmt = select(func.count(Visitor.id)).where(Visitor.business_id == business_id, *_window(Visitor.created_at, start, end))
    return (await db.execute(stmt)).scalar_one()


async def count_conversations(db: AsyncSession, business_id: int, start: datetime | None = None, end: datetime | None = None) -> int:
    stmt = select(func.count(Conversation.id)).where(
        Conversation.business_id == business_id, *_window(Conversation.created_at, start, end)
    )
    return (await db.execute(stmt)).scalar_one()


async def count_qualified_leads(db: AsyncSession, business_id: int, start: datetime | None = None, end: datetime | None = None) -> int:
    stmt = select(func.count(Lead.id)).where(
        Lead.business_id == business_id,
        Lead.category.in_(_QUALIFIED_CATEGORIES),
        *_window(Lead.created_at, start, end),
    )
    return (await db.execute(stmt)).scalar_one()


async def count_booked_meetings(db: AsyncSession, business_id: int, start: datetime | None = None, end: datetime | None = None) -> int:
    stmt = (
        select(func.count(Appointment.id))
        .join(Lead, Lead.id == Appointment.lead_id)
        .where(Lead.business_id == business_id, *_window(Appointment.created_at, start, end))
    )
    return (await db.execute(stmt)).scalar_one()


async def avg_conversation_duration_seconds(
    db: AsyncSession, business_id: int, start: datetime | None = None, end: datetime | None = None
) -> float | None:
    stmt = select(Conversation.created_at, Conversation.ended_at).where(
        Conversation.business_id == business_id,
        Conversation.ended_at.is_not(None),
        *_window(Conversation.created_at, start, end),
    )
    rows = (await db.execute(stmt)).all()
    if not rows:
        return None
    durations = [(ended - started).total_seconds() for started, ended in rows]
    return sum(durations) / len(durations)
