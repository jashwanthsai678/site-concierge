import asyncio
import json
import logging
from collections.abc import AsyncIterator

import httpx

from app.brain.interfaces import LLMClient
from app.config.settings import Settings

logger = logging.getLogger(__name__)

# Groq occasionally returns a transient 5xx under load, same as any hosted
# inference API — retried here, not left to the caller, since every caller
# would otherwise need to reimplement the same retry/backoff policy.
_MAX_ATTEMPTS = 3
_RETRY_BACKOFF_SECONDS = 0.5
_RETRYABLE_STATUS_CODES = {500, 502, 503, 504}

# Reasoning models (the gpt-oss family on Groq's free tier) spend tokens on
# hidden chain-of-thought before ever producing visible content — measured
# live against this account: an unconstrained call to a plain "hi" burned
# 20-100+ reasoning tokens on top of the actual reply, none of which the
# visitor ever sees. "low" cut that to single digits in the same test with
# no loss of reply quality, and it's the single biggest lever against this
# account's 8,000-tokens/minute free-tier cap (a turn fires two concurrent
# calls — reply + extraction — so burning tokens on invisible reasoning
# doubles the damage). `max_tokens` is a second, independent lever: nothing
# here ever needs more than a short sales reply or a small JSON object, but
# without a cap a reasoning model is free to run arbitrarily long and can
# exhaust the same per-minute budget on a single unlucky turn.
_REASONING_EFFORT = "low"
_MAX_COMPLETION_TOKENS = 400


def _is_retryable(exc: Exception) -> bool:
    if isinstance(exc, httpx.HTTPStatusError):
        return exc.response.status_code in _RETRYABLE_STATUS_CODES
    # ConnectError/ConnectTimeout/ReadTimeout/etc. — genuinely transient
    # network issues, as opposed to a 4xx which retrying can't fix.
    return isinstance(exc, httpx.TransportError)


class GroqClient(LLMClient):
    """Async wrapper around Groq's OpenAI-compatible /chat/completions
    endpoint (https://api.groq.com/openai/v1) — used via plain httpx rather
    than the official `groq` SDK so this stays a thin implementation of
    LLMClient like every other provider, with no extra dependency. The wire
    format below (messages array, `response_format` for JSON mode, SSE
    `data: ...` lines for streaming) is the standard OpenAI Chat Completions
    spec, which is exactly what Groq speaks.
    """

    def __init__(self, settings: Settings):
        self._base_url = settings.groq_base_url.rstrip("/")
        self._api_key = settings.groq_api_key
        self._model = settings.groq_model
        self._timeout = settings.groq_request_timeout_seconds

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
            "reasoning_effort": _REASONING_EFFORT,
            "max_completion_tokens": _MAX_COMPLETION_TOKENS,
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
                    "Groq chat() attempt %d/%d failed (%s), retrying...", attempt, _MAX_ATTEMPTS, exc,
                )
                await asyncio.sleep(_RETRY_BACKOFF_SECONDS * attempt)
        raise AssertionError("unreachable")  # loop always returns or raises

    async def chat_stream(self, messages: list[dict]) -> AsyncIterator[str]:
        payload = {
            "model": self._model,
            "messages": messages,
            "stream": True,
            "reasoning_effort": _REASONING_EFFORT,
            "max_completion_tokens": _MAX_COMPLETION_TOKENS,
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
                                logger.warning("Skipping malformed Groq stream line: %r", line[:200])
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
                    "Groq chat_stream() attempt %d/%d failed before any content streamed (%s), retrying...",
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
            logger.warning("Groq health check failed: %s", exc)
            return False
