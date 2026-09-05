import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { portalApi } from '@/services/portalApi'
import { INPUT_CLASS } from '@/lib/formStyles'
import { Field } from '@/components/common/Field'
import { PortalButton, PortalCard, PortalPageHeader } from '@/components/portal/PortalUI'
import type { PortalContext } from '@/pages/portal/PortalLayout'

function parseOrigins(value: string): string[] {
  return value.split(/[\n,]/).map((line) => line.trim()).filter(Boolean)
}

export function PortalSettingsPage() {
  const { business, refetchBusiness } = useOutletContext<PortalContext>()
  const [name, setName] = useState(business.name)
  const [industry, setIndustry] = useState(business.industry)
  const [brandingColor, setBrandingColor] = useState(business.branding_color)
  const [embedOrigins, setEmbedOrigins] = useState(business.allowed_origins.join('\n'))
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setStatus('saving')
    setError(null)
    try {
      await portalApi.updateMe({
        name,
        industry,
        branding_color: brandingColor,
        allowed_origins: parseOrigins(embedOrigins),
      })
      refetchBusiness()
      setStatus('saved')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save.')
      setStatus('error')
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <PortalPageHeader
        title="Settings"
        description="Business identity and where your widget is allowed to run. Looking for persona, greeting, or mascot? Head to Bot Setup."
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <PortalCard className="space-y-5">
          <Field label="Business name">
            <input value={name} onChange={(e) => setName(e.target.value)} className={INPUT_CLASS} />
          </Field>
          <Field label="Industry">
            <input value={industry} onChange={(e) => setIndustry(e.target.value)} className={INPUT_CLASS} />
          </Field>
          <Field label="Branding color">
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={brandingColor}
                onChange={(e) => setBrandingColor(e.target.value)}
                className="h-10 w-16 cursor-pointer rounded-lg border border-gray-300"
              />
              <span className="font-mono text-sm text-gray-500">{brandingColor}</span>
            </div>
          </Field>
        </PortalCard>

        <PortalCard>
          <Field
            label="Allowed embed origins"
            hint="One per line — exact scheme + host (e.g. https://theirsite.com) the widget is allowed to run from."
          >
            <textarea
              rows={3}
              value={embedOrigins}
              onChange={(e) => setEmbedOrigins(e.target.value)}
              className={INPUT_CLASS}
              placeholder="https://theirsite.com"
            />
          </Field>
        </PortalCard>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
        {status === 'saved' && <p className="text-xs font-medium text-green-600">Saved.</p>}

        <PortalButton type="submit" disabled={status === 'saving'}>
          {status === 'saving' ? 'Saving…' : 'Save changes'}
        </PortalButton>
      </form>
    </div>
  )
}
