import pytest
from fastapi import HTTPException

from app.api.rate_limit import RateLimiter


def test_allows_requests_up_to_the_limit():
    limiter = RateLimiter(max_attempts=3, window_seconds=60)
    for _ in range(3):
        limiter.check("1.2.3.4")  # should not raise


def test_rejects_the_request_over_the_limit():
    limiter = RateLimiter(max_attempts=3, window_seconds=60)
    for _ in range(3):
        limiter.check("1.2.3.4")

    with pytest.raises(HTTPException) as exc_info:
        limiter.check("1.2.3.4")
    assert exc_info.value.status_code == 429


def test_limits_are_tracked_independently_per_key():
    limiter = RateLimiter(max_attempts=1, window_seconds=60)
    limiter.check("1.2.3.4")  # uses up the only slot for this key

    limiter.check("5.6.7.8")  # a different key must not be affected


def test_window_expiry_allows_new_attempts(monkeypatch):
    limiter = RateLimiter(max_attempts=1, window_seconds=10)
    fake_time = [1000.0]
    monkeypatch.setattr("app.api.rate_limit.time.monotonic", lambda: fake_time[0])

    limiter.check("1.2.3.4")
    with pytest.raises(HTTPException):
        limiter.check("1.2.3.4")

    fake_time[0] += 11  # past the window
    limiter.check("1.2.3.4")  # should not raise
