from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.api.rate_limit import rate_limit_signup
from app.config.settings import get_settings
from app.models.base import utcnow
from app.models.business import Business
from app.models.business_session import BusinessSession
from app.models.campaign import Campaign
from app.schemas.business import BusinessCreate, BusinessOnboardingResponse, BusinessPublic
from app.utils.ids import new_session_token
from app.utils.security import hash_password

router = APIRouter(prefix="/api/onboarding", tags=["onboarding"])


@router.post(
    "/businesses", response_model=BusinessOnboardingResponse, status_code=201,
    dependencies=[Depends(rate_limit_signup)],
)
async def create_business(payload: BusinessCreate, db: AsyncSession = Depends(get_db)) -> BusinessOnboardingResponse:
    """Step 1 of self-serve onboarding: create the business + its portal
    login + one campaign so it has a working demo URL immediately, and log
    it in immediately (issuing the same kind of session /api/auth/login
    would). Adding knowledge and running RAG ingestion are separate steps
    handled by the already-authenticated /api/portal/knowledge and
    /api/portal/ingest — this used to duplicate that logic here with a raw
    `business_id` path param and no ownership check at all, letting any
    caller add knowledge to or trigger ingestion for ANY business by
    guessing an id. Reusing the portal's endpoints (now that this returns a
    token) closes that instead of patching a second, parallel implementation.
    """
    business = Business(
        slug=payload.slug,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        name=payload.name,
        industry=payload.industry,
        persona_description=payload.persona_description,
        greeting_template=payload.greeting_template,
        branding_color=payload.branding_color,
        mascot_key=payload.mascot_key,
        mascot_energy=payload.mascot_energy,
        allowed_origins=payload.allowed_origins,
    )
    db.add(business)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=409, detail=f"Slug '{payload.slug}' or email '{payload.email}' is already taken.",
        ) from None

    campaign = Campaign(
        business_id=business.id,
        name=f"{payload.name} — Demo Campaign",
        utm_source="onboarding",
        utm_campaign=payload.slug,
        landing_page_slug=payload.landing_page_slug,
        ad_creative_headline=payload.ad_creative_headline,
        ad_creative_body=payload.ad_creative_body,
    )
    db.add(campaign)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=409, detail=f"Landing page slug '{payload.landing_page_slug}' is already taken."
        ) from None

    session = BusinessSession(
        business_id=business.id, token=new_session_token(),
        expires_at=utcnow() + timedelta(days=get_settings().session_ttl_days),
    )
    db.add(session)

    await db.commit()
    return BusinessOnboardingResponse(
        business=BusinessPublic.model_validate(business),
        landing_page_slug=campaign.landing_page_slug,
        token=session.token,
    )
