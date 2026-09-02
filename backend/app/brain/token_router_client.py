import asyncio
import json
import logging
from collections.abc import AsyncIterator

import httpx

from app.brain.interfaces import LLMClient
from app.config.settings import Settings

logger = logging.getLogger(__name__)

# Measured empirically against the free tier (qwen/qwen3.8-max-free): ~15-25%
# of calls fail with a transient 5xx or connection error under normal use.
# Retried here, not left to the caller, since every caller would otherwise
# need to reimplement the same retry/backoff policy.
_MAX_ATTEMPTS = 3
_RETRY_BACKOFF_SECONDS = 0.5
_RETRYABLE_STATUS_CODES = {500, 502, 503, 504}


def _is_retryable(exc: Exception) -> bool:
    if isinstance(exc, httpx.HTTPStatusError):
        return exc.response.status_code in _RETRYABLE_STATUS_CODES
    # ConnectError/ConnectTimeout/ReadTimeout/etc. — genuinely transient
    # network issues, as opposed to a 4xx which retrying can't fix.
    return isinstance(exc, httpx.TransportError)


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

        for attempt in range(1, _MAX_ATTEMPTS + 1):
            try:
                async with httpx.AsyncClient(timeout=self._timeout) as client:
                    response = await client.post(
                        f"{self._base_url}/chat/completions", json=payload, headers=self._headers(),
                    )
                    response.raise_for_status()
                    body = response.json()
                    choices = body.get("choices") or [{}]
                    message = choices[0].get("message", {})
                    return {"content": message.get("content", ""), "thinking": None, "usage": body.get("usage")}
            except Exception as exc:
                if attempt == _MAX_ATTEMPTS or not _is_retryable(exc):
                    raise
                logger.warning(
                    "TokenRouter chat() attempt %d/%d failed (%s), retrying...", attempt, _MAX_ATTEMPTS, exc,
                )
                await asyncio.sleep(_RETRY_BACKOFF_SECONDS * attempt)
        raise AssertionError("unreachable")  # loop always returns or raises

    async def chat_stream(self, messages: list[dict]) -> AsyncIterator[str]:
        payload = {
            "model": self._model,
            "messages": messages,
            "stream": True,
        }
        for attempt in range(1, _MAX_ATTEMPTS + 1):
            # Retry is only safe before the first token reaches the caller —
            # once any content has been yielded, it's already been spoken/
            # displayed, so retrying from scratch would duplicate it instead
            # of recovering from it.
            yielded_any = False
            try:
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
                                yielded_any = True
                                yield delta
                return
            except Exception as exc:
                if yielded_any or attempt == _MAX_ATTEMPTS or not _is_retryable(exc):
                    raise
                logger.warning(
                    "TokenRouter chat_stream() attempt %d/%d failed before any content streamed (%s), retrying...",
                    attempt, _MAX_ATTEMPTS, exc,
                )
                await asyncio.sleep(_RETRY_BACKOFF_SECONDS * attempt)

    async def is_healthy(self) -> bool:
        try:
            message = await self.chat(
                [{"role": "user", "content": "Reply with the single word: ok"}],
            )
            return bool(message.get("content"))
        except (httpx.HTTPError, KeyError, IndexError) as exc:
            logger.warning("TokenRouter health check failed: %s", exc)
            return False
