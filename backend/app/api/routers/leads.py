from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.crm.lead_repository import LeadRepository
from app.schemas.lead import LeadRead, LeadStatusUpdate

router = APIRouter(prefix="/api/leads", tags=["leads"])


@router.get("", response_model=list[LeadRead])
async def list_leads(
    business_id: int = Query(...),
    limit: int = Query(100, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> list[LeadRead]:
    repo = LeadRepository(db)
    leads = await repo.list_by_business(business_id, limit=limit, offset=offset)
    return [LeadRead.model_validate(lead) for lead in leads]


@router.get("/{lead_id}", response_model=LeadRead)
async def get_lead(lead_id: int, db: AsyncSession = Depends(get_db)) -> LeadRead:
    repo = LeadRepository(db)
    lead = await repo.get_by_id(lead_id)
    if lead is None:
        raise HTTPException(status_code=404, detail="Lead not found.")
    return LeadRead.model_validate(lead)


@router.patch("/{lead_id}/status", response_model=LeadRead)
async def update_lead_status(lead_id: int, payload: LeadStatusUpdate, db: AsyncSession = Depends(get_db)) -> LeadRead:
    repo = LeadRepository(db)
    lead = await repo.get_by_id(lead_id)
    if lead is None:
        raise HTTPException(status_code=404, detail="Lead not found.")
    lead.status = payload.status
    await db.commit()
    return LeadRead.model_validate(lead)
