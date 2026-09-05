import type { BusinessPublic, CampaignLandingPage, StartConversationResponse } from '@/types/business'
import type { LeadRead } from '@/types/lead'
import type { ConversationRead, DashboardSummary, FunnelCounts, MessageRead } from '@/types/analytics'
import type { BusinessCreatePayload, BusinessOnboardingResponse } from '@/types/onboarding'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    // FastAPI error responses are {"detail": "..."} — surface that message
    // directly when present, since it's written to be shown to a user (see
    // onboarding.py's HTTPException details), not just logged.
    const detail = (() => {
      try {
        return JSON.parse(body)?.detail
      } catch {
        return undefined
      }
    })()
    throw new Error(typeof detail === 'string' ? detail : `Request to ${path} failed (${res.status}): ${body}`)
  }
  return res.json() as Promise<T>
}

export const api = {
  getCurrentBusiness: () => request<BusinessPublic>('/api/business/current'),

  getLandingPage: (slug: string) => request<CampaignLandingPage>(`/api/pages/${slug}`),

  startConversation: (slug: string) =>
    request<StartConversationResponse>(`/api/pages/${slug}/start`, { method: 'POST' }),

  listLeads: (businessId: number) => request<LeadRead[]>(`/api/leads?business_id=${businessId}`),

  updateLeadStatus: (leadId: number, businessId: number, status: LeadRead['status']) =>
    request<LeadRead>(`/api/leads/${leadId}/status?business_id=${businessId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  getSummary: (businessId: number) => request<DashboardSummary>(`/api/analytics/summary?business_id=${businessId}`),

  getFunnel: (businessId: number) => request<FunnelCounts>(`/api/analytics/funnel?business_id=${businessId}`),

  getPipeline: (businessId: number) =>
    request<Record<string, number>>(`/api/analytics/pipeline?business_id=${businessId}`),

  listConversations: (businessId: number) =>
    request<ConversationRead[]>(`/api/conversations?business_id=${businessId}`),

  getConversationMessages: (conversationId: number, businessId: number) =>
    request<MessageRead[]>(`/api/conversations/${conversationId}/messages?business_id=${businessId}`),

  createBusiness: (payload: BusinessCreatePayload) =>
    request<BusinessOnboardingResponse>('/api/onboarding/businesses', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
}
