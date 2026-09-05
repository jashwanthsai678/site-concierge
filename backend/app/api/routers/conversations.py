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
async def get_conversation_messages(
    conversation_id: int, business_id: int = Query(...), db: AsyncSession = Depends(get_db),
) -> list[MessageRead]:
    """Same trust model list_conversations above already uses — a caller-
    supplied business_id, accepted for this internal operator-only surface
    (see README). Previously this took no business_id at all, letting any
    caller read any business's full visitor transcript by guessing an id.
    """
    conversation = await db.get(Conversation, conversation_id)
    if conversation is None or conversation.business_id != business_id:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    result = await db.execute(
        select(Message).where(Message.conversation_id == conversation_id).order_by(Message.sequence_number)
    )
    return [MessageRead.model_validate(m) for m in result.scalars().all()]
