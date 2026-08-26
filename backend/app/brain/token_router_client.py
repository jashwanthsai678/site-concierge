import json
import logging
from collections.abc import AsyncIterator

import httpx

from app.brain.interfaces import LLMClient
from app.config.settings import Settings

logger = logging.getLogger(__name__)


class TokenRouterClient(LLMClient):
    """Async wrapper around TokenRouter's OpenAI-compatible /chat/completions
    endpoint (https://api.tokenrouter.com/v1) — a hosted router to free/open
    models, used here in place of a locally-run Ollama model. Speaks the
    same request/response shape OpenAI's SDK uses, so the wire format below
    (messages array, `response_format` for JSON mode, SSE `data: ...` lines
    for streaming) is the OpenAI Chat Completions spec, not anything
    TokenRouter-specific.
    """

    def __init__(self, settings: Settings):
        self._base_url = settings.token_router_base_url.rstrip("/")
        self._api_key = settings.token_router_api_key
        self._model = settings.token_router_model
        self._timeout = settings.token_router_request_timeout_seconds

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }

    async def chat(self, messages: list[dict], *, json_mode: bool = False) -> dict:
        payload: dict = {
            "model": self._model,
            "messages": messages,
            "stream": False,
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.post(
                f"{self._base_url}/chat/completions", json=payload, headers=self._headers(),
            )
            response.raise_for_status()
            body = response.json()
            choices = body.get("choices") or [{}]
            message = choices[0].get("message", {})
            return {"content": message.get("content", ""), "thinking": None}

    async def chat_stream(self, messages: list[dict]) -> AsyncIterator[str]:
        payload = {
            "model": self._model,
            "messages": messages,
            "stream": True,
        }
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            async with client.stream(
                "POST", f"{self._base_url}/chat/completions", json=payload, headers=self._headers(),
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line or not line.startswith("data:"):
                        continue
                    data = line[len("data:") :].strip()
                    if data == "[DONE]":
                        break
                    try:
                        body = json.loads(data)
                    except json.JSONDecodeError:
                        logger.warning("Skipping malformed TokenRouter stream line: %r", line[:200])
                        continue
                    choices = body.get("choices") or [{}]
                    delta = choices[0].get("delta", {}).get("content", "")
                    if delta:
                        yield delta

    async def is_healthy(self) -> bool:
        try:
            message = await self.chat(
                [{"role": "user", "content": "Reply with the single word: ok"}],
            )
            return bool(message.get("content"))
        except (httpx.HTTPError, KeyError, IndexError) as exc:
            logger.warning("TokenRouter health check failed: %s", exc)
            return False
