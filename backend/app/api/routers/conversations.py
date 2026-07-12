from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models.conversation import Conversation, Message
from app.schemas.conversation import ConversationRead, MessageRead

router = APIRouter(prefix="/api/conversations", tags=["conversations"])


@router.get("", response_model=list[ConversationRead])
async def list_conversations(
    business_id: int = Query(...),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> list[ConversationRead]:
    result = await db.execute(
        select(Conversation)
        .where(Conversation.business_id == business_id)
        .order_by(Conversation.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return [ConversationRead.model_validate(c) for c in result.scalars().all()]


@router.get("/{conversation_id}/messages", response_model=list[MessageRead])
async def get_conversation_messages(conversation_id: int, db: AsyncSession = Depends(get_db)) -> list[MessageRead]:
    conversation = await db.get(Conversation, conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    result = await db.execute(
        select(Message).where(Message.conversation_id == conversation_id).order_by(Message.sequence_number)
    )
    return [MessageRead.model_validate(m) for m in result.scalars().all()]
