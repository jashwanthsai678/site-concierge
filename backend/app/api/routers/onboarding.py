from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.knowledge.ingestion_service import ingest_business
from app.models.business import Business
from app.models.campaign import Campaign
from app.models.knowledge import KnowledgeItem
from app.schemas.business import (
    BusinessCreate,
    BusinessOnboardingResponse,
    BusinessPublic,
    IngestRequest,
    IngestResponse,
    KnowledgeBulkCreate,
)

router = APIRouter(prefix="/api/onboarding", tags=["onboarding"])


@router.post("/businesses", response_model=BusinessOnboardingResponse, status_code=201)
async def create_business(payload: BusinessCreate, db: AsyncSession = Depends(get_db)) -> BusinessOnboardingResponse:
    """Step 1 of self-serve onboarding: create the business + one campaign
    so it has a working demo URL immediately. Knowledge (see
    add_knowledge_items below) and RAG ingestion (see trigger_ingestion) are
    separate steps — a client fills in persona/branding first, then adds
    what they want the AI to know, in whatever order suits their setup flow.
    """
    business = Business(
        slug=payload.slug,
        name=payload.name,
        industry=payload.industry,
        persona_description=payload.persona_description,
        greeting_template=payload.greeting_template,
        branding_color=payload.branding_color,
        mascot_key=payload.mascot_key,
    )
    db.add(business)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail=f"Slug '{payload.slug}' is already taken.") from None

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

    await db.commit()
    return BusinessOnboardingResponse(
        business=BusinessPublic.model_validate(business), landing_page_slug=campaign.landing_page_slug,
    )


@router.post("/businesses/{business_id}/knowledge", status_code=201)
async def add_knowledge_items(
    business_id: int, payload: KnowledgeBulkCreate, db: AsyncSession = Depends(get_db),
) -> dict:
    """Step 2: bulk-add FAQ/pricing/product/policy rows — the client-provided
    half of the RAG corpus (see knowledge/ingestion_service.py for the other
    half, crawled website content). Adding rows here doesn't embed them; run
    trigger_ingestion afterward to pick up the changes.
    """
    business = await db.get(Business, business_id)
    if business is None:
        raise HTTPException(status_code=404, detail=f"Business {business_id} not found.")

    for order, item in enumerate(payload.items):
        db.add(KnowledgeItem(
            business_id=business_id, category=item.category, question=item.question,
            content=item.content, display_order=order,
        ))
    await db.commit()
    return {"items_added": len(payload.items)}


@router.post("/businesses/{business_id}/ingest", response_model=IngestResponse)
async def trigger_ingestion(
    business_id: int, payload: IngestRequest, db: AsyncSession = Depends(get_db),
) -> IngestResponse:
    """Step 3: chunk + embed the business's knowledge rows (and, if
    `website_url` is given, crawl and ingest that site too) into Qdrant.
    Runs synchronously in the request — fine for an MVP-scale knowledge base
    and a handful of crawled pages; a real background job queue is the
    obvious next step once onboarding volume or site size makes this slow.
    """
    business = await db.get(Business, business_id)
    if business is None:
        raise HTTPException(status_code=404, detail=f"Business {business_id} not found.")

    try:
        chunk_count = await ingest_business(business_id, website_url=payload.website_url)
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="Could not reach the RAG vector store — check QDRANT_URL/QDRANT_API_KEY in backend/.env.",
        ) from exc
    return IngestResponse(chunks_ingested=chunk_count)
