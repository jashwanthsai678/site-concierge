import type { BusinessPublic } from '@/types/business'

export interface StaffLoginRequest {
  email: string
  password: string
}

export interface StaffPublic {
  id: number
  email: string
  name: string
}

export interface StaffLoginResponse {
  token: string
  staff: StaffPublic
}

/** List/detail view for the internal team dashboard — unlike
 * PortalBusinessRead (served to the business itself), this is only ever
 * returned to an authenticated staff member. */
export interface BusinessAdminRead {
  id: number
  slug: string
  email: string | null
  name: string
  industry: string
  persona_description: string
  greeting_template: string
  branding_color: string
  mascot_key: string
  is_active: boolean
  allowed_origins: string[]
  created_at: string
}

/** What staff may edit on a client's behalf — all fields optional, PATCH
 * semantics, only what's sent gets changed. Deliberately excludes
 * email/password. */
export interface BusinessAdminUpdate {
  name?: string
  industry?: string
  persona_description?: string
  greeting_template?: string
  branding_color?: string
  allowed_origins?: string[]
}

/** Same shape as LoginResponse — handed straight to portalAuth.setToken()
 * so staff can open the client's real portal as if the business itself had
 * logged in. */
export interface ImpersonateResponse {
  token: string
  business: BusinessPublic
}

export interface BusinessUsageRow {
  business_id: number
  business_name: string
  business_slug: string
  total_tokens: number
  call_count: number
}

export interface TeamUsageSummary {
  businesses: BusinessUsageRow[]
  total_tokens: number
}
