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
        self._dashboard_sockets: set[WebSocket] = set()

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

    async def connect_dashboard(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self._dashboard_sockets.add(websocket)

    def disconnect_dashboard(self, websocket: WebSocket) -> None:
        self._dashboard_sockets.discard(websocket)

    async def broadcast_dashboard(self, event_type: ServerEventType, data: dict) -> None:
        dead: list[WebSocket] = []
        for ws in list(self._dashboard_sockets):
            try:
                await ws.send_json(make_envelope(event_type, data, 0))
            except Exception:
                logger.info("Dropping dead dashboard socket during broadcast.")
                dead.append(ws)
        for ws in dead:
            self._dashboard_sockets.discard(ws)


connection_manager = ConnectionManager()
