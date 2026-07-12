from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.analytics.dashboard_service import DashboardService
from app.analytics.pipeline_service import PipelineService
from app.api.deps import get_db
from app.schemas.analytics import DashboardSummary, FunnelCounts

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/summary", response_model=DashboardSummary)
async def get_summary(business_id: int = Query(...), db: AsyncSession = Depends(get_db)) -> DashboardSummary:
    summary = await DashboardService(db).get_today_summary(business_id)
    return DashboardSummary(**summary)


@router.get("/funnel", response_model=FunnelCounts)
async def get_funnel(business_id: int = Query(...), db: AsyncSession = Depends(get_db)) -> FunnelCounts:
    funnel = await PipelineService(db).get_funnel(business_id)
    return FunnelCounts(**funnel)


@router.get("/pipeline")
async def get_pipeline_status_counts(business_id: int = Query(...), db: AsyncSession = Depends(get_db)) -> dict[str, int]:
    return await PipelineService(db).get_status_counts(business_id)
