import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { teamApi } from '@/services/teamApi'
import { portalAuth } from '@/services/portalApi'
import { INPUT_CLASS } from '@/lib/formStyles'
import { Field } from '@/components/common/Field'
import { Badge, PortalButton, PortalCard, PortalPageHeader } from '@/components/portal/PortalUI'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import type { BusinessAdminRead, BusinessAdminUpdate } from '@/types/team'

const ACTIVE_COLOR = '#199e70'
const SUSPENDED_COLOR = '#d03b3b'

function parseOrigins(value: string): string[] {
  return value.split(/[\n,]/).map((line) => line.trim()).filter(Boolean)
}

function sameOrigins(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i])
}

export function TeamBusinessDetailPage() {
  const { id } = useParams<{ id: string }>()
  const businessId = Number(id)

  const query = useQuery({
    queryKey: ['team-business', businessId],
    queryFn: () => teamApi.getBusiness(businessId),
    enabled: Number.isFinite(businessId),
  })

  const [suspendError, setSuspendError] = useState<string | null>(null)
  const [suspending, setSuspending] = useState(false)
  const [impersonateError, setImpersonateError] = useState<string | null>(null)
  const [impersonating, setImpersonating] = useState(false)

  const handleToggleActive = async (business: BusinessAdminRead) => {
    if (business.is_active && !window.confirm(`Suspend ${business.name}? This immediately ends any of their live portal sessions.`)) {
      return
    }
    setSuspending(true)
    setSuspendError(null)
    try {
      if (business.is_active) {
        await teamApi.suspendBusiness(business.id)
      } else {
        await teamApi.reactivateBusiness(business.id)
      }
      await query.refetch()
    } catch (err) {
      setSuspendError(err instanceof Error ? err.message : 'Failed to update status.')
    } finally {
      setSuspending(false)
    }
  }

  const handleImpersonate = async (business: BusinessAdminRead) => {
    setImpersonating(true)
    setImpersonateError(null)
    try {
      const { token } = await teamApi.impersonateBusiness(business.id)
      // A normal business portal session token — dropped into the
      // customer portal's own auth storage (a separate key from the team
      // token) so it doesn't disturb this staff session at all.
      portalAuth.setToken(token)
      // Opened in a new tab deliberately: the staff member's own /team
      // session should stay live in this tab rather than getting replaced
      // by the client's portal.
      window.open('/portal', '_blank')
    } catch (err) {
      setImpersonateError(err instanceof Error ? err.message : 'Failed to impersonate.')
    } finally {
      setImpersonating(false)
    }
  }

  if (!Number.isFinite(businessId)) {
    return (
      <PortalCard>
        <p className="text-xs text-red-600">Invalid business id.</p>
      </PortalCard>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/team/businesses" className="text-xs font-semibold text-gray-500 hover:underline">
          ← All businesses
        </Link>
      </div>

      {query.isLoading ? (
        <LoadingSpinner size={20} />
      ) : query.isError || !query.data ? (
        <PortalCard>
          <p className="text-xs text-red-600">Couldn't load this business just now.</p>
          <button
            type="button"
            onClick={() => void query.refetch()}
            className="mt-2 text-xs font-semibold text-gray-700 underline"
          >
            Try again
          </button>
        </PortalCard>
      ) : (
        <>
          <PortalPageHeader
            title={query.data.name}
            description={
              <span className="flex items-center gap-2">
                {query.data.slug}
                <Badge color={query.data.is_active ? ACTIVE_COLOR : SUSPENDED_COLOR}>
                  {query.data.is_active ? 'Active' : 'Suspended'}
                </Badge>
              </span>
            }
          />

          <PortalCard className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">Account status</p>
                <p className="text-xs text-gray-500">Suspending immediately ends any live portal sessions.</p>
              </div>
              <PortalButton
                variant={query.data.is_active ? 'secondary' : 'primary'}
                disabled={suspending}
                onClick={() => handleToggleActive(query.data as BusinessAdminRead)}
              >
                {suspending ? 'Working…' : query.data.is_active ? 'Suspend business' : 'Reactivate business'}
              </PortalButton>
            </div>
            {suspendError && <p className="text-xs text-red-600">{suspendError}</p>}
          </PortalCard>

          <PortalCard className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">Impersonate</p>
                <p className="text-xs text-gray-500">
                  Opens a new tab logged into this business's real portal, exactly as they see it — your team
                  session here stays active.
                </p>
              </div>
              <PortalButton
                variant="secondary"
                disabled={impersonating || !query.data.is_active}
                onClick={() => handleImpersonate(query.data as BusinessAdminRead)}
              >
                {impersonating ? 'Opening…' : 'Impersonate'}
              </PortalButton>
            </div>
            {!query.data.is_active && (
              <p className="text-xs text-gray-400">Reactivate this business first — a suspended business can't be impersonated.</p>
            )}
            {impersonateError && <p className="text-xs text-red-600">{impersonateError}</p>}
          </PortalCard>

          <BusinessEditForm
            key={query.data.id}
            business={query.data}
            onSaved={() => void query.refetch()}
          />
        </>
      )}
    </div>
  )
}

function BusinessEditForm({ business, onSaved }: { business: BusinessAdminRead; onSaved: () => void }) {
  const [name, setName] = useState(business.name)
  const [industry, setIndustry] = useState(business.industry)
  const [personaDescription, setPersonaDescription] = useState(business.persona_description)
  const [greetingTemplate, setGreetingTemplate] = useState(business.greeting_template)
  const [brandingColor, setBrandingColor] = useState(business.branding_color)
  const [allowedOrigins, setAllowedOrigins] = useState(business.allowed_origins.join('\n'))
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setStatus('saving')
    setError(null)

    // Only send what actually changed — this is a PATCH.
    const payload: BusinessAdminUpdate = {}
    if (name !== business.name) payload.name = name
    if (industry !== business.industry) payload.industry = industry
    if (personaDescription !== business.persona_description) payload.persona_description = personaDescription
    if (greetingTemplate !== business.greeting_template) payload.greeting_template = greetingTemplate
    if (brandingColor !== business.branding_color) payload.branding_color = brandingColor
    const origins = parseOrigins(allowedOrigins)
    if (!sameOrigins(origins, business.allowed_origins)) payload.allowed_origins = origins

    if (Object.keys(payload).length === 0) {
      setStatus('idle')
      return
    }

    try {
      await teamApi.updateBusiness(business.id, payload)
      onSaved()
      setStatus('saved')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save.')
      setStatus('error')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PortalCard className="space-y-5">
        <Field label="Business name">
          <input value={name} onChange={(e) => setName(e.target.value)} className={INPUT_CLASS} />
        </Field>
        <Field label="Industry">
          <input value={industry} onChange={(e) => setIndustry(e.target.value)} className={INPUT_CLASS} />
        </Field>
        <Field label="Persona description" hint="How the AI is instructed to present itself in conversation.">
          <textarea
            rows={3}
            value={personaDescription}
            onChange={(e) => setPersonaDescription(e.target.value)}
            className={INPUT_CLASS}
          />
        </Field>
        <Field label="Greeting" hint="Spoken immediately when a visitor opens the widget.">
          <textarea
            rows={2}
            value={greetingTemplate}
            onChange={(e) => setGreetingTemplate(e.target.value)}
            className={INPUT_CLASS}
          />
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
          label="Allowed website origins"
          hint="One per line — exact scheme + host (e.g. https://theirsite.com) the widget is allowed to run from."
        >
          <textarea
            rows={3}
            value={allowedOrigins}
            onChange={(e) => setAllowedOrigins(e.target.value)}
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
  )
}
