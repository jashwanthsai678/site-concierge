from sqlalchemy.ext.asyncio import AsyncSession

from app.analytics import queries
from app.utils.time import utc_day_bounds


class DashboardService:
    def __init__(self, db: AsyncSession):
        self._db = db

    async def get_today_summary(self, business_id: int) -> dict:
        start, end = utc_day_bounds()
        visitors = await queries.count_visitors(self._db, business_id, start, end)
        conversations = await queries.count_conversations(self._db, business_id, start, end)
        qualified_leads = await queries.count_qualified_leads(self._db, business_id, start, end)
        booked_meetings = await queries.count_booked_meetings(self._db, business_id, start, end)
        avg_seconds = await queries.avg_conversation_duration_seconds(self._db, business_id, start, end)

        return {
            "visitors_today": visitors,
            "conversations_today": conversations,
            "qualified_leads_today": qualified_leads,
            "booked_meetings_today": booked_meetings,
            "avg_conversation_seconds": avg_seconds,
        }
