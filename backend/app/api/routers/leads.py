from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_business, get_db
from app.crm.lead_repository import LeadRepository
from app.models.business import Business
from app.schemas.lead import LeadRead, LeadStatusUpdate

router = APIRouter(prefix="/api/leads", tags=["leads"])

# These endpoints used to take `business_id` as a plain query param with no
# auth at all, on the theory that /dashboard was an operator-only surface.
# That theory was wrong once real clients exist: /dashboard ships in the
# same SPA, on the same origin the client's own browser is already talking
# to, so any logged-in client could read and edit another business's lead
# PII by typing a URL. The business now comes from the session token —
# there is no caller-supplied id left to tamper with.


@router.get("", response_model=list[LeadRead])
async def list_leads(
    limit: int = Query(100, le=500),
    offset: int = Query(0, ge=0),
    business: Business = Depends(get_current_business),
    db: AsyncSession = Depends(get_db),
) -> list[LeadRead]:
    repo = LeadRepository(db)
    leads = await repo.list_by_business(business.id, limit=limit, offset=offset)
    return [LeadRead.model_validate(lead) for lead in leads]


@router.get("/{lead_id}", response_model=LeadRead)
async def get_lead(
    lead_id: int,
    business: Business = Depends(get_current_business),
    db: AsyncSession = Depends(get_db),
) -> LeadRead:
    lead = await _get_owned_lead(db, lead_id, business.id)
    return LeadRead.model_validate(lead)


@router.patch("/{lead_id}/status", response_model=LeadRead)
async def update_lead_status(
    lead_id: int,
    payload: LeadStatusUpdate,
    business: Business = Depends(get_current_business),
    db: AsyncSession = Depends(get_db),
) -> LeadRead:
    lead = await _get_owned_lead(db, lead_id, business.id)
    lead.status = payload.status
    await db.commit()
    return LeadRead.model_validate(lead)


async def _get_owned_lead(db: AsyncSession, lead_id: int, business_id: int):
    """404 (not 403) on someone else's lead — a 403 would confirm the id
    exists, which is itself a small leak of another tenant's row count.
    """
    repo = LeadRepository(db)
    lead = await repo.get_by_id(lead_id)
    if lead is None or lead.business_id != business_id:
        raise HTTPException(status_code=404, detail="Lead not found.")
    return lead
