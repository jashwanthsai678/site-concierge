from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.analytics import queries
from app.models.lead import Lead, LeadStatus


class PipelineService:
    def __init__(self, db: AsyncSession):
        self._db = db

    async def get_funnel(self, business_id: int) -> dict:
        """All-time acquisition funnel (not "today"-scoped like the stat
        tiles) — shows overall conversion performance, not just today's."""
        return {
            "visitors": await queries.count_visitors(self._db, business_id),
            "conversations": await queries.count_conversations(self._db, business_id),
            "qualified_leads": await queries.count_qualified_leads(self._db, business_id),
            "booked_meetings": await queries.count_booked_meetings(self._db, business_id),
        }

    async def get_status_counts(self, business_id: int) -> dict[str, int]:
        stmt = (
            select(Lead.status, func.count(Lead.id))
            .where(Lead.business_id == business_id)
            .group_by(Lead.status)
        )
        rows = (await self._db.execute(stmt)).all()
        counts = {status.value: 0 for status in LeadStatus}
        for status, count in rows:
            counts[status.value] = count
        return counts
