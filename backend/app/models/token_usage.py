from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class TokenUsageLog(Base, TimestampMixin):
    """One row per LLM call — the cost-visibility layer that didn't exist
    before ("you can't optimize what you can't see"). `call_type`
    distinguishes the two calls turn_orchestrator.py fires per turn:
    "extraction" token counts are exact (TokenRouter reports them in the
    response); "reply" counts are `is_estimated=True` (~4 chars/token on the
    streamed text) since the streaming response never reliably carries a
    `usage` field the way the non-streaming one does, and tracking it
    precisely would need shared mutable state across the two concurrent
    calls in a turn — not worth the race-condition risk for an estimate.
    """

    __tablename__ = "token_usage_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.id"), index=True)
    conversation_id: Mapped[int | None] = mapped_column(ForeignKey("conversations.id"), nullable=True, index=True)
    call_type: Mapped[str] = mapped_column(String(20))
    prompt_tokens: Mapped[int] = mapped_column(default=0)
    completion_tokens: Mapped[int] = mapped_column(default=0)
    total_tokens: Mapped[int] = mapped_column(default=0)
    is_estimated: Mapped[bool] = mapped_column(default=False)
