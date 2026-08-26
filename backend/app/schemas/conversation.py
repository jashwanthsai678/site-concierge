from datetime import datetime

from pydantic import BaseModel, ConfigDict


class MessageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    role: str
    content: str
    sequence_number: int
    created_at: datetime


class ConversationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    visitor_id: int
    current_stage: str
    turn_count: int
    status: str
    created_at: datetime
    ended_at: datetime | None
