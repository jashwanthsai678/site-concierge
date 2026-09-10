import asyncio
import logging

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from app.api.cors import origin_allowed
from app.api.deps import get_llm_client, get_knowledge_provider, resolve_session_business
from app.config.settings import get_settings
from app.conversation.conversation_service import ConversationService
from app.conversation.greeting_service import build_greeting
from app.conversation.turn_orchestrator import TurnOrchestrator
from app.database.session import async_session_factory
from app.models.business import Business
from app.models.conversation import Conversation, ConversationStatus
from app.voice.ws_manager import connection_manager
from app.voice.ws_protocol import ClientEventType, ClientMessage, ServerEventType

logger = logging.getLogger(__name__)

router = APIRouter()


@router.websocket("/ws/conversation/{conversation_id}")
async def conversation_ws(websocket: WebSocket, conversation_id: int) -> None:
    # Origin check happens BEFORE accept() — WebSockets have no CORS
    # preflight mechanism (see api/scoped_cors.py's docstring), so this is
    # the only place a widget embedded on an unregistered site gets turned
    # away, rather than the HTTP-layer /api/widget/* checks.
    async with async_session_factory() as db:
        conversation = await db.get(Conversation, conversation_id)
        if conversation is None:
            await websocket.close(code=4404)
            return
        business = await db.get(Business, conversation.business_id)

    if not origin_allowed(business, websocket.headers.get("origin")):
        await websocket.close(code=4403)
        return

    await connection_manager.connect_conversation(conversation_id, websocket)
    try:
        # Lenient: wait briefly for `client_ready`, but never block the
        # greeting on it — a client bug here must not prevent the "greet
        # within 2 seconds" guarantee.
        try:
            await asyncio.wait_for(websocket.receive_text(), timeout=5.0)
        except (TimeoutError, WebSocketDisconnect):
            pass

        greeting_text = build_greeting(business)

        await connection_manager.send_to_conversation(
            conversation_id, ServerEventType.GREETING, {"text": greeting_text}
        )

        idle_timeout = get_settings().conversation_idle_timeout_seconds
        while True:
            try:
                raw = await asyncio.wait_for(websocket.receive_text(), timeout=idle_timeout)
            except TimeoutError:
                await _mark_abandoned(conversation_id)
                await connection_manager.send_to_conversation(
                    conversation_id, ServerEventType.CONVERSATION_END,
                    {"reason": "timeout", "lead_id": None},
                )
                break

            try:
                client_msg = ClientMessage.model_validate_json(raw)
            except ValueError:
                logger.warning("Ignoring malformed client message on conversation %s", conversation_id)
                continue

            if client_msg.type == ClientEventType.END_CONVERSATION.value:
                await _mark_abandoned(conversation_id)
                await connection_manager.send_to_conversation(
                    conversation_id, ServerEventType.CONVERSATION_END,
                    {"reason": "visitor_left", "lead_id": None},
                )
                break

            if client_msg.type != ClientEventType.USER_UTTERANCE.value:
                continue  # heartbeat or unknown — ignore

            utterance = str(client_msg.data.get("text", "")).strip()
            if not utterance:
                continue

            max_chars = get_settings().max_utterance_chars
            if len(utterance) > max_chars:
                await connection_manager.send_to_conversation(
                    conversation_id, ServerEventType.ERROR,
                    {
                        "code": "utterance_too_long",
                        "message": f"That message is too long (max {max_chars} characters) — could you shorten it?",
                    },
                )
                continue

            await _handle_turn(conversation_id, utterance)

    except WebSocketDisconnect:
        pass
    finally:
        connection_manager.disconnect_conversation(conversation_id)


async def _mark_abandoned(conversation_id: int) -> None:
    async with async_session_factory() as db:
        conversation = await db.get(Conversation, conversation_id)
        if conversation is None or conversation.status != ConversationStatus.ACTIVE:
            return  # already COMPLETED (e.g. booking reached) — don't overwrite
        await ConversationService(db).mark_status(conversation, ConversationStatus.ABANDONED)
        await db.commit()


async def _handle_turn(conversation_id: int, utterance: str) -> None:
    async with async_session_factory() as db:
        conversation = await db.get(Conversation, conversation_id)
        if conversation is None:
            return
        business = await db.get(Business, conversation.business_id)

        orchestrator = TurnOrchestrator(db, get_llm_client(), get_knowledge_provider(), connection_manager)
        try:
            await orchestrator.handle_turn(conversation, business, utterance)
        except Exception:
            logger.exception("Turn handling failed for conversation %s", conversation_id)
            await db.rollback()
            await connection_manager.send_to_conversation(
                conversation_id, ServerEventType.ERROR,
                {"code": "turn_failed", "message": "Something went wrong on that turn — please try again."},
            )


@router.websocket("/ws/dashboard")
async def dashboard_ws(websocket: WebSocket, token: str = Query(default="")) -> None:
    """Live lead updates for ONE business's dashboard.

    Two gates, and both are needed. The origin check keeps the socket from
    being opened by an arbitrary site; the session token is what decides
    *whose* leads this connection is allowed to receive. Origin alone was
    not enough — it let any page on the app's own origin subscribe to every
    business's lead PII, which is exactly what a logged-in client's browser
    is. The token rides in a query param because browsers cannot set an
    Authorization header on a WebSocket handshake.
    """
    origin = websocket.headers.get("origin")
    if origin not in get_settings().cors_origins:
        await websocket.close(code=4403)
        return

    if not token:
        await websocket.close(code=4401)
        return

    async with async_session_factory() as db:
        business = await resolve_session_business(db, token)
    if business is None:
        await websocket.close(code=4401)
        return
    business_id = business.id

    await connection_manager.connect_dashboard(business_id, websocket)
    try:
        while True:
            await websocket.receive_text()  # dashboard is receive-only; drain and ignore
    except WebSocketDisconnect:
        pass
    finally:
        connection_manager.disconnect_dashboard(business_id, websocket)
