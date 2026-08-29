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

export interface PortalBusinessUpdate {
  name?: string
  industry?: string
  persona_description?: string
  greeting_template?: string
  branding_color?: string
  mascot_key?: string
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
