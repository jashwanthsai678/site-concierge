import type { KnowledgeItemPayload } from '@/types/onboarding'
import type {
  KnowledgeItemRead,
  KnowledgeItemUpdate,
  LoginRequest,
  LoginResponse,
  PortalBusinessRead,
  PortalBusinessUpdate,
} from '@/types/portal'
import type { LeadRead } from '@/types/lead'
import type { ConversationRead, DashboardSummary, FunnelCounts, MessageRead } from '@/types/analytics'

const TOKEN_KEY = 'site-concierge-portal-token'

export const portalAuth = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clearToken: () => localStorage.removeItem(TOKEN_KEY),
  isLoggedIn: () => Boolean(localStorage.getItem(TOKEN_KEY)),
}

async function portalRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = portalAuth.getToken()
  // FormData (file uploads) must NOT get an explicit Content-Type — the
  // browser sets its own multipart boundary, which a manual header would
  // override and break.
  const isFormData = init?.body instanceof FormData
  const res = await fetch(path, {
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
    ...init,
  })
  if (res.status === 401) {
    // Clearing the token alone left the client stranded: the portal shell
    // stays mounted while navigating between its pages, so nothing
    // re-checked auth and every save just failed with "Invalid or expired
    // session" forever. A hard navigation both redirects and resets all
    // in-memory query state, which a client-side route change would not.
    portalAuth.clearToken()
    if (!window.location.pathname.startsWith('/portal/login')) {
      window.location.assign('/portal/login')
    }
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    const detail = (() => {
      try {
        return JSON.parse(body)?.detail
      } catch {
        return undefined
      }
    })()
    throw new Error(typeof detail === 'string' ? detail : `Request to ${path} failed (${res.status}): ${body}`)
  }
  return res.status === 204 ? (undefined as T) : (res.json() as Promise<T>)
}

export const portalApi = {
  login: (payload: LoginRequest) =>
    portalRequest<LoginResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) }),

  logout: () => portalRequest<void>('/api/auth/logout', { method: 'POST' }),

  getMe: () => portalRequest<PortalBusinessRead>('/api/portal/me'),

  updateMe: (payload: PortalBusinessUpdate) =>
    portalRequest<PortalBusinessRead>('/api/portal/me', { method: 'PATCH', body: JSON.stringify(payload) }),

  listKnowledge: () => portalRequest<KnowledgeItemRead[]>('/api/portal/knowledge'),

  addKnowledge: (items: KnowledgeItemPayload[]) =>
    portalRequest<{ items_added: number }>('/api/portal/knowledge', {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),

  updateKnowledgeItem: (itemId: number, payload: KnowledgeItemUpdate) =>
    portalRequest<KnowledgeItemRead>(`/api/portal/knowledge/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteKnowledgeItem: (itemId: number) =>
    portalRequest<void>(`/api/portal/knowledge/${itemId}`, { method: 'DELETE' }),

  triggerIngestion: (websiteUrl?: string) =>
    portalRequest<{ chunks_ingested: number }>('/api/portal/ingest', {
      method: 'POST',
      body: JSON.stringify({ website_url: websiteUrl || null }),
    }),

  listLeads: () => portalRequest<LeadRead[]>('/api/portal/leads'),

  // --- Dashboard ---
  // These used to live in services/api.ts and pass `?business_id=` with no
  // auth at all, which meant anyone could read any business's leads and
  // transcripts. They're here now because they share the portal's auth
  // model: the backend derives the business from this token and ignores
  // anything the caller claims about which business it is.
  updateLeadStatus: (leadId: number, status: LeadRead['status']) =>
    portalRequest<LeadRead>(`/api/leads/${leadId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  listDashboardLeads: () => portalRequest<LeadRead[]>('/api/leads'),

  getSummary: () => portalRequest<DashboardSummary>('/api/analytics/summary'),

  getFunnel: () => portalRequest<FunnelCounts>('/api/analytics/funnel'),

  getPipeline: () => portalRequest<Record<string, number>>('/api/analytics/pipeline'),

  listConversations: () => portalRequest<ConversationRead[]>('/api/conversations'),

  getConversationMessages: (conversationId: number) =>
    portalRequest<MessageRead[]>(`/api/conversations/${conversationId}/messages`),

  uploadMascotImage: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return portalRequest<PortalBusinessRead>('/api/portal/mascot-image', { method: 'POST', body: formData })
  },

  removeMascotImage: () => portalRequest<PortalBusinessRead>('/api/portal/mascot-image', { method: 'DELETE' }),
}
