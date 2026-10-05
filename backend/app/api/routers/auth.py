from datetime import timedelta

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.api.rate_limit import rate_limit_login
from app.config.settings import get_settings
from app.models.base import utcnow
from app.models.business import Business
from app.models.business_session import BusinessSession
from app.schemas.business import BusinessPublic, LoginRequest, LoginResponse
from app.utils.ids import new_session_token
from app.utils.security import verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse, dependencies=[Depends(rate_limit_login)])
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)) -> LoginResponse:
    business = (
        await db.execute(select(Business).where(Business.email == payload.email))
    ).scalar_one_or_none()

    # Same generic message whether the email doesn't exist or the password
    # is wrong — an onboarded-but-credential-less business (hashed_password
    # is None) also fails verify_password's split() cleanly rather than
    # crashing, so this one check covers all three "can't log in" cases.
    if business is None or business.hashed_password is None or not verify_password(
        payload.password, business.hashed_password,
    ):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")

    # A suspended business (see api/routers/team.py's suspend endpoint)
    # already can't run its widget (widget.py's is_active check), but
    # without this it could still log into its own portal — a suspension a
    # client can just ignore isn't a suspension.
    if not business.is_active:
        raise HTTPException(status_code=403, detail="This account has been suspended. Contact support.")

    session = BusinessSession(
        business_id=business.id, token=new_session_token(),
        expires_at=utcnow() + timedelta(days=get_settings().session_ttl_days),
    )
    db.add(session)
    await db.commit()

    return LoginResponse(token=session.token, business=BusinessPublic.model_validate(business))


@router.post("/logout", status_code=204)
async def logout(authorization: str | None = Header(default=None), db: AsyncSession = Depends(get_db)) -> None:
    if authorization and authorization.startswith("Bearer "):
        token = authorization.removeprefix("Bearer ").strip()
        await db.execute(delete(BusinessSession).where(BusinessSession.token == token))
        await db.commit()
