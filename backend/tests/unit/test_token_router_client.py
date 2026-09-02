import httpx
import pytest

from app.brain.token_router_client import TokenRouterClient
from app.config.settings import Settings


def _settings() -> Settings:
    return Settings(token_router_api_key="test-key", token_router_model="test-model")


def _patch_transport(monkeypatch, handler) -> None:
    """TokenRouterClient constructs a fresh httpx.AsyncClient per call with
    no injectable transport — the least invasive way to test its retry
    behavior without changing the production code is to make every
    httpx.AsyncClient() built during the test use a MockTransport instead
    of hitting the network.
    """
    transport = httpx.MockTransport(handler)
    real_async_client = httpx.AsyncClient

    def fake_async_client(*args, **kwargs):
        kwargs["transport"] = transport
        return real_async_client(*args, **kwargs)

    monkeypatch.setattr(httpx, "AsyncClient", fake_async_client)


def _success_response(content: str = "ok") -> httpx.Response:
    return httpx.Response(
        200,
        json={"choices": [{"message": {"content": content}}], "usage": {"total_tokens": 42}},
    )


async def test_chat_retries_a_503_then_succeeds(monkeypatch):
    attempts = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        attempts["n"] += 1
        if attempts["n"] < 2:
            return httpx.Response(503)
        return _success_response()

    _patch_transport(monkeypatch, handler)
    client = TokenRouterClient(_settings())

    result = await client.chat([{"role": "user", "content": "hi"}])

    assert result["content"] == "ok"
    assert result["usage"] == {"total_tokens": 42}
    assert attempts["n"] == 2


async def test_chat_gives_up_after_max_attempts(monkeypatch):
    attempts = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        attempts["n"] += 1
        return httpx.Response(503)

    _patch_transport(monkeypatch, handler)
    client = TokenRouterClient(_settings())

    with pytest.raises(httpx.HTTPStatusError):
        await client.chat([{"role": "user", "content": "hi"}])
    assert attempts["n"] == 3  # _MAX_ATTEMPTS


async def test_chat_does_not_retry_a_4xx(monkeypatch):
    attempts = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        attempts["n"] += 1
        return httpx.Response(400, json={"error": "bad request"})

    _patch_transport(monkeypatch, handler)
    client = TokenRouterClient(_settings())

    with pytest.raises(httpx.HTTPStatusError):
        await client.chat([{"role": "user", "content": "hi"}])
    assert attempts["n"] == 1  # no retry — a 4xx won't fix itself


def _sse_success_body() -> bytes:
    return (
        b'data: {"choices": [{"delta": {"content": "Hello "}}]}\n\n'
        b'data: {"choices": [{"delta": {"content": "world"}}]}\n\n'
        b"data: [DONE]\n\n"
    )


async def test_chat_stream_retries_before_any_content_yielded(monkeypatch):
    attempts = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        attempts["n"] += 1
        if attempts["n"] < 2:
            return httpx.Response(503)
        return httpx.Response(200, content=_sse_success_body())

    _patch_transport(monkeypatch, handler)
    client = TokenRouterClient(_settings())

    deltas = [delta async for delta in client.chat_stream([{"role": "user", "content": "hi"}])]

    assert "".join(deltas) == "Hello world"
    assert attempts["n"] == 2


async def test_chat_stream_does_not_retry_once_content_has_streamed(monkeypatch):
    """A connection dropping mid-stream must raise, not retry from
    scratch — retrying here would re-run the whole reply and duplicate
    whatever was already spoken/displayed.
    """
    attempts = {"n": 0}

    class _RaisingStream(httpx.AsyncByteStream):
        async def __aiter__(self):
            yield b'data: {"choices": [{"delta": {"content": "Hello "}}]}\n\n'
            raise httpx.ReadError("connection dropped")

    def raising_handler(request: httpx.Request) -> httpx.Response:
        attempts["n"] += 1
        return httpx.Response(200, stream=_RaisingStream())

    _patch_transport(monkeypatch, raising_handler)
    client = TokenRouterClient(_settings())

    received = []
    with pytest.raises(httpx.ReadError):
        async for delta in client.chat_stream([{"role": "user", "content": "hi"}]):
            received.append(delta)

    assert received == ["Hello "]
    assert attempts["n"] == 1  # no retry attempted after content was yielded
