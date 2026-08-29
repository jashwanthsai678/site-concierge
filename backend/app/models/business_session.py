from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class BusinessSession(Base, TimestampMixin):
    """A logged-in portal session for a Business. Opaque bearer token
    stored server-side (not a JWT) — the same session-token pattern
    already used for Visitor (see utils/ids.py's new_session_token), and
    trivially revocable on logout, unlike a self-contained token that would
    need a blocklist to revoke early.
    """

    __tablename__ = "business_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.id"), index=True)
    token: Mapped[str] = mapped_column(String(64), unique=True, index=True)
