import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { DEFAULT_API_BASE } from '@/lib/config'
import { PortalCard, PortalPageHeader } from '@/components/portal/PortalUI'
import { CheckIcon, CopyIcon } from '@/components/portal/icons'
import type { PortalContext } from '@/pages/portal/PortalLayout'

export function PortalEmbedPage() {
  const { business } = useOutletContext<PortalContext>()
  const [copied, setCopied] = useState(false)

  const snippet = `<script>
  window.SITE_CONCIERGE_CONFIG = {
    slug: "${business.slug}",
    apiBase: "${DEFAULT_API_BASE}"
  };
</script>
<script src="${window.location.origin}/widget.js" defer></script>`

  const handleCopy = () => {
    navigator.clipboard.writeText(snippet)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PortalPageHeader
        title="Embed snippet"
        description={
          <>
            Paste this before the closing <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">&lt;/body&gt;</code> tag
            on your website. Only works from an origin registered under Settings → Allowed embed origins.
          </>
        }
      />

      <PortalCard className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-300" />
            <span className="ml-2 text-[11px] font-medium text-gray-400">index.html</span>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-200/60"
          >
            {copied ? (
              <>
                <CheckIcon className="h-3.5 w-3.5 text-green-600" />
                <span className="text-green-600">Copied</span>
              </>
            ) : (
              <>
                <CopyIcon className="h-3.5 w-3.5" />
                Copy
              </>
            )}
          </button>
        </div>
        <pre className="overflow-x-auto bg-gray-900 p-4 text-xs leading-relaxed text-gray-100">{snippet}</pre>
      </PortalCard>
    </div>
  )
}
