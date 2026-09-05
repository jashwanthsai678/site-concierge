import time
from collections import defaultdict

from fastapi import HTTPException, Request

# In-memory, per-process — consistent with this app's other single-instance
# state (voice/ws_manager.py's ConnectionManager, the module-level LLM
# client singleton in deps.py). Doesn't survive a restart or scale across
# multiple workers/instances, but that's the same accepted constraint the
# rest of this MVP already runs under; a real multi-instance deployment
# would need a shared store (Redis) instead.


class RateLimiter:
    """Fixed-window limiter keyed by an arbitrary string (here, client IP).
    `max_attempts` requests are allowed per `window_seconds`; the window
    resets from the oldest surviving hit, not wall-clock boundaries.
    """

    def __init__(self, max_attempts: int, window_seconds: float):
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self._hits: dict[str, list[float]] = defaultdict(list)

    def check(self, key: str) -> None:
        now = time.monotonic()
        hits = self._hits[key]
        cutoff = now - self.window_seconds
        while hits and hits[0] < cutoff:
            hits.pop(0)
        if len(hits) >= self.max_attempts:
            raise HTTPException(status_code=429, detail="Too many attempts — please wait a moment and try again.")
        hits.append(now)


def _client_key(request: Request) -> str:
    return request.client.host if request.client else "unknown"


# 5 attempts per 5 minutes — generous enough for a real person mistyping
# their password, restrictive enough to make brute-forcing impractical.
_login_limiter = RateLimiter(max_attempts=5, window_seconds=300)
# 10 signups per hour per IP — spam-shaped abuse, not a security boundary
# the way login is, so a looser limit is fine.
_signup_limiter = RateLimiter(max_attempts=10, window_seconds=3600)


def rate_limit_login(request: Request) -> None:
    _login_limiter.check(_client_key(request))


def rate_limit_signup(request: Request) -> None:
    _signup_limiter.check(_client_key(request))
