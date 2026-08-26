import type { BusinessPublic, CampaignLandingPage, StartConversationResponse } from '@/types/business'
import type { LeadRead } from '@/types/lead'
import type { ConversationRead, DashboardSummary, FunnelCounts, MessageRead } from '@/types/analytics'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Request to ${path} failed (${res.status}): ${body}`)
  }
  return res.json() as Promise<T>
}

export const api = {
  getCurrentBusiness: () => request<BusinessPublic>('/api/business/current'),

  getLandingPage: (slug: string) => request<CampaignLandingPage>(`/api/pages/${slug}`),

  startConversation: (slug: string) =>
    request<StartConversationResponse>(`/api/pages/${slug}/start`, { method: 'POST' }),

  listLeads: (businessId: number) => request<LeadRead[]>(`/api/leads?business_id=${businessId}`),

  updateLeadStatus: (leadId: number, status: LeadRead['status']) =>
    request<LeadRead>(`/api/leads/${leadId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  getSummary: (businessId: number) => request<DashboardSummary>(`/api/analytics/summary?business_id=${businessId}`),

  getFunnel: (businessId: number) => request<FunnelCounts>(`/api/analytics/funnel?business_id=${businessId}`),

  getPipeline: (businessId: number) =>
    request<Record<string, number>>(`/api/analytics/pipeline?business_id=${businessId}`),

  listConversations: (businessId: number) =>
    request<ConversationRead[]>(`/api/conversations?business_id=${businessId}`),

  getConversationMessages: (conversationId: number) =>
    request<MessageRead[]>(`/api/conversations/${conversationId}/messages`),
}
