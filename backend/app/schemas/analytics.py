from pydantic import BaseModel


class DashboardSummary(BaseModel):
    visitors_today: int
    conversations_today: int
    qualified_leads_today: int
    booked_meetings_today: int
    avg_conversation_seconds: float | None


class FunnelCounts(BaseModel):
    visitors: int
    conversations: int
    qualified_leads: int
    booked_meetings: int
