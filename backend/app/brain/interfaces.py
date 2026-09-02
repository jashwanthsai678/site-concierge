from abc import ABC, abstractmethod
from collections.abc import AsyncIterator


class LLMClient(ABC):
    """The one seam between `brain/` and any concrete LLM provider. Swapping
    providers means implementing this interface only — conversation/, crm/,
    and knowledge/ never import an LLM SDK directly.
    """

    @abstractmethod
    async def chat(self, messages: list[dict], *, json_mode: bool = False) -> dict:
        """Non-streaming chat call. Returns
        `{"content": str, "thinking": str | None, "usage": dict | None}` —
        `usage` (prompt/completion/total token counts) is provider-reported
        and may be `None` if the provider doesn't return one."""

    @abstractmethod
    def chat_stream(self, messages: list[dict]) -> AsyncIterator[str]:
        """Streaming chat call. Yields content deltas as they arrive
        (chain-of-thought/"thinking" tokens are never yielded)."""

    @abstractmethod
    async def is_healthy(self) -> bool:
        """Fires a trivial real chat call to confirm the model is loaded and
        responsive — not just that the provider's URL is reachable."""
