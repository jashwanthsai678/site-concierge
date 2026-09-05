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

const TOKEN_KEY = 'site-concierge-portal-token'

export const portalAuth = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clearToken: () => localStorage.removeItem(TOKEN_KEY),
  isLoggedIn: () => Boolean(localStorage.getItem(TOKEN_KEY)),
}

async function portalRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = portalAuth.getToken()
  const res = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
    ...init,
  })
  if (res.status === 401) {
    portalAuth.clearToken()
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
}
