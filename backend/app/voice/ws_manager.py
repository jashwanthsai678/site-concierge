import logging

from fastapi import WebSocket

from app.voice.ws_protocol import ServerEventType, make_envelope

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Tracks active WebSocket connections: one per live conversation, plus a
    set of dashboard subscribers. The same manager fans out `lead_update`
    events to both — this (not polling) is what makes a new lead appear
    "instantly" on the dashboard.
    """

    def __init__(self) -> None:
        self._conversation_sockets: dict[int, WebSocket] = {}
        self._conversation_seq: dict[int, int] = {}
        # Keyed by business_id, NOT a flat set. As one set, every dashboard
        # socket received every business's lead updates — full name, phone,
        # email, budget — and the only thing hiding another tenant's leads
        # was a client-side `if` in the browser that had already been handed
        # the data. Scoping the fan-out here is the actual fix.
        self._dashboard_sockets: dict[int, set[WebSocket]] = {}

    async def connect_conversation(self, conversation_id: int, websocket: WebSocket) -> None:
        await websocket.accept()
        self._conversation_sockets[conversation_id] = websocket
        self._conversation_seq[conversation_id] = 0

    def disconnect_conversation(self, conversation_id: int) -> None:
        self._conversation_sockets.pop(conversation_id, None)
        self._conversation_seq.pop(conversation_id, None)

    async def send_to_conversation(self, conversation_id: int, event_type: ServerEventType, data: dict) -> None:
        """Never raises. A client disconnecting mid-turn must not turn into
        an exception that unwinds the caller's DB transaction — see
        conversation/turn_orchestrator.py, which commits its writes before
        attempting any of these sends specifically to avoid that coupling;
        this is the second line of defense.
        """
        ws = self._conversation_sockets.get(conversation_id)
        if ws is None:
            return
        seq = self._conversation_seq.get(conversation_id, 0)
        self._conversation_seq[conversation_id] = seq + 1
        try:
            await ws.send_json(make_envelope(event_type, data, seq))
        except Exception:
            logger.info("Dropping send to disconnected conversation %s socket.", conversation_id)
            self.disconnect_conversation(conversation_id)

    async def connect_dashboard(self, business_id: int, websocket: WebSocket) -> None:
        await websocket.accept()
        self._dashboard_sockets.setdefault(business_id, set()).add(websocket)

    def disconnect_dashboard(self, business_id: int, websocket: WebSocket) -> None:
        sockets = self._dashboard_sockets.get(business_id)
        if sockets is None:
            return
        sockets.discard(websocket)
        if not sockets:
            del self._dashboard_sockets[business_id]

    async def broadcast_dashboard(self, business_id: int, event_type: ServerEventType, data: dict) -> None:
        """Fans out to the dashboards of ONE business. Callers must pass the
        business the event belongs to — there is deliberately no "send to
        everyone" variant, so a future caller can't reintroduce the leak by
        forgetting to scope.
        """
        dead: list[WebSocket] = []
        for ws in list(self._dashboard_sockets.get(business_id, ())):
            try:
                await ws.send_json(make_envelope(event_type, data, 0))
            except Exception:
                logger.info("Dropping dead dashboard socket during broadcast.")
                dead.append(ws)
        for ws in dead:
            self.disconnect_dashboard(business_id, ws)


connection_manager = ConnectionManager()
