from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.analytics.dashboard_service import DashboardService
from app.analytics.pipeline_service import PipelineService
from app.api.deps import get_current_business, get_db
from app.models.business import Business
from app.schemas.analytics import DashboardSummary, FunnelCounts

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

# Scoped to the session's own business — see the note in leads.py. These
# were the last endpoints still taking an unauthenticated business_id.


@router.get("/summary", response_model=DashboardSummary)
async def get_summary(
    business: Business = Depends(get_current_business), db: AsyncSession = Depends(get_db),
) -> DashboardSummary:
    summary = await DashboardService(db).get_today_summary(business.id)
    return DashboardSummary(**summary)


@router.get("/funnel", response_model=FunnelCounts)
async def get_funnel(
    business: Business = Depends(get_current_business), db: AsyncSession = Depends(get_db),
) -> FunnelCounts:
    funnel = await PipelineService(db).get_funnel(business.id)
    return FunnelCounts(**funnel)


@router.get("/pipeline")
async def get_pipeline_status_counts(
    business: Business = Depends(get_current_business), db: AsyncSession = Depends(get_db),
) -> dict[str, int]:
    return await PipelineService(db).get_status_counts(business.id)
