export interface BusinessPublic {
  id: number
  slug: string
  name: string
  industry: string
  branding_color: string
  logo_url: string | null
  mascot_key: string
}

export interface CampaignLandingPage {
  business: BusinessPublic
  campaign_name: string
  ad_creative_headline: string
  ad_creative_body: string
}

export interface StartConversationResponse {
  conversation_id: number
  business: BusinessPublic
}
