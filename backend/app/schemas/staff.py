from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.schemas.business import BusinessPublic
from app.utils.origins import normalize_origins


class StaffLoginRequest(BaseModel):
    email: EmailStr
    password: str


class StaffPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    name: str


class StaffLoginResponse(BaseModel):
    token: str
    staff: StaffPublic


class BusinessAdminRead(BaseModel):
    """List/detail view for the internal team dashboard — unlike
    PortalBusinessRead (served to the business itself), this is only ever
    returned to an authenticated StaffUser.
    """

    model_config = ConfigDict(from_attributes=True)

    id: int
    slug: str
    email: str | None
    name: str
    industry: str
    persona_description: str
    greeting_template: str
    branding_color: str
    mascot_key: str
    is_active: bool
    allowed_origins: list[str]
    created_at: datetime


class BusinessAdminUpdate(BaseModel):
    """What staff may edit on a client's behalf, e.g. to unblock a stuck
    onboarding. Deliberately excludes email/password — a staff member
    resetting a client's login is a separate, explicit action
    (POST .../reset-password), not a side effect of a general edit.
    """

    name: str | None = Field(default=None, max_length=200)
    industry: str | None = Field(default=None, max_length=80)
    persona_description: str | None = Field(default=None, max_length=1000)
    greeting_template: str | None = Field(default=None, max_length=500)
    branding_color: str | None = Field(default=None, max_length=20)
    allowed_origins: list[str] | None = None

    @field_validator("allowed_origins")
    @classmethod
    def _canonicalize_origins(cls, value: list[str] | None) -> list[str] | None:
        return None if value is None else normalize_origins(value)


class ImpersonateResponse(BaseModel):
    """Same shape as LoginResponse — the frontend hands this straight to
    portalAuth.setToken() and navigates into /portal exactly as if the
    business itself had logged in.
    """

    token: str
    business: BusinessPublic


class BusinessUsageRow(BaseModel):
    business_id: int
    business_name: str
    business_slug: str
    total_tokens: int
    call_count: int


class TeamUsageSummary(BaseModel):
    businesses: list[BusinessUsageRow]
    total_tokens: int
