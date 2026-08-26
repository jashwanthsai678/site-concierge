import enum
from datetime import datetime, timezone

from pydantic import BaseModel


class ServerEventType(str, enum.Enum):
    GREETING = "greeting"
    ASSISTANT_CHUNK = "assistant_chunk"
    ASSISTANT_DONE = "assistant_done"
    LEAD_UPDATE = "lead_update"
    STAGE_CHANGE = "stage_change"
    ERROR = "error"
    CONVERSATION_END = "conversation_end"


class ClientEventType(str, enum.Enum):
    CLIENT_READY = "client_ready"
    USER_UTTERANCE = "user_utterance"
    HEARTBEAT = "heartbeat"
    END_CONVERSATION = "end_conversation"


class ClientMessage(BaseModel):
    """Inbound envelope. `seq`/`ts` are accepted but not strictly validated
    server-side for the MVP — the server is the source of truth for its own
    outbound sequencing; the client's own seq is informational only.
    """

    type: str
    data: dict = {}


def make_envelope(event_type: ServerEventType, data: dict, seq: int) -> dict:
    return {
        "type": event_type.value,
        "data": data,
        "seq": seq,
        "ts": datetime.now(timezone.utc).isoformat(),
    }
