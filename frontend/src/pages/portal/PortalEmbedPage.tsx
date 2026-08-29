import { useOutletContext } from 'react-router-dom'
import { DEFAULT_API_BASE } from '@/lib/config'
import type { PortalContext } from '@/pages/portal/PortalLayout'

export function PortalEmbedPage() {
  const { business } = useOutletContext<PortalContext>()

  const snippet = `<script>
  window.SITE_CONCIERGE_CONFIG = {
    slug: "${business.slug}",
    apiBase: "${DEFAULT_API_BASE}"
  };
</script>
<script src="${window.location.origin}/widget.js" defer></script>`

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Embed snippet</h1>
        <p className="mt-1 text-sm text-gray-500">
          Paste this before the closing <code>&lt;/body&gt;</code> tag on your website. Only works from an origin
          registered under Settings → Allowed embed origins.
        </p>
      </div>
      <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-xs leading-relaxed text-gray-100">{snippet}</pre>
      <button
        type="button"
        onClick={() => navigator.clipboard.writeText(snippet)}
        className="rounded-lg border border-gray-300 px-4 py-1.5 text-xs font-semibold text-gray-700"
      >
        Copy to clipboard
      </button>
    </div>
  )
}
