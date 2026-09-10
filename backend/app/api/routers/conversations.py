from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_business, get_db
from app.models.business import Business
from app.models.conversation import Conversation, Message
from app.schemas.conversation import ConversationRead, MessageRead

router = APIRouter(prefix="/api/conversations", tags=["conversations"])

# Scoped to the session's own business — see the note in leads.py for why a
# caller-supplied business_id was not good enough here. Transcripts are the
# most sensitive thing in this database: they contain whatever a visitor
# volunteered out loud, verbatim.


@router.get("", response_model=list[ConversationRead])
async def list_conversations(
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    business: Business = Depends(get_current_business),
    db: AsyncSession = Depends(get_db),
) -> list[ConversationRead]:
    result = await db.execute(
        select(Conversation)
        .where(Conversation.business_id == business.id)
        .order_by(Conversation.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return [ConversationRead.model_validate(c) for c in result.scalars().all()]


@router.get("/{conversation_id}/messages", response_model=list[MessageRead])
async def get_conversation_messages(
    conversation_id: int,
    business: Business = Depends(get_current_business),
    db: AsyncSession = Depends(get_db),
) -> list[MessageRead]:
    conversation = await db.get(Conversation, conversation_id)
    if conversation is None or conversation.business_id != business.id:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    result = await db.execute(
        select(Message).where(Message.conversation_id == conversation_id).order_by(Message.sequence_number)
    )
    return [MessageRead.model_validate(m) for m in result.scalars().all()]
