from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_business, get_db
from app.crm.lead_repository import LeadRepository
from app.knowledge.ingestion_service import ingest_business
from app.models.business import Business
from app.models.knowledge import KnowledgeItem
from app.schemas.business import (
    BusinessPublic,
    IngestRequest,
    IngestResponse,
    KnowledgeBulkCreate,
    KnowledgeItemRead,
    KnowledgeItemUpdate,
    PortalBusinessUpdate,
)
from app.schemas.lead import LeadRead

router = APIRouter(prefix="/api/portal", tags=["portal"])


@router.get("/me", response_model=BusinessPublic)
async def get_my_business(business: Business = Depends(get_current_business)) -> Business:
    return business


@router.patch("/me", response_model=BusinessPublic)
async def update_my_business(
    payload: PortalBusinessUpdate,
    business: Business = Depends(get_current_business),
    db: AsyncSession = Depends(get_db),
) -> Business:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(business, field, value)
    await db.commit()
    await db.refresh(business)
    return business


@router.get("/knowledge", response_model=list[KnowledgeItemRead])
async def list_my_knowledge(
    business: Business = Depends(get_current_business), db: AsyncSession = Depends(get_db),
) -> list[KnowledgeItem]:
    result = await db.execute(
        select(KnowledgeItem).where(KnowledgeItem.business_id == business.id).order_by(KnowledgeItem.display_order)
    )
    return list(result.scalars().all())


@router.post("/knowledge", status_code=201)
async def add_my_knowledge(
    payload: KnowledgeBulkCreate,
    business: Business = Depends(get_current_business),
    db: AsyncSession = Depends(get_db),
) -> dict:
    existing_count = (
        await db.execute(select(KnowledgeItem).where(KnowledgeItem.business_id == business.id))
    ).scalars().all()
    next_order = len(existing_count)
    for offset, item in enumerate(payload.items):
        db.add(KnowledgeItem(
            business_id=business.id, category=item.category, question=item.question,
            content=item.content, display_order=next_order + offset,
        ))
    await db.commit()
    return {"items_added": len(payload.items)}


@router.patch("/knowledge/{item_id}", response_model=KnowledgeItemRead)
async def update_my_knowledge_item(
    item_id: int,
    payload: KnowledgeItemUpdate,
    business: Business = Depends(get_current_business),
    db: AsyncSession = Depends(get_db),
) -> KnowledgeItem:
    item = await _get_owned_knowledge_item(db, item_id, business.id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/knowledge/{item_id}", status_code=204)
async def delete_my_knowledge_item(
    item_id: int, business: Business = Depends(get_current_business), db: AsyncSession = Depends(get_db),
) -> None:
    item = await _get_owned_knowledge_item(db, item_id, business.id)
    await db.delete(item)
    await db.commit()


@router.post("/ingest", response_model=IngestResponse)
async def trigger_my_ingestion(
    payload: IngestRequest, business: Business = Depends(get_current_business),
) -> IngestResponse:
    try:
        chunk_count = await ingest_business(business.id, website_url=payload.website_url)
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="Could not reach the RAG vector store — check QDRANT_URL/QDRANT_API_KEY in backend/.env.",
        ) from exc
    return IngestResponse(chunks_ingested=chunk_count)


@router.get("/leads", response_model=list[LeadRead])
async def list_my_leads(
    business: Business = Depends(get_current_business), db: AsyncSession = Depends(get_db),
) -> list:
    leads = await LeadRepository(db).list_by_business(business.id)
    return [LeadRead.model_validate(lead) for lead in leads]


async def _get_owned_knowledge_item(db: AsyncSession, item_id: int, business_id: int) -> KnowledgeItem:
    item = await db.get(KnowledgeItem, item_id)
    if item is None or item.business_id != business_id:
        raise HTTPException(status_code=404, detail=f"Knowledge item {item_id} not found.")
    return item
