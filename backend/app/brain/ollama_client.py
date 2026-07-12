import json
import logging
from collections.abc import AsyncIterator

import httpx

from app.brain.interfaces import LLMClient
from app.config.settings import Settings

logger = logging.getLogger(__name__)


class OllamaClient(LLMClient):
    """Thin async wrapper around Ollama's /api/chat endpoint.

    Empirically verified (2026-07-12, this machine): the /api/chat response
    separates `message.content` (final reply) from `message.thinking`
    (chain-of-thought) as distinct JSON fields — we simply never read
    `thinking`, no <think>-tag scrubbing needed. `keep_alive` is a per-request
    TTL refresh in Ollama, not a one-time setting, so it is threaded through
    every call here, not just the startup warm-up.
    """

    def __init__(self, settings: Settings):
        self._settings = settings
        self._base_url = settings.ollama_url.rstrip("/")
        self._model = settings.ollama_model
        self._keep_alive = settings.ollama_keep_alive
        self._timeout = settings.ollama_request_timeout_seconds

    async def chat(self, messages: list[dict], *, json_mode: bool = False) -> dict:
        payload: dict = {
            "model": self._model,
            "messages": messages,
            "stream": False,
            "keep_alive": self._keep_alive,
            # qwen3's chain-of-thought "thinking" mode adds seconds of hidden
            # reasoning tokens per call (measured: ~3.5s vs ~1.5s for a
            # trivial reply) and turn_orchestrator fires two of these calls
            # concurrently per turn — compounding thinking overhead on both
            # was blowing past ollama_request_timeout_seconds on real turns.
            "think": False,
        }
        if json_mode:
            payload["format"] = "json"

        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.post(f"{self._base_url}/api/chat", json=payload)
            response.raise_for_status()
            body = response.json()
            return body.get("message", {"content": "", "thinking": None})

    async def chat_stream(self, messages: list[dict]) -> AsyncIterator[str]:
        payload = {
            "model": self._model,
            "messages": messages,
            "stream": True,
            "keep_alive": self._keep_alive,
            "think": False,
            # This small model occasionally degenerates into repeating the
            # same sentence in a loop, observed most often on non-English
            # replies. repeat_penalty only applies here (reply generation),
            # never to the JSON extraction call, so it can't affect parsing.
            "options": {"repeat_penalty": 1.3},
        }
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            async with client.stream("POST", f"{self._base_url}/api/chat", json=payload) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line:
                        continue
                    try:
                        body = json.loads(line)
                    except json.JSONDecodeError:
                        logger.warning("Skipping malformed Ollama stream line: %r", line[:200])
                        continue
                    delta = body.get("message", {}).get("content", "")
                    if delta:
                        yield delta
                    if body.get("done"):
                        break

    async def is_healthy(self) -> bool:
        try:
            message = await self.chat(
                [{"role": "user", "content": "Reply with the single word: ok"}],
            )
            return bool(message.get("content"))
        except (httpx.HTTPError, KeyError) as exc:
            logger.warning("Ollama health check failed: %s", exc)
            return False
