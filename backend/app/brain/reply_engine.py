from collections.abc import AsyncIterator

from app.brain.interfaces import LLMClient
from app.brain.prompt_builder import build_messages
from app.brain.stage_strategy import LeadFields
from app.models.business import Business
from app.models.conversation import Message, Stage


def generate_reply(
    llm_client: LLMClient,
    *,
    business: Business,
    stage: Stage,
    knowledge_context: str,
    known_fields: LeadFields,
    history: list[Message],
    utterance: str,
) -> AsyncIterator[str]:
    """Streams the visitor-facing reply. Deliberately takes only plain,
    already-fetched arguments (no `db: AsyncSession`) — this function has no
    way to write to the database even by accident, which is what makes it
    safe to run concurrently with brain/extraction_engine.py's write path
    (see conversation/turn_orchestrator.py for the concurrency design).
    `known_fields` is a plain snapshot for the same reason, not a live Lead.
    """
    messages = build_messages(
        business=business,
        stage=stage,
        knowledge_context=knowledge_context,
        known_fields=known_fields,
        history=history,
        utterance=utterance,
    )
    return llm_client.chat_stream(messages)
