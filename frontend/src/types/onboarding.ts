import type { BusinessPublic } from '@/types/business'

export type KnowledgeCategory = 'faq' | 'pricing' | 'product' | 'policy'

export interface KnowledgeItemPayload {
  category: KnowledgeCategory
  question?: string
  content: string
}

export interface BusinessCreatePayload {
  slug: string
  email: string
  password: string
  name: string
  industry: string
  persona_description: string
  greeting_template: string
  branding_color?: string
  mascot_key?: string
  landing_page_slug: string
  ad_creative_headline: string
  ad_creative_body: string
  allowed_origins?: string[]
}

export interface BusinessOnboardingResponse {
  business: BusinessPublic
  landing_page_slug: string
  token: string
}
