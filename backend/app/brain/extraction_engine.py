import logging

from pydantic import ValidationError

from app.brain.interfaces import LLMClient
from app.models.conversation import Message, MessageRole
from app.schemas.lead_extraction import LeadExtraction
from app.utils.json_extraction import extract_json_object

logger = logging.getLogger(__name__)

_ROLE_MAP = {MessageRole.USER: "user", MessageRole.ASSISTANT: "assistant"}

_EXTRACTION_SYSTEM_PROMPT = """You are a silent data-extraction assistant working alongside a sales \
conversation. You do not speak to the visitor. Given the conversation so far, extract what is known \
about the visitor and output ONLY a single JSON object with exactly these keys:

name, phone, email, budget, location, intent (each: string, or null if not yet mentioned anywhere in \
the conversation), intent_score (0-100 integer: how clearly the visitor has expressed genuine intent), \
lead_score (0-100 integer: overall sales-readiness of this lead right now), summary (one or two \
sentence summary of the conversation so far), next_action (a short recommended next step, e.g. \
"Schedule call", "Send pricing", "Follow up in 2 days").

Output ONLY the JSON object. No markdown fences, no explanation, no other text."""

_RETRY_NUDGE = "Reminder: respond with ONLY the JSON object described above, nothing else."

# Extraction only needs enough context to catch what's NEW this turn — it
# doesn't need the same 8-message window the conversational reply does
# (that's genuinely needed for coherence; extraction just needs recency).
# This runs on every turn, concurrently with the reply, so trimming it
# directly reduces how fast a conversation burns through Groq's shared
# per-minute token budget as history grows — the actual mechanism behind
# "long conversations stop working."
_EXTRACTION_HISTORY_MESSAGES = 4


async def extract(
    llm_client: LLMClient, *, history: list[Message], utterance: str,
) -> tuple[LeadExtraction, bool, dict | None]:
    """Runs the structured-extraction LLM call and defensively parses its
    output. Never raises. Returns `(extraction, ok, usage)`: `ok=False`
    means total parse failure after one retry — the caller (turn_orchestrator)
    should skip publishing a `lead_update` for this turn and count the
    failure, rather than confusing "genuinely nothing new said" with
    "extraction broke", which look identical in the LeadExtraction value
    alone. The conversational reply path is entirely independent, so a bad
    extraction never breaks the visitor's turn, only dashboard freshness for
    that turn. `usage` is whichever call actually ran last — tokens were
    spent on it either way, parse failure or not.
    """
    messages = _build_messages(history, utterance)

    content, usage = await _call_and_get_content(llm_client, messages)
    parsed = _parse(content)
    if parsed is not None:
        return parsed, True, usage

    logger.warning("Extraction JSON parse failed, retrying once. Raw content: %r", content[:300])
    retry_messages = [*messages, {"role": "user", "content": _RETRY_NUDGE}]
    content, usage = await _call_and_get_content(llm_client, retry_messages)
    parsed = _parse(content)
    if parsed is not None:
        return parsed, True, usage

    logger.warning("Extraction JSON parse failed after retry. Raw content: %r", content[:300])
    return LeadExtraction(), False, usage


def _build_messages(history: list[Message], utterance: str) -> list[dict]:
    messages: list[dict] = [{"role": "system", "content": _EXTRACTION_SYSTEM_PROMPT}]
    for m in history[-_EXTRACTION_HISTORY_MESSAGES:]:
        messages.append({"role": _ROLE_MAP[m.role], "content": m.content})
    messages.append({"role": "user", "content": utterance})
    return messages


async def _call_and_get_content(llm_client: LLMClient, messages: list[dict]) -> tuple[str, dict | None]:
    message = await llm_client.chat(messages, json_mode=True)
    return message.get("content", ""), message.get("usage")


def _parse(content: str) -> LeadExtraction | None:
    try:
        return LeadExtraction.model_validate_json(content)
    except ValidationError:
        pass

    recovered = extract_json_object(content)
    if recovered is None:
        return None
    try:
        return LeadExtraction.model_validate(recovered)
    except ValidationError:
        return None
