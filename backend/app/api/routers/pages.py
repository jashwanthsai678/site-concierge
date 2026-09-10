from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.conversation.conversation_service import ConversationService
from app.models.business import Business
from app.models.campaign import Campaign
from app.models.visitor import Visitor
from app.schemas.business import BusinessPublic, CampaignLandingPage, StartConversationResponse
from app.utils.ids import new_session_token

router = APIRouter(prefix="/api", tags=["pages"])


# `GET /business/current` used to live here: it returned whichever business
# happened to be first in the table, with no auth, purely to bootstrap
# /dashboard. With more than one business on the instance that is a
# cross-tenant leak by construction, so the dashboard now bootstraps from
# the session's own business via /api/portal/me instead.


@router.get("/pages/{slug}", response_model=CampaignLandingPage)
async def get_landing_page(slug: str, db: AsyncSession = Depends(get_db)) -> CampaignLandingPage:
    campaign = await _get_campaign_or_404(db, slug)
    business = await db.get(Business, campaign.business_id)
    return CampaignLandingPage(
        business=BusinessPublic.model_validate(business),
        campaign_name=campaign.name,
        ad_creative_headline=campaign.ad_creative_headline,
        ad_creative_body=campaign.ad_creative_body,
    )


@router.post("/pages/{slug}/start", response_model=StartConversationResponse)
async def start_conversation(slug: str, request: Request, db: AsyncSession = Depends(get_db)) -> StartConversationResponse:
    """Creates the Visitor + Conversation the moment the landing page loads.
    The greeting itself is delivered exactly once, over the WS `greeting`
    event — not duplicated here — so the frontend has a single source of
    truth for what to speak first.
    """
    campaign = await _get_campaign_or_404(db, slug)
    business = await db.get(Business, campaign.business_id)

    visitor = Visitor(
        business_id=business.id,
        campaign_id=campaign.id,
        session_token=new_session_token(),
        user_agent=request.headers.get("user-agent"),
        referrer=request.headers.get("referer"),
    )
    db.add(visitor)
    await db.flush()

    conversation = await ConversationService(db).create(visitor_id=visitor.id, business_id=business.id)
    await db.commit()

    return StartConversationResponse(conversation_id=conversation.id, business=BusinessPublic.model_validate(business))


async def _get_campaign_or_404(db: AsyncSession, slug: str) -> Campaign:
    result = await db.execute(select(Campaign).where(Campaign.landing_page_slug == slug))
    campaign = result.scalar_one_or_none()
    if campaign is None:
        raise HTTPException(status_code=404, detail=f"No campaign found for slug '{slug}'.")
    return campaign
