import enum

from sqlalchemy import Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class LeadCategory(str, enum.Enum):
    HOT = "Hot"
    WARM = "Warm"
    COLD = "Cold"


class LeadStatus(str, enum.Enum):
    NEW = "new"
    CONTACTED = "contacted"
    QUALIFIED = "qualified"
    BOOKED = "booked"
    LOST = "lost"


class Lead(Base, TimestampMixin):
    """One lead per conversation, progressively filled in by
    brain/extraction_engine.py after every user turn. All contact/qualifying
    fields are nullable because they arrive incrementally.
    """

    __tablename__ = "leads"

    id: Mapped[int] = mapped_column(primary_key=True)
    conversation_id: Mapped[int] = mapped_column(ForeignKey("conversations.id"), unique=True, index=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.id"), index=True)

    name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(40), nullable=True)
    email: Mapped[str | None] = mapped_column(String(200), nullable=True)
    budget: Mapped[str | None] = mapped_column(String(120), nullable=True)
    location: Mapped[str | None] = mapped_column(String(200), nullable=True)
    intent: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Proposed by the LLM extraction call, then clamped/validated — see
    # schemas/lead_extraction.py. `category` is NEVER taken from the model;
    # it is always computed deterministically by crm/scoring.py::categorize().
    intent_score: Mapped[int] = mapped_column(Integer, default=0)
    lead_score: Mapped[int] = mapped_column(Integer, default=0)
    category: Mapped[LeadCategory] = mapped_column(Enum(LeadCategory), default=LeadCategory.COLD)

    summary: Mapped[str] = mapped_column(Text, default="")
    next_action: Mapped[str] = mapped_column(String(300), default="")
    status: Mapped[LeadStatus] = mapped_column(Enum(LeadStatus), default=LeadStatus.NEW)
