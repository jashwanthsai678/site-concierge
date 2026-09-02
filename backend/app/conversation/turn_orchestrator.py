import asyncio

from sqlalchemy.ext.asyncio import AsyncSession

from app.brain import extraction_engine
from app.brain.interfaces import LLMClient
from app.brain.reply_engine import generate_reply
from app.brain.stage_strategy import LeadFields, compute_stage
from app.conversation.conversation_service import ConversationService
from app.crm.appointment_service import AppointmentService
from app.crm.lead_service import LeadService
from app.knowledge.interfaces import KnowledgeProvider
from app.models.business import Business
from app.models.conversation import Conversation, ConversationStatus, Message, MessageRole, Stage
from app.models.token_usage import TokenUsageLog
from app.utils.text import split_first_sentence
from app.voice.ws_manager import ConnectionManager
from app.voice.ws_protocol import ServerEventType


class TurnOrchestrator:
    """The concurrency/consistency core of one visitor turn.

    Sole-writer discipline: `brain.extraction_engine` (via `LeadService`) is
    the ONLY writer of Lead state for a turn. `_stream_reply` reads a plain
    `LeadFields` SNAPSHOT taken before the `gather` below — never a `Lead`
    ORM instance or a `db` handle — so it is structurally incapable of
    writing, not just conventionally forbidden from it. The reply is
    generated against the PREVIOUS turn's fields/stage (not this turn's),
    which is what lets `asyncio.gather` give wall-clock `max(t1,t2)` instead
    of `t1+t2` — see brain/reply_engine.py's docstring for the accepted
    trade-off this implies.
    """

    def __init__(
        self,
        db: AsyncSession,
        llm_client: LLMClient,
        knowledge_provider: KnowledgeProvider,
        connection_manager: ConnectionManager,
    ):
        self._db = db
        self._llm_client = llm_client
        self._knowledge_provider = knowledge_provider
        self._connections = connection_manager
        self._conversations = ConversationService(db)
        self._leads = LeadService(db)
        self._appointments = AppointmentService(db)

    async def handle_turn(self, conversation: Conversation, business: Business, utterance: str) -> None:
        stage_for_reply = conversation.current_stage

        await self._conversations.append_message(conversation.id, MessageRole.USER, utterance)
        await self._conversations.increment_turn_count(conversation)

        # Snapshot of what's already known BEFORE this turn's extraction
        # runs — passed to the reply prompt as a plain dataclass (never the
        # ORM `Lead` or a db handle), which is what lets the model be told
        # explicitly "here's what you already know" instead of having to
        # infer it by re-reading the raw transcript (which small models do
        # unreliably and is what was causing repeated re-asked questions).
        existing_lead = await self._leads.get_or_create(conversation_id=conversation.id, business_id=business.id)
        known_fields = LeadFields(
            name=existing_lead.name, phone=existing_lead.phone, email=existing_lead.email,
            budget=existing_lead.budget, location=existing_lead.location, intent=existing_lead.intent,
        )

        history = await self._conversations.get_windowed_history(conversation.id)
        knowledge_context = await self._knowledge_provider.get_context(self._db, business.id, utterance)

        reply_text, (extraction, extraction_ok, extraction_usage) = await asyncio.gather(
            self._stream_reply(
                conversation.id, business, stage_for_reply, knowledge_context, known_fields, history, utterance,
            ),
            extraction_engine.extract(self._llm_client, history=history, utterance=utterance),
        )

        await self._conversations.append_message(conversation.id, MessageRole.ASSISTANT, reply_text)
        # Staged here (not committed) so it rides along with whichever
        # commit happens next below — tokens were spent on both calls
        # regardless of which branch (extraction-failure or success) runs.
        self._record_usage(business.id, conversation.id, "reply", estimated_tokens=len(reply_text) // 4)
        self._record_usage(business.id, conversation.id, "extraction", usage=extraction_usage)

        # --- All DB writes for this turn happen above/below this line, and
        # are committed BEFORE any further websocket notification is sent.
        # `send_to_conversation`/`broadcast_dashboard` are best-effort and
        # never raise, but keeping writes strictly ahead of sends means a
        # disconnected client can never cause an in-flight write to be
        # rolled back by the router's outer exception handler. ---

        if not extraction_ok:
            await self._conversations.record_extraction_failure(conversation)
            await self._db.commit()
            await self._connections.send_to_conversation(
                conversation.id, ServerEventType.ASSISTANT_DONE,
                {"full_text": reply_text, "stage": stage_for_reply.value},
            )
            return

        lead = await self._leads.record_extraction(
            conversation_id=conversation.id, business_id=business.id, extraction=extraction,
        )

        new_fields = LeadFields(
            name=lead.name, phone=lead.phone, email=lead.email,
            budget=lead.budget, location=lead.location, intent=lead.intent,
        )
        old_stage = conversation.current_stage
        new_stage = compute_stage(
            new_fields,
            turn_count=conversation.turn_count,
            last_user_message=utterance,
            current_stage=old_stage,
        )
        stage_changed = new_stage != old_stage
        if stage_changed:
            await self._conversations.update_stage(conversation, new_stage)

        if new_stage == Stage.BOOKING:
            await self._appointments.create_if_absent(
                lead_id=lead.id, conversation_id=conversation.id, requested_datetime_text=utterance,
            )
        reached_booking_this_turn = stage_changed and new_stage == Stage.BOOKING
        if reached_booking_this_turn:
            await self._conversations.mark_status(conversation, ConversationStatus.COMPLETED)

        await self._db.commit()

        # --- Everything below is best-effort notification only. ---

        await self._connections.send_to_conversation(
            conversation.id, ServerEventType.ASSISTANT_DONE,
            {"full_text": reply_text, "stage": stage_for_reply.value},
        )

        lead_payload = {
            "fields": {
                "name": lead.name, "phone": lead.phone, "email": lead.email,
                "budget": lead.budget, "location": lead.location, "intent": lead.intent,
            },
            "intent_score": lead.intent_score,
            "lead_score": lead.lead_score,
            "category": lead.category.value,
            "stage": new_stage.value,
        }
        await self._connections.send_to_conversation(conversation.id, ServerEventType.LEAD_UPDATE, lead_payload)
        await self._connections.broadcast_dashboard(
            ServerEventType.LEAD_UPDATE,
            {**lead_payload, "lead_id": lead.id, "business_id": business.id, "conversation_id": conversation.id},
        )

        if stage_changed:
            await self._connections.send_to_conversation(
                conversation.id, ServerEventType.STAGE_CHANGE,
                {"from_stage": old_stage.value, "to_stage": new_stage.value},
            )

        if reached_booking_this_turn:
            await self._connections.send_to_conversation(
                conversation.id, ServerEventType.CONVERSATION_END,
                {"reason": "completed", "lead_id": lead.id},
            )

    async def _stream_reply(
        self,
        conversation_id: int,
        business: Business,
        stage: Stage,
        knowledge_context: str,
        known_fields: LeadFields,
        history: list[Message],
        utterance: str,
    ) -> str:
        buffer = ""
        full_text = ""
        chunk_index = 0

        async for delta in generate_reply(
            self._llm_client, business=business, stage=stage, knowledge_context=knowledge_context,
            known_fields=known_fields, history=history, utterance=utterance,
        ):
            buffer += delta
            full_text += delta
            split = split_first_sentence(buffer)
            while split is not None:
                sentence, buffer = split
                await self._connections.send_to_conversation(
                    conversation_id, ServerEventType.ASSISTANT_CHUNK,
                    {"text": sentence, "chunk_index": chunk_index, "is_sentence_boundary": True},
                )
                chunk_index += 1
                split = split_first_sentence(buffer)

        if buffer.strip():
            await self._connections.send_to_conversation(
                conversation_id, ServerEventType.ASSISTANT_CHUNK,
                {"text": buffer, "chunk_index": chunk_index, "is_sentence_boundary": False},
            )

        return full_text

    def _record_usage(
        self,
        business_id: int,
        conversation_id: int,
        call_type: str,
        *,
        usage: dict | None = None,
        estimated_tokens: int | None = None,
    ) -> None:
        """Stages a TokenUsageLog row (never commits — rides along with
        whichever commit the caller does next). `usage` (exact, provider-
        reported) takes priority; `estimated_tokens` (a ~4-chars/token
        guess) is the fallback for the streamed reply call, which never
        reliably carries a `usage` field the way the non-streaming
        extraction call does.
        """
        if usage:
            self._db.add(TokenUsageLog(
                business_id=business_id, conversation_id=conversation_id, call_type=call_type,
                prompt_tokens=usage.get("prompt_tokens") or 0,
                completion_tokens=usage.get("completion_tokens") or 0,
                total_tokens=usage.get("total_tokens") or 0,
                is_estimated=False,
            ))
        elif estimated_tokens is not None:
            self._db.add(TokenUsageLog(
                business_id=business_id, conversation_id=conversation_id, call_type=call_type,
                completion_tokens=estimated_tokens, total_tokens=estimated_tokens, is_estimated=True,
            ))
