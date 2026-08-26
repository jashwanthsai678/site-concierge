"""CORS for the embeddable widget endpoints — deliberately NOT handled by
the app-wide `CORSMiddleware` in main.py, which only knows this app's own
fixed origins (settings.cors_origins) and can't consult per-business data.

A widget embedded on an arbitrary client site needs a *dynamic* check: is
this specific Origin registered for *this* business? That can only be
answered per-request, after looking up the business — so these endpoints
set CORS response headers by hand instead of relying on middleware.

Our own app's origins are always allowed too (not just each business's
registered ones) — the demo/onboarding UI's own pages call these same
widget endpoints and must keep working without being registered as an
"external" origin for every business.
"""

from fastapi import Response

from app.config.settings import get_settings
from app.models.business import Business


def origin_allowed(business: Business, origin: str | None) -> bool:
    if origin is None:
        return False
    return origin in business.allowed_origins or origin in get_settings().cors_origins


def apply_cors_headers(response: Response, origin: str | None, business: Business) -> None:
    if origin_allowed(business, origin):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Vary"] = "Origin"
