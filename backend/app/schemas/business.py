from pydantic import BaseModel, ConfigDict, Field

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
    name: str = Field(max_length=200)
    industry: str = Field(max_length=80)
    persona_description: str = Field(max_length=1000)
    greeting_template: str = Field(max_length=500)
    branding_color: str = Field(default="#2a78d6", max_length=20)
    mascot_key: str = Field(default="default", max_length=50)
    landing_page_slug: str = Field(max_length=120)
    ad_creative_headline: str = Field(max_length=300)
    ad_creative_body: str = Field(max_length=500)


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
