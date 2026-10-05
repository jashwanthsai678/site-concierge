import logging
from datetime import timedelta

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_staff, get_db
from app.api.rate_limit import rate_limit_login
from app.config.settings import get_settings
from app.models.base import utcnow
from app.models.business import Business
from app.models.business_session import BusinessSession
from app.models.staff_session import StaffSession
from app.models.staff_user import StaffUser
from app.models.token_usage import TokenUsageLog
from app.schemas.business import BusinessPublic
from app.schemas.staff import (
    BusinessAdminRead,
    BusinessAdminUpdate,
    BusinessUsageRow,
    ImpersonateResponse,
    StaffLoginRequest,
    StaffLoginResponse,
    StaffPublic,
    TeamUsageSummary,
)
from app.utils.ids import new_session_token
from app.utils.security import verify_password

router = APIRouter(prefix="/api/team", tags=["team"])
logger = logging.getLogger(__name__)


# --- Auth ---------------------------------------------------------------
# Deliberately no /team/auth/register — see models/staff_user.py. Accounts
# are provisioned via scripts/create_staff_user.py.


@router.post("/auth/login", response_model=StaffLoginResponse, dependencies=[Depends(rate_limit_login)])
async def staff_login(payload: StaffLoginRequest, db: AsyncSession = Depends(get_db)) -> StaffLoginResponse:
    staff = (
        await db.execute(select(StaffUser).where(StaffUser.email == payload.email))
    ).scalar_one_or_none()

    if staff is None or not staff.is_active or not verify_password(payload.password, staff.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")

    session = StaffSession(
        staff_user_id=staff.id, token=new_session_token(),
        expires_at=utcnow() + timedelta(days=get_settings().session_ttl_days),
    )
    db.add(session)
    await db.commit()

    return StaffLoginResponse(token=session.token, staff=StaffPublic.model_validate(staff))


@router.post("/auth/logout", status_code=204)
async def staff_logout(authorization: str | None = Header(default=None), db: AsyncSession = Depends(get_db)) -> None:
    if authorization and authorization.startswith("Bearer "):
        token = authorization.removeprefix("Bearer ").strip()
        await db.execute(delete(StaffSession).where(StaffSession.token == token))
        await db.commit()


@router.get("/auth/me", response_model=StaffPublic)
async def staff_me(staff: StaffUser = Depends(get_current_staff)) -> StaffUser:
    return staff


# --- Businesses -----------------------------------------------------------


@router.get("/businesses", response_model=list[BusinessAdminRead])
async def list_businesses(
    _staff: StaffUser = Depends(get_current_staff), db: AsyncSession = Depends(get_db),
) -> list[Business]:
    result = await db.execute(select(Business).order_by(Business.created_at.desc()))
    return list(result.scalars().all())


async def _get_business_or_404(db: AsyncSession, business_id: int) -> Business:
    business = await db.get(Business, business_id)
    if business is None:
        raise HTTPException(status_code=404, detail="Business not found.")
    return business


@router.get("/businesses/{business_id}", response_model=BusinessAdminRead)
async def get_business(
    business_id: int, _staff: StaffUser = Depends(get_current_staff), db: AsyncSession = Depends(get_db),
) -> Business:
    return await _get_business_or_404(db, business_id)


@router.patch("/businesses/{business_id}", response_model=BusinessAdminRead)
async def update_business(
    business_id: int,
    payload: BusinessAdminUpdate,
    _staff: StaffUser = Depends(get_current_staff),
    db: AsyncSession = Depends(get_db),
) -> Business:
    business = await _get_business_or_404(db, business_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(business, field, value)
    await db.commit()
    await db.refresh(business)
    return business


@router.post("/businesses/{business_id}/suspend", response_model=BusinessAdminRead)
async def suspend_business(
    business_id: int, _staff: StaffUser = Depends(get_current_staff), db: AsyncSession = Depends(get_db),
) -> Business:
    business = await _get_business_or_404(db, business_id)
    business.is_active = False
    # Suspending also kills any live portal sessions immediately — flipping
    # is_active alone would leave an already-logged-in client with a
    # working session until it naturally expired (see session_ttl_days).
    await db.execute(delete(BusinessSession).where(BusinessSession.business_id == business.id))
    await db.commit()
    await db.refresh(business)
    return business


@router.post("/businesses/{business_id}/reactivate", response_model=BusinessAdminRead)
async def reactivate_business(
    business_id: int, _staff: StaffUser = Depends(get_current_staff), db: AsyncSession = Depends(get_db),
) -> Business:
    business = await _get_business_or_404(db, business_id)
    business.is_active = True
    await db.commit()
    await db.refresh(business)
    return business


@router.post("/businesses/{business_id}/impersonate", response_model=ImpersonateResponse)
async def impersonate_business(
    business_id: int, staff: StaffUser = Depends(get_current_staff), db: AsyncSession = Depends(get_db),
) -> ImpersonateResponse:
    """Issues a normal BusinessSession token, exactly like the business
    logging in itself — lets support staff reproduce/fix a client's setup
    from inside their real portal instead of guessing from the outside.
    Every call is logged (see `logger.info` below) since this grants full
    access to that business's portal; there's no separate audit-log table
    yet, so the app log is the only trail — acceptable for the current
    single small team, not for a larger one.
    """
    business = await _get_business_or_404(db, business_id)
    if not business.is_active:
        raise HTTPException(status_code=409, detail="Cannot impersonate a suspended business — reactivate it first.")

    logger.info(
        "Staff impersonation: staff_id=%s email=%s -> business_id=%s slug=%s",
        staff.id, staff.email, business.id, business.slug,
    )

    session = BusinessSession(
        business_id=business.id, token=new_session_token(),
        expires_at=utcnow() + timedelta(days=get_settings().session_ttl_days),
    )
    db.add(session)
    await db.commit()

    return ImpersonateResponse(token=session.token, business=BusinessPublic.model_validate(business))


# --- Usage ------------------------------------------------------------


@router.get("/usage", response_model=TeamUsageSummary)
async def get_team_usage(
    _staff: StaffUser = Depends(get_current_staff), db: AsyncSession = Depends(get_db),
) -> TeamUsageSummary:
    """Cross-tenant version of portal.py's /usage — same token_usage_logs
    table, grouped by business instead of scoped to one.
    """
    businesses = (await db.execute(select(Business))).scalars().all()
    logs = (await db.execute(select(TokenUsageLog))).scalars().all()

    totals: dict[int, tuple[int, int]] = {}
    for log in logs:
        tokens, count = totals.get(log.business_id, (0, 0))
        totals[log.business_id] = (tokens + log.total_tokens, count + 1)

    rows = [
        BusinessUsageRow(
            business_id=b.id,
            business_name=b.name,
            business_slug=b.slug,
            total_tokens=totals.get(b.id, (0, 0))[0],
            call_count=totals.get(b.id, (0, 0))[1],
        )
        for b in businesses
    ]
    rows.sort(key=lambda r: r.total_tokens, reverse=True)

    return TeamUsageSummary(businesses=rows, total_tokens=sum(r.total_tokens for r in rows))
