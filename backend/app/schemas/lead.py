from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.lead import LeadStatus


class LeadRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    conversation_id: int
    name: str | None
    phone: str | None
    email: str | None
    budget: str | None
    location: str | None
    intent: str | None
    intent_score: int
    lead_score: int
    category: str
    summary: str
    next_action: str
    status: str
    created_at: datetime


class LeadStatusUpdate(BaseModel):
    status: LeadStatus
