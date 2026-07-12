import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Stage(str, enum.Enum):
    GREETING = "greeting"
    DISCOVERY = "discovery"
    QUALIFICATION = "qualification"
    RECOMMENDATION = "recommendation"
    OBJECTION_HANDLING = "objection_handling"
    CLOSING = "closing"
    BOOKING = "booking"


class ConversationStatus(str, enum.Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    ABANDONED = "abandoned"


class MessageRole(str, enum.Enum):
    USER = "user"
    ASSISTANT = "assistant"


class Conversation(Base, TimestampMixin):
    __tablename__ = "conversations"

    id: Mapped[int] = mapped_column(primary_key=True)
    visitor_id: Mapped[int] = mapped_column(ForeignKey("visitors.id"), index=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.id"), index=True)
    current_stage: Mapped[Stage] = mapped_column(Enum(Stage), default=Stage.GREETING)
    turn_count: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[ConversationStatus] = mapped_column(Enum(ConversationStatus), default=ConversationStatus.ACTIVE)
    extraction_failure_count: Mapped[int] = mapped_column(Integer, default=0)
    # Set once, when status first leaves ACTIVE — see
    # ConversationService.mark_status. Used for "average conversation time".
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    messages: Mapped[list["Message"]] = relationship(back_populates="conversation", order_by="Message.sequence_number")


class Message(Base, TimestampMixin):
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    conversation_id: Mapped[int] = mapped_column(ForeignKey("conversations.id"), index=True)
    role: Mapped[MessageRole] = mapped_column(Enum(MessageRole))
    content: Mapped[str] = mapped_column(Text)
    # Explicit monotonic ordering key — do not rely on created_at for
    # ordering: SQLite timestamp resolution plus concurrent writes make
    # wall-clock ordering fragile for reconstructing conversation history.
    sequence_number: Mapped[int] = mapped_column(Integer)

    conversation: Mapped["Conversation"] = relationship(back_populates="messages")
