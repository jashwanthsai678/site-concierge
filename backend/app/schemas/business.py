from pydantic import BaseModel, ConfigDict


class BusinessPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    slug: str
    name: str
    industry: str
    branding_color: str
    logo_url: str | None


class CampaignLandingPage(BaseModel):
    business: BusinessPublic
    campaign_name: str
    ad_creative_headline: str
    ad_creative_body: str


class StartConversationResponse(BaseModel):
    conversation_id: int
    business: BusinessPublic
