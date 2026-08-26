import { createRoot } from 'react-dom/client'
import { VoiceWidget } from '@/components/widget/VoiceWidget'
import { getWidgetConfig } from '@/services/widgetApi'
import widgetCss from '@/index.css?inline'

declare global {
  interface Window {
    SITE_CONCIERGE_CONFIG?: { slug: string; apiBase: string }
  }
}

// Captured synchronously at module top-level, NOT inside the async mount()
// below — `document.currentScript` is only reliable during a classic
// script's initial synchronous execution; reading it after an `await` gap
// can return null. This is where static assets (mascot images) actually
// live, which is not necessarily the same origin as `apiBase` (the backend
// API) — see lib/mascotRegistry.ts.
const SCRIPT_ORIGIN = (() => {
  const src = (document.currentScript as HTMLScriptElement | null)?.src
  return src ? new URL(src).origin : window.location.origin
})()

// The actual embeddable script a client pastes onto their own site:
//
//   <script>window.SITE_CONCIERGE_CONFIG = { slug: "acme-fitness", apiBase: "https://api.yourapp.com" };</script>
//   <script src="https://yourapp.com/widget.js" defer></script>
//
// A config global (not `document.currentScript` / a data-* attribute on
// this script tag) is used to pass in the slug/apiBase — currentScript is
// unreliable across browsers for scripts loaded with `defer`/`type=module`,
// and this is the same pattern most embeddable widgets (Intercom, Drift,
// etc.) use for exactly that reason.
//
// Mounts into a shadow root so neither the host page's CSS can affect the
// widget, nor the widget's (Tailwind-compiled) CSS can leak onto the host
// page — `?inline` pulls the fully-compiled stylesheet in as a string at
// build time so it can be injected as a <style> tag INSIDE the shadow
// root; a normal <link>/<style> at the document level would never be seen
// by shadow DOM content at all.
async function mount() {
  const config = window.SITE_CONCIERGE_CONFIG
  if (!config?.slug || !config?.apiBase) {
    console.error('[SiteConcierge] window.SITE_CONCIERGE_CONFIG with { slug, apiBase } must be set before this script loads.')
    return
  }
  const apiBase = config.apiBase.replace(/\/$/, '')

  let business
  try {
    ;({ business } = await getWidgetConfig(apiBase, config.slug))
  } catch (err) {
    console.error('[SiteConcierge] failed to load widget config:', err)
    return
  }

  const host = document.createElement('div')
  host.id = 'site-concierge-widget-host'
  document.body.appendChild(host)

  const shadow = host.attachShadow({ mode: 'open' })
  const style = document.createElement('style')
  style.textContent = widgetCss
  shadow.appendChild(style)
  const mountPoint = document.createElement('div')
  shadow.appendChild(mountPoint)

  createRoot(mountPoint).render(
    <VoiceWidget
      slug={config.slug}
      businessName={business.name}
      mascotKey={business.mascot_key}
      apiBase={apiBase}
      assetBase={SCRIPT_ORIGIN}
    />,
  )
}

mount()
