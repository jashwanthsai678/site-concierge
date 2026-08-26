from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.cors import apply_cors_headers, origin_allowed
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
        raise HTTPException(status_code=403, detail="This origin is not registered for this business.")
    apply_cors_headers(response, origin, business)
    return {"business": BusinessPublic.model_validate(business)}


@router.options("/{slug}/config")
@router.options("/{slug}/start")
async def widget_preflight(slug: str, request: Request, db: AsyncSession = Depends(get_db)) -> Response:
    business = await _get_business_or_404(db, slug)
    origin = request.headers.get("origin")
    response = Response(status_code=200 if origin_allowed(business, origin) else 403)
    if origin_allowed(business, origin):
        apply_cors_headers(response, origin, business)
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
        raise HTTPException(status_code=403, detail="This origin is not registered for this business.")
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


async def _get_business_or_404(db: AsyncSession, slug: str) -> Business:
    result = await db.execute(select(Business).where(Business.slug == slug, Business.is_active.is_(True)))
    business = result.scalar_one_or_none()
    if business is None:
        raise HTTPException(status_code=404, detail=f"No business found for slug '{slug}'.")
    return business
