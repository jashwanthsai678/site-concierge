from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class StaffSession(Base, TimestampMixin):
    """Opaque bearer token for a logged-in StaffUser — same pattern as
    BusinessSession, kept as a fully separate table/token space so a staff
    token and a business token are never interchangeable even by accident.
    """

    __tablename__ = "staff_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    staff_user_id: Mapped[int] = mapped_column(ForeignKey("staff_users.id"), index=True)
    token: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
