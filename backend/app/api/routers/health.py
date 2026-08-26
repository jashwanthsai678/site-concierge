from fastapi import APIRouter, Depends

from app.api.deps import get_llm_client
from app.brain.interfaces import LLMClient

router = APIRouter(prefix="/api/health", tags=["health"])


@router.get("")
async def health(llm_client: LLMClient = Depends(get_llm_client)) -> dict:
    """Checked before every demo rehearsal: a green `model_ready` means the
    provider actually returned a completion, not just that the API key/URL
    are configured.
    """
    model_ready = await llm_client.is_healthy()
    return {"status": "ok", "model_ready": model_ready}
