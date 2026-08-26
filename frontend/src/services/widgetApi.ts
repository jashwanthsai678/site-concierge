import type { BusinessPublic, StartConversationResponse } from '@/types/business'

// Absolute-URL counterpart to services/api.ts, used only by the standalone
// embeddable widget (widget-embed.tsx) and VoiceWidget when given an
// `apiBase` — an external site has no Vite dev proxy, so calls must target
// the backend's real origin directly rather than a relative `/api/...`
// path, and must hit the campaign-free /api/widget/* endpoints rather than
// /api/pages/* (built for the ad-simulator demo's Campaign concept).

async function widgetRequest<T>(apiBase: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiBase}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  })
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
  return res.json() as Promise<T>
}

export function getWidgetConfig(apiBase: string, slug: string) {
  return widgetRequest<{ business: BusinessPublic }>(apiBase, `/api/widget/${slug}/config`)
}

export function startEmbeddedConversation(apiBase: string, slug: string) {
  return widgetRequest<StartConversationResponse>(apiBase, `/api/widget/${slug}/start`, { method: 'POST' })
}
