import type {
  BusinessAdminRead,
  BusinessAdminUpdate,
  ImpersonateResponse,
  StaffLoginRequest,
  StaffLoginResponse,
  StaffPublic,
  TeamUsageSummary,
} from '@/types/team'

// Deliberately a different key than portalApi's TOKEN_KEY — a staff member
// impersonating a business needs both a live team session (this tab) and a
// live business portal session (the impersonated tab) at once, in the same
// browser. Sharing one localStorage key would let either login clobber the
// other.
const TOKEN_KEY = 'qualeadio-team-token'

export const teamAuth = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clearToken: () => localStorage.removeItem(TOKEN_KEY),
  isLoggedIn: () => Boolean(localStorage.getItem(TOKEN_KEY)),
}

/**
 * FastAPI reports a rejected field as `detail: [{ msg, loc }, ...]`, not a
 * string. That shape previously fell through to the generic
 * "Request to /api/... failed (422)", hiding messages written specifically
 * to tell the client what to fix.
 */
function readableDetail(detail: unknown): string | null {
  if (typeof detail === 'string') return detail
  if (!Array.isArray(detail)) return null
  const messages = detail
    .map((item) => (typeof item?.msg === 'string' ? item.msg.replace(/^Value error,\s*/, '') : null))
    .filter((m): m is string => Boolean(m))
  return messages.length ? messages.join(' ') : null
}

async function teamRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = teamAuth.getToken()
  const res = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
    ...init,
  })
  if (res.status === 401) {
    // Clearing the token alone would leave the dashboard stranded: the team
    // shell stays mounted while navigating between its pages, so nothing
    // would re-check auth and every request would just keep failing with
    // "Invalid or expired session" forever. A hard navigation both
    // redirects and resets all in-memory query state.
    teamAuth.clearToken()
    if (!window.location.pathname.startsWith('/team/login')) {
      window.location.assign('/team/login')
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
    throw new Error(readableDetail(detail) ?? `Request to ${path} failed (${res.status}): ${body}`)
  }
  return res.status === 204 ? (undefined as T) : (res.json() as Promise<T>)
}

export const teamApi = {
  login: (payload: StaffLoginRequest) =>
    teamRequest<StaffLoginResponse>('/api/team/auth/login', { method: 'POST', body: JSON.stringify(payload) }),

  logout: () => teamRequest<void>('/api/team/auth/logout', { method: 'POST' }),

  getMe: () => teamRequest<StaffPublic>('/api/team/auth/me'),

  listBusinesses: () => teamRequest<BusinessAdminRead[]>('/api/team/businesses'),

  getBusiness: (id: number) => teamRequest<BusinessAdminRead>(`/api/team/businesses/${id}`),

  updateBusiness: (id: number, payload: BusinessAdminUpdate) =>
    teamRequest<BusinessAdminRead>(`/api/team/businesses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  suspendBusiness: (id: number) =>
    teamRequest<BusinessAdminRead>(`/api/team/businesses/${id}/suspend`, { method: 'POST' }),

  reactivateBusiness: (id: number) =>
    teamRequest<BusinessAdminRead>(`/api/team/businesses/${id}/reactivate`, { method: 'POST' }),

  impersonateBusiness: (id: number) =>
    teamRequest<ImpersonateResponse>(`/api/team/businesses/${id}/impersonate`, { method: 'POST' }),

  getUsage: () => teamRequest<TeamUsageSummary>('/api/team/usage'),
}
