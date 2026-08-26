import enum

from sqlalchemy import Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class AppointmentStatus(str, enum.Enum):
    PROPOSED = "proposed"
    CONFIRMED = "confirmed"


class Appointment(Base, TimestampMixin):
    """A lightweight booking artifact. Deliberately does NOT parse
    `requested_datetime_text` into a real datetime/timezone — that's
    calendar-integration territory, explicitly out of scope for this MVP.
    `CONFIRMED` means "the AI said it would follow up", not a synced event.
    """

    __tablename__ = "appointments"

    id: Mapped[int] = mapped_column(primary_key=True)
    lead_id: Mapped[int] = mapped_column(ForeignKey("leads.id"), index=True)
    conversation_id: Mapped[int] = mapped_column(ForeignKey("conversations.id"), index=True)
    requested_datetime_text: Mapped[str] = mapped_column(String(200))
    status: Mapped[AppointmentStatus] = mapped_column(Enum(AppointmentStatus), default=AppointmentStatus.PROPOSED)
