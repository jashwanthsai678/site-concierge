from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class StaffUser(Base, TimestampMixin):
    """An internal Qualeadio team member — completely separate identity
    space from Business (see StaffSession vs BusinessSession, and
    api/deps.py's get_current_staff vs get_current_business). No signup
    endpoint exists for this table on purpose: accounts are created via
    scripts/create_staff_user.py, not self-service, since anyone who can
    create one can list/edit/suspend every client business and impersonate
    them.
    """

    __tablename__ = "staff_users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    name: Mapped[str] = mapped_column(String(200))
    is_active: Mapped[bool] = mapped_column(default=True)
