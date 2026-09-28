from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.cors import apply_cors_headers, origin_allowed, rejection_headers
from app.api.deps import get_db
from app.conversation.conversation_service import ConversationService
from app.models.business import Business
from app.models.visitor import Visitor
from app.schemas.business import BusinessPublic, StartConversationResponse
from app.utils.ids import new_session_token

router = APIRouter(prefix="/api/widget", tags=["widget"])

_ALLOWED_METHODS = "GET, POST, OPTIONS"
_ALLOWED_HEADERS = "Content-Type"


@router.get("/{slug}/config")
async def get_widget_config(slug: str, request: Request, response: Response, db: AsyncSession = Depends(get_db)) -> dict:
    """What an embedded widget needs to render itself, keyed directly by
    business slug — no Campaign/landing-page concept, unlike /api/pages/*,
    which is built for the ad-simulator demo flow. A real client's own site
    isn't an ad landing page.
    """
    business = await _get_business_or_404(db, slug)
    origin = request.headers.get("origin")
    if not origin_allowed(business, origin):
        raise _origin_refused(origin)
    apply_cors_headers(response, origin, business)
    return {"business": BusinessPublic.model_validate(business)}


@router.options("/{slug}/config")
@router.options("/{slug}/start")
async def widget_preflight(slug: str, request: Request, db: AsyncSession = Depends(get_db)) -> Response:
    """Preflight deliberately succeeds for any origin.

    A preflight is not an authorization decision — it only tells the browser
    whether it may send the real request. Refusing it here meant an
    unregistered site failed at the preflight, so the browser blocked the
    actual call with an opaque "Failed to fetch" and the carefully-worded
    403 below was never reachable. The allowlist is still enforced, on the
    real request, which is the only place it can produce a readable answer.
    Nothing is disclosed by allowing the preflight itself: no business data
    is in this response.
    """
    await _get_business_or_404(db, slug)
    origin = request.headers.get("origin")
    response = Response(status_code=200)
    if origin:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Vary"] = "Origin"
        response.headers["Access-Control-Allow-Methods"] = _ALLOWED_METHODS
        response.headers["Access-Control-Allow-Headers"] = _ALLOWED_HEADERS
    return response


@router.post("/{slug}/start", response_model=StartConversationResponse)
async def start_widget_conversation(
    slug: str, request: Request, response: Response, db: AsyncSession = Depends(get_db),
) -> StartConversationResponse:
    business = await _get_business_or_404(db, slug)
    origin = request.headers.get("origin")
    if not origin_allowed(business, origin):
        raise _origin_refused(origin)
    apply_cors_headers(response, origin, business)

    visitor = Visitor(
        business_id=business.id,
        session_token=new_session_token(),
        user_agent=request.headers.get("user-agent"),
        referrer=request.headers.get("referer"),
    )
    db.add(visitor)
    await db.flush()

    conversation = await ConversationService(db).create(visitor_id=visitor.id, business_id=business.id)
    await db.commit()

    return StartConversationResponse(conversation_id=conversation.id, business=BusinessPublic.model_validate(business))


def _origin_refused(origin: str | None) -> HTTPException:
    """A refusal the client can actually act on.

    This is the single most likely reason a fresh install shows nothing:
    the snippet is pasted correctly, but the site's domain was never added
    under Settings -> Allowed embed origins. The message names the exact
    value to register, and `rejection_headers` is what lets the browser
    hand it to the widget instead of discarding the response.
    """
    shown = origin or "(none sent)"
    return HTTPException(
        status_code=403,
        detail=(
            f"This site ({shown}) is not registered for this business. "
            f"Add exactly \"{shown}\" under Settings -> Allowed embed origins in the portal, then reload."
        ),
        headers=rejection_headers(origin),
    )


async def _get_business_or_404(db: AsyncSession, slug: str) -> Business:
    result = await db.execute(select(Business).where(Business.slug == slug, Business.is_active.is_(True)))
    business = result.scalar_one_or_none()
    if business is None:
        raise HTTPException(status_code=404, detail=f"No business found for slug '{slug}'.")
    return business
