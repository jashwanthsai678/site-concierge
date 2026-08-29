import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { portalApi } from '@/services/portalApi'
import { ACCENT } from '@/lib/palette'
import { INPUT_CLASS } from '@/lib/formStyles'
import { Field } from '@/components/common/Field'
import type { PortalContext } from '@/pages/portal/PortalLayout'

function parseOrigins(value: string): string[] {
  return value.split(/[\n,]/).map((line) => line.trim()).filter(Boolean)
}

export function PortalSettingsPage() {
  const { business, refetchBusiness } = useOutletContext<PortalContext>()
  const [name, setName] = useState(business.name)
  const [industry, setIndustry] = useState(business.industry)
  const [personaDescription, setPersonaDescription] = useState('')
  const [greetingTemplate, setGreetingTemplate] = useState('')
  const [brandingColor, setBrandingColor] = useState(business.branding_color)
  const [embedOrigins, setEmbedOrigins] = useState('')
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
        persona_description: personaDescription || undefined,
        greeting_template: greetingTemplate || undefined,
        branding_color: brandingColor,
        allowed_origins: embedOrigins.trim() ? parseOrigins(embedOrigins) : undefined,
      })
      refetchBusiness()
      setStatus('saved')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save.')
      setStatus('error')
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Business settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Persona and greeting fields are left blank below on purpose — leave them empty to keep what's already
          configured, or type a new value to replace it.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label="Business name">
          <input value={name} onChange={(e) => setName(e.target.value)} className={INPUT_CLASS} />
        </Field>
        <Field label="Industry">
          <input value={industry} onChange={(e) => setIndustry(e.target.value)} className={INPUT_CLASS} />
        </Field>
        <Field label="Branding color">
          <input
            type="color"
            value={brandingColor}
            onChange={(e) => setBrandingColor(e.target.value)}
            className="h-10 w-16 rounded border border-gray-300"
          />
        </Field>
        <Field label="Persona description" hint="Leave blank to keep the current one">
          <textarea
            rows={3}
            value={personaDescription}
            onChange={(e) => setPersonaDescription(e.target.value)}
            className={INPUT_CLASS}
            placeholder="You are Maya, a friendly and knowledgeable fitness consultant..."
          />
        </Field>
        <Field label="Greeting" hint="Leave blank to keep the current one">
          <textarea
            rows={2}
            value={greetingTemplate}
            onChange={(e) => setGreetingTemplate(e.target.value)}
            className={INPUT_CLASS}
            placeholder="Hi, I'm Maya from Acme Fitness Studio..."
          />
        </Field>
        <Field
          label="Allowed embed origins"
          hint="One per line. Leave blank to keep what's registered — this replaces the whole list, it doesn't add to it."
        >
          <textarea
            rows={2}
            value={embedOrigins}
            onChange={(e) => setEmbedOrigins(e.target.value)}
            className={INPUT_CLASS}
            placeholder="https://theirsite.com"
          />
        </Field>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
        {status === 'saved' && <p className="text-xs text-green-600">Saved.</p>}

        <button
          type="submit"
          disabled={status === 'saving'}
          className="rounded-lg px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: ACCENT }}
        >
          {status === 'saving' ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  )
}
