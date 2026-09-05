from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.knowledge import KnowledgeCategory


class BusinessPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    slug: str
    name: str
    industry: str
    branding_color: str
    logo_url: str | None
    mascot_key: str
    mascot_energy: str


class PortalBusinessRead(BaseModel):
    """What GET/PATCH /api/portal/me returns — unlike BusinessPublic (used
    by public, unauthenticated endpoints like the widget config), this is
    only ever served to the logged-in business itself, so it's safe to
    include the internal fields (persona, greeting, allowed origins, email)
    that a public endpoint must never leak.
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
    logo_url: str | None
    mascot_key: str
    mascot_energy: str
    allowed_origins: list[str]


class CampaignLandingPage(BaseModel):
    business: BusinessPublic
    campaign_name: str
    ad_creative_headline: str
    ad_creative_body: str


class StartConversationResponse(BaseModel):
    conversation_id: int
    business: BusinessPublic


class BusinessCreate(BaseModel):
    """Onboarding payload for a new client business. Also creates one
    Campaign row (see BusinessOnboardingResponse.landing_page_slug) so the
    business has a working demo URL immediately — a business with zero
    campaigns can't be reached through /api/pages/{slug} at all.
    """

    slug: str = Field(max_length=80)
    email: EmailStr
    password: str = Field(min_length=8, max_length=200)
    name: str = Field(max_length=200)
    industry: str = Field(max_length=80)
    persona_description: str = Field(max_length=1000)
    greeting_template: str = Field(max_length=500)
    branding_color: str = Field(default="#2a78d6", max_length=20)
    mascot_key: str = Field(default="default", max_length=50)
    mascot_energy: str = Field(default="balanced", max_length=20)
    landing_page_slug: str = Field(max_length=120)
    ad_creative_headline: str = Field(max_length=300)
    ad_creative_body: str = Field(max_length=500)
    # Exact scheme+host origins (e.g. "https://theirsite.com") this business
    # will embed the widget from — checked against the request's Origin
    # header by /api/widget/* and the conversation websocket. Empty by
    # default; a business with none registered can still use the
    # demo/ad-simulator flow (that uses this app's own origin), just not a
    # real embed on an external site yet.
    allowed_origins: list[str] = Field(default_factory=list)


class BusinessOnboardingResponse(BaseModel):
    business: BusinessPublic
    landing_page_slug: str


class KnowledgeItemCreate(BaseModel):
    category: KnowledgeCategory
    content: str
    question: str | None = Field(default=None, max_length=300)


class KnowledgeBulkCreate(BaseModel):
    items: list[KnowledgeItemCreate]


class IngestRequest(BaseModel):
    website_url: str | None = None


class IngestResponse(BaseModel):
    chunks_ingested: int


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    token: str
    business: BusinessPublic


class PortalBusinessUpdate(BaseModel):
    """All fields optional — PATCH semantics, only what's sent gets changed."""

    name: str | None = Field(default=None, max_length=200)
    industry: str | None = Field(default=None, max_length=80)
    persona_description: str | None = Field(default=None, max_length=1000)
    greeting_template: str | None = Field(default=None, max_length=500)
    branding_color: str | None = Field(default=None, max_length=20)
    mascot_key: str | None = Field(default=None, max_length=50)
    mascot_energy: str | None = Field(default=None, max_length=20)
    allowed_origins: list[str] | None = None


class KnowledgeItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    category: KnowledgeCategory
    question: str | None
    content: str
    display_order: int


class KnowledgeItemUpdate(BaseModel):
    category: KnowledgeCategory | None = None
    question: str | None = Field(default=None, max_length=300)
    content: str | None = None
