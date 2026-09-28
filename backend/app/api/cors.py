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
from app.utils.origins import try_normalize_origin


def origin_allowed(business: Business, origin: str | None) -> bool:
    if origin is None:
        return False
    if origin in get_settings().cors_origins:
        return True
    if origin in business.allowed_origins:
        return True
    # Rows saved before origins were canonicalised on write (see
    # utils/origins.py) may carry a trailing slash or mixed case, which can
    # never equal a browser's Origin header. Compare normalised forms too,
    # so an old entry keeps working instead of failing invisibly.
    return any(try_normalize_origin(registered) == origin for registered in business.allowed_origins)


def apply_cors_headers(response: Response, origin: str | None, business: Business) -> None:
    if origin_allowed(business, origin):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Vary"] = "Origin"


def rejection_headers(origin: str | None) -> dict[str, str]:
    """CORS headers for a *refused* widget request.

    Without these the browser discards the 403 before the widget can read
    it, so a client who forgot to register their domain saw no error at all
    — just a widget that never appeared. Echoing the origin here only
    exposes the refusal message itself; the request is still refused, and
    no business data is returned.
    """
    return {"Access-Control-Allow-Origin": origin, "Vary": "Origin"} if origin else {}
