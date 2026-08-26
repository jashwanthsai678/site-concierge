from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.appointment import Appointment


class AppointmentService:
    """One Appointment per conversation, created the first time the
    conversation reaches the BOOKING stage. `requested_datetime_text` is
    stored verbatim from the visitor's utterance — deliberately not parsed
    into a real datetime; that's calendar-integration scope, excluded here.
    """

    def __init__(self, db: AsyncSession):
        self._db = db

    async def get_by_conversation_id(self, conversation_id: int) -> Appointment | None:
        result = await self._db.execute(
            select(Appointment).where(Appointment.conversation_id == conversation_id)
        )
        return result.scalar_one_or_none()

    async def create_if_absent(self, *, lead_id: int, conversation_id: int, requested_datetime_text: str) -> Appointment:
        existing = await self.get_by_conversation_id(conversation_id)
        if existing is not None:
            return existing

        appointment = Appointment(
            lead_id=lead_id,
            conversation_id=conversation_id,
            requested_datetime_text=requested_datetime_text,
        )
        self._db.add(appointment)
        await self._db.flush()
        return appointment
