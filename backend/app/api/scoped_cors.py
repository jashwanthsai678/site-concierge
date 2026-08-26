from starlette.middleware.cors import CORSMiddleware
from starlette.types import ASGIApp, Receive, Scope, Send

# Starlette's CORSMiddleware intercepts every preflight OPTIONS request
# app-wide and answers it directly against its own static allow_origins —
# it never calls through to the app, so a route-level @router.options
# handler for a per-business dynamic origin (see api/routers/widget.py)
# would be dead code without this: /api/widget/* must never reach the
# static-origin CORSMiddleware at all, so it can be answered by the widget
# router itself, which is the only thing that knows a given business's
# registered origins.
#
# WebSocket scopes are unaffected by this either way — CORSMiddleware
# already ignores non-http scopes unconditionally (see scope["type"]
# != "http" check), so the conversation websocket's origin check is done
# separately, inside voice/routers/websocket.py's handler itself.
_BYPASS_PREFIX = "/api/widget/"


class ScopedCorsMiddleware:
    def __init__(self, app: ASGIApp, **cors_kwargs) -> None:
        self._app = app
        self._cors_app = CORSMiddleware(app, **cors_kwargs)

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] == "http" and scope["path"].startswith(_BYPASS_PREFIX):
            await self._app(scope, receive, send)
            return
        await self._cors_app(scope, receive, send)
