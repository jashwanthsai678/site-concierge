import asyncio
import json
import logging
import re
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
# 429 (rate limit) is included here too — unlike a normal 4xx that won't
# fix itself, Groq's per-minute token bucket genuinely refills, and it
# tells us exactly when via the x-ratelimit-reset-tokens response header.
# Previously this failed the whole turn immediately on any 429, which is
# most of why a real conversation would just stop working partway through
# — a short, bounded wait-and-retry here turns a fast-refilling rate limit
# into a slightly slower reply instead of a hard error.
_RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504}
# Never make a visitor wait longer than this for a single retry — if the
# reported reset time exceeds it, better to fail the turn with a clear
# "try again" message than leave the widget looking frozen.
_MAX_RATE_LIMIT_WAIT_SECONDS = 8.0
_RESET_HEADER_PATTERN = re.compile(r"^(\d+(?:\.\d+)?)s$")


def _parse_reset_seconds(value: str | None) -> float | None:
    """Parses Groq's `x-ratelimit-reset-tokens` header (e.g. "1.6s",
    "45.525s") — only the plain-seconds form; the longer "1h24m57s" form
    (seen on the requests-per-day limit, not the tokens-per-minute one
    that actually bites here) isn't handled and just falls back to the
    normal backoff.
    """
    if not value:
        return None
    match = _RESET_HEADER_PATTERN.match(value.strip())
    return float(match.group(1)) if match else None


def _compute_retry_wait(exc: Exception, attempt: int) -> float:
    if isinstance(exc, httpx.HTTPStatusError) and exc.response.status_code == 429:
        reset_seconds = _parse_reset_seconds(exc.response.headers.get("x-ratelimit-reset-tokens"))
        if reset_seconds is not None:
            return min(reset_seconds, _MAX_RATE_LIMIT_WAIT_SECONDS)
    return _RETRY_BACKOFF_SECONDS * attempt

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
# `chat()` is used for BOTH the structured JSON extraction call (name/
# phone/budget/summary/etc. — genuinely needs the room) and the health
# check, so it keeps a generous cap. `chat_stream()` is ONLY ever the
# visible conversational reply a visitor reads/hears — the prompt already
# asks for short replies, but that's a request the model doesn't reliably
# follow on its own (measured live: it happily writes 80-100+ word replies
# listing multiple pricing tiers when asked one pricing question). A real
# token ceiling is the actual enforcement mechanism, not a suggestion.
_MAX_COMPLETION_TOKENS = 400
# 90 was measured live to be too tight: reasoning-token usage varies with
# how much context is in play (full conversation history + knowledge
# context, not just the bare utterance), and a real production reply got
# cut off mid-sentence ("Are you leaning toward" — no ending) when
# reasoning ate more of the 90-token budget than a quick isolated test
# predicted. A visibly truncated reply is worse than a slightly longer
# one — 150 leaves real headroom while still being a hard ceiling far
# below the old 400 (which allowed 100+ word rambling).
_MAX_REPLY_COMPLETION_TOKENS = 150


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
                wait = _compute_retry_wait(exc, attempt)
                logger.warning(
                    "Groq chat() attempt %d/%d failed (%s), retrying in %.1fs...",
                    attempt, _MAX_ATTEMPTS, exc, wait,
                )
                await asyncio.sleep(wait)
        raise AssertionError("unreachable")  # loop always returns or raises

    async def chat_stream(self, messages: list[dict]) -> AsyncIterator[str]:
        payload = {
            "model": self._model,
            "messages": messages,
            "stream": True,
            "reasoning_effort": _REASONING_EFFORT,
            "max_completion_tokens": _MAX_REPLY_COMPLETION_TOKENS,
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
                wait = _compute_retry_wait(exc, attempt)
                logger.warning(
                    "Groq chat_stream() attempt %d/%d failed before any content streamed (%s), retrying in %.1fs...",
                    attempt, _MAX_ATTEMPTS, exc, wait,
                )
                await asyncio.sleep(wait)

    async def is_healthy(self) -> bool:
        try:
            message = await self.chat(
                [{"role": "user", "content": "Reply with the single word: ok"}],
            )
            return bool(message.get("content"))
        except (httpx.HTTPError, KeyError, IndexError) as exc:
            logger.warning("Groq health check failed: %s", exc)
            return False
