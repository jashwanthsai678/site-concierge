import logging

from app.brain.interfaces import LLMClient

logger = logging.getLogger(__name__)


async def warm_up(llm_client: LLMClient) -> None:
    """Fired once from main.py's lifespan on startup so the FIRST real
    visitor conversation isn't the request that first discovers a bad API
    key or an unreachable provider.
    """
    try:
        await llm_client.chat([{"role": "user", "content": "Hello"}])
        logger.info("LLM provider warm-up complete.")
    except Exception:
        logger.exception("LLM provider warm-up call failed.")
