import logging

from app.brain.interfaces import LLMClient

logger = logging.getLogger(__name__)


async def warm_up(llm_client: LLMClient) -> None:
    """Fired once from main.py's lifespan on startup so the FIRST real
    visitor conversation doesn't eat the ~8.4s cold-model-load penalty —
    that penalty is paid once, here, before anyone is watching.
    """
    try:
        await llm_client.chat([{"role": "user", "content": "Hello"}])
        logger.info("Ollama model warm-up complete.")
    except Exception:
        logger.exception("Ollama warm-up call failed — model may not be resident yet.")
