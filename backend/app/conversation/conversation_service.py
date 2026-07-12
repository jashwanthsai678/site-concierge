from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.settings import get_settings
from app.models.base import utcnow
from app.models.conversation import Conversation, ConversationStatus, Message, MessageRole, Stage


class ConversationService:
    def __init__(self, db: AsyncSession):
        self._db = db

    async def create(self, *, visitor_id: int, business_id: int) -> Conversation:
        conversation = Conversation(visitor_id=visitor_id, business_id=business_id)
        self._db.add(conversation)
        await self._db.flush()
        return conversation

    async def get(self, conversation_id: int) -> Conversation | None:
        return await self._db.get(Conversation, conversation_id)

    async def append_message(self, conversation_id: int, role: MessageRole, content: str) -> Message:
        next_seq = await self._next_sequence_number(conversation_id)
        message = Message(
            conversation_id=conversation_id,
            role=role,
            content=content,
            sequence_number=next_seq,
        )
        self._db.add(message)
        await self._db.flush()
        return message

    async def get_windowed_history(self, conversation_id: int, *, window: int | None = None) -> list[Message]:
        window = window or get_settings().conversation_history_window
        result = await self._db.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.sequence_number.desc())
            .limit(window)
        )
        messages = list(result.scalars().all())
        messages.reverse()
        return messages

    async def increment_turn_count(self, conversation: Conversation) -> None:
        conversation.turn_count += 1
        await self._db.flush()

    async def update_stage(self, conversation: Conversation, stage: Stage) -> None:
        conversation.current_stage = stage
        await self._db.flush()

    async def mark_status(self, conversation: Conversation, status: ConversationStatus) -> None:
        conversation.status = status
        if status != ConversationStatus.ACTIVE and conversation.ended_at is None:
            conversation.ended_at = utcnow()
        await self._db.flush()

    async def record_extraction_failure(self, conversation: Conversation) -> None:
        conversation.extraction_failure_count += 1
        if conversation.extraction_failure_count >= 3:
            import logging

            logging.getLogger(__name__).error(
                "Conversation %s has had %d extraction failures — possible systemic prompt/model issue.",
                conversation.id, conversation.extraction_failure_count,
            )
        await self._db.flush()

    async def _next_sequence_number(self, conversation_id: int) -> int:
        result = await self._db.execute(
            select(func.coalesce(func.max(Message.sequence_number), -1)).where(
                Message.conversation_id == conversation_id
            )
        )
        return result.scalar_one() + 1
