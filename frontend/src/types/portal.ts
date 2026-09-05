import type { BusinessPublic } from '@/types/business'
import type { KnowledgeCategory } from '@/types/onboarding'

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  token: string
  business: BusinessPublic
}

/** What GET/PATCH /api/portal/me returns — the full, authenticated view of
 * a business's own record, unlike BusinessPublic (used by public endpoints
 * like the widget config), which deliberately omits persona/greeting/email/
 * allowed_origins. */
export interface PortalBusinessRead {
  id: number
  slug: string
  email: string | null
  name: string
  industry: string
  persona_description: string
  greeting_template: string
  branding_color: string
  logo_url: string | null
  mascot_key: string
  mascot_energy: string
  mascot_image_url: string | null
  allowed_origins: string[]
}

export interface PortalBusinessUpdate {
  name?: string
  industry?: string
  persona_description?: string
  greeting_template?: string
  branding_color?: string
  mascot_key?: string
  mascot_energy?: string
  allowed_origins?: string[]
}

export interface KnowledgeItemRead {
  id: number
  category: KnowledgeCategory
  question: string | null
  content: string
  display_order: number
}

export interface KnowledgeItemUpdate {
  category?: KnowledgeCategory
  question?: string | null
  content?: string
}
