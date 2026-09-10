import type { CampaignLandingPage, StartConversationResponse } from '@/types/business'
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

// Unauthenticated, public endpoints only. Anything that reads or writes a
// business's own data (leads, analytics, conversations) lives in
// portalApi.ts, which attaches the session token — those used to be here,
// taking a `?business_id=` that nothing verified.
export const api = {
  getLandingPage: (slug: string) => request<CampaignLandingPage>(`/api/pages/${slug}`),

  startConversation: (slug: string) =>
    request<StartConversationResponse>(`/api/pages/${slug}/start`, { method: 'POST' }),

  createBusiness: (payload: BusinessCreatePayload) =>
    request<BusinessOnboardingResponse>('/api/onboarding/businesses', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
}
