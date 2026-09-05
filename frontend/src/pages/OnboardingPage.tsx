import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/services/api'
import { portalApi, portalAuth } from '@/services/portalApi'
import { ACCENT, ACCENT_TEXT } from '@/lib/palette'
import { INPUT_CLASS } from '@/lib/formStyles'
import { DEFAULT_API_BASE } from '@/lib/config'
import { Field } from '@/components/common/Field'
import type { KnowledgeCategory, KnowledgeItemPayload } from '@/types/onboarding'

const CATEGORY_LABELS: Record<KnowledgeCategory, string> = {
  faq: 'FAQ',
  pricing: 'Pricing',
  product: 'Product',
  policy: 'Policy',
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

interface FormState {
  name: string
  slug: string
  email: string
  password: string
  industry: string
  personaDescription: string
  greetingTemplate: string
  brandingColor: string
  landingPageSlug: string
  adHeadline: string
  adBody: string
  websiteUrl: string
  embedOrigins: string
}

const INITIAL_FORM: FormState = {
  name: '',
  slug: '',
  email: '',
  password: '',
  industry: '',
  personaDescription: '',
  greetingTemplate: '',
  brandingColor: '#3987e5',
  landingPageSlug: '',
  adHeadline: '',
  adBody: '',
  websiteUrl: '',
  embedOrigins: '',
}

function parseOrigins(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((line) => line.trim())
    .filter(Boolean)
}

type Status = 'idle' | 'submitting' | 'success' | 'error'

/**
 * Self-serve client onboarding — the UI on top of the
 * /api/onboarding/* endpoints (see backend/app/api/routers/onboarding.py).
 * Deliberately a single form, not a polished multi-step wizard: this is the
 * first working version of "create a business without editing seed.py by
 * hand," not the final product. Mascot selection has exactly one option
 * today (see lib/mascotRegistry.ts) — the dropdown is real, just short,
 * until more character art exists. Voice selection is intentionally absent.
 */
export function OnboardingPage() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [slugTouched, setSlugTouched] = useState(false)
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItemPayload[]>([])
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [ingestWarning, setIngestWarning] = useState<string | null>(null)
  const [result, setResult] = useState<{ slug: string; landingPageSlug: string; chunksIngested: number } | null>(null)

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleNameChange = (value: string) => {
    updateField('name', value)
    if (!slugTouched) {
      updateField('slug', slugify(value))
      updateField('landingPageSlug', slugify(value) ? `${slugify(value)}-demo` : '')
    }
  }

  const addKnowledgeRow = () => {
    setKnowledgeItems((prev) => [...prev, { category: 'faq', question: '', content: '' }])
  }

  const updateKnowledgeRow = (index: number, patch: Partial<KnowledgeItemPayload>) => {
    setKnowledgeItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  const removeKnowledgeRow = (index: number) => {
    setKnowledgeItems((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setStatus('submitting')
    setError(null)
    setIngestWarning(null)

    try {
      const { business, landing_page_slug: landingPageSlug, token } = await api.createBusiness({
        slug: form.slug,
        email: form.email,
        password: form.password,
        name: form.name,
        industry: form.industry,
        persona_description: form.personaDescription,
        greeting_template: form.greetingTemplate,
        branding_color: form.brandingColor,
        landing_page_slug: form.landingPageSlug,
        ad_creative_headline: form.adHeadline,
        ad_creative_body: form.adBody,
        allowed_origins: parseOrigins(form.embedOrigins),
      })

      // Logged in immediately (same token a fresh /portal/login would
      // issue) so the knowledge/ingest calls below go through the portal's
      // already-authenticated endpoints instead of a separate, unscoped
      // onboarding-only copy of the same logic.
      portalAuth.setToken(token)

      const validKnowledgeItems = knowledgeItems.filter((item) => item.content.trim())
      if (validKnowledgeItems.length > 0) {
        await portalApi.addKnowledge(validKnowledgeItems)
      }

      // Ingestion is best-effort — a client should still get their working
      // widget even if Qdrant isn't reachable; they can add knowledge and
      // retry ingestion later once RAG is configured.
      let chunksIngested = 0
      if (validKnowledgeItems.length > 0 || form.websiteUrl.trim()) {
        try {
          const ingestResult = await portalApi.triggerIngestion(form.websiteUrl.trim() || undefined)
          chunksIngested = ingestResult.chunks_ingested
        } catch (ingestErr) {
          setIngestWarning(
            ingestErr instanceof Error
              ? ingestErr.message
              : 'Knowledge ingestion failed — you can retry it later once RAG is configured.',
          )
        }
      }

      setResult({ slug: business.slug, landingPageSlug, chunksIngested })
      setStatus('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong creating the business.')
      setStatus('error')
    }
  }

  if (status === 'success' && result) {
    return (
      <div className="min-h-screen bg-white px-6 py-16 text-gray-800">
        <div className="mx-auto max-w-lg">
        <h1 className="text-2xl font-bold text-gray-900">You're live 🎉</h1>
        <p className="mt-2 text-sm text-gray-500">
          {result.chunksIngested > 0
            ? `${result.chunksIngested} knowledge chunks were embedded for retrieval.`
            : 'No knowledge was embedded yet — you can add more and re-run ingestion anytime.'}
        </p>
        {ingestWarning && (
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">⚠ {ingestWarning}</p>
        )}
        <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Your demo page</p>
          <Link
            to={`/site/${result.landingPageSlug}`}
            className="mt-1 block text-sm font-semibold underline"
            style={{ color: ACCENT_TEXT }}
          >
            /site/{result.landingPageSlug}
          </Link>
        </div>

        <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Embed on their real website
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Paste this before the closing <code>&lt;/body&gt;</code> tag. Only works from an origin registered
            above — add it later if you skipped that step.
          </p>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-gray-900 p-3 text-[11px] leading-relaxed text-gray-100">
{`<script>
  window.SITE_CONCIERGE_CONFIG = {
    slug: "${result.slug}",
    apiBase: "${DEFAULT_API_BASE}"
  };
</script>
<script src="${window.location.origin}/widget.js" defer></script>`}
          </pre>
        </div>
        <Link to="/portal/login" className="mt-6 block text-sm font-semibold underline" style={{ color: ACCENT_TEXT }}>
          Go to your portal to manage this business →
        </Link>
        <button
          type="button"
          onClick={() => {
            setForm(INITIAL_FORM)
            setSlugTouched(false)
            setKnowledgeItems([])
            setStatus('idle')
            setResult(null)
          }}
          className="mt-4 text-sm text-gray-500 underline"
        >
          Onboard another business
        </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white px-6 py-16 text-gray-800">
      <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-bold text-gray-900">Onboard a new business</h1>
      <p className="mt-2 text-sm text-gray-500">
        Sets up a working demo widget in a few steps — business info, how the AI should talk, and what it should know.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-8">
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">Business</h2>
          <Field label="Business name">
            <input
              required
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className={INPUT_CLASS}
              placeholder="Acme Fitness Studio"
            />
          </Field>
          <Field label="URL slug" hint="Used in your dashboard/API URLs">
            <input
              required
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true)
                updateField('slug', e.target.value)
              }}
              className={INPUT_CLASS}
              placeholder="acme-fitness"
            />
          </Field>
          <Field label="Industry">
            <input
              required
              value={form.industry}
              onChange={(e) => updateField('industry', e.target.value)}
              className={INPUT_CLASS}
              placeholder="fitness"
            />
          </Field>
          <Field label="Login email" hint="Used to sign in to the portal afterward — not shown publicly">
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
              className={INPUT_CLASS}
              placeholder="owner@acmefitness.com"
            />
          </Field>
          <Field label="Password" hint="At least 8 characters">
            <input
              required
              type="password"
              minLength={8}
              value={form.password}
              onChange={(e) => updateField('password', e.target.value)}
              className={INPUT_CLASS}
              placeholder="••••••••"
            />
          </Field>
          <Field label="Branding color">
            <input
              type="color"
              value={form.brandingColor}
              onChange={(e) => updateField('brandingColor', e.target.value)}
              className="h-10 w-16 rounded border border-gray-300"
            />
          </Field>
          <Field label="Mascot" hint="Only one character exists today — more coming later">
            <select value="default" disabled className={`${INPUT_CLASS} opacity-70`}>
              <option value="default">Default</option>
            </select>
          </Field>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">How the AI should talk</h2>
          <Field label="Persona description" hint="Who the AI is and how it should behave">
            <textarea
              required
              rows={3}
              value={form.personaDescription}
              onChange={(e) => updateField('personaDescription', e.target.value)}
              className={INPUT_CLASS}
              placeholder="You are Maya, a friendly and knowledgeable fitness consultant..."
            />
          </Field>
          <Field label="Greeting" hint="Spoken immediately — never generated by the LLM">
            <textarea
              required
              rows={2}
              value={form.greetingTemplate}
              onChange={(e) => updateField('greetingTemplate', e.target.value)}
              className={INPUT_CLASS}
              placeholder="Hi, I'm Maya from Acme Fitness Studio..."
            />
          </Field>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">Demo landing page</h2>
          <Field label="Landing page slug">
            <input
              required
              value={form.landingPageSlug}
              onChange={(e) => updateField('landingPageSlug', e.target.value)}
              className={INPUT_CLASS}
              placeholder="acme-fitness-demo"
            />
          </Field>
          <Field label="Ad headline">
            <input
              required
              value={form.adHeadline}
              onChange={(e) => updateField('adHeadline', e.target.value)}
              className={INPUT_CLASS}
              placeholder="Get fit in 2026 with a real coach."
            />
          </Field>
          <Field label="Ad body">
            <input
              required
              value={form.adBody}
              onChange={(e) => updateField('adBody', e.target.value)}
              className={INPUT_CLASS}
              placeholder="Personalized training plans, no contracts."
            />
          </Field>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">Embedding on their real website</h2>
          <Field
            label="Allowed origins"
            hint="One per line — the exact scheme+host(s) they'll embed the widget on, e.g. https://theirsite.com. Required before the embed snippet will work from their site."
          >
            <textarea
              rows={2}
              value={form.embedOrigins}
              onChange={(e) => updateField('embedOrigins', e.target.value)}
              className={INPUT_CLASS}
              placeholder="https://theirsite.com"
            />
          </Field>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Knowledge (optional)</h2>
            <button type="button" onClick={addKnowledgeRow} className="text-xs font-semibold underline" style={{ color: ACCENT_TEXT }}>
              + Add row
            </button>
          </div>
          {knowledgeItems.length === 0 && (
            <p className="text-xs text-gray-400">No knowledge rows yet — add FAQs, pricing, or policies.</p>
          )}
          {knowledgeItems.map((item, index) => (
            <div key={index} className="space-y-2 rounded-lg border border-gray-200 p-3">
              <div className="flex items-center gap-2">
                <select
                  value={item.category}
                  onChange={(e) => updateKnowledgeRow(index, { category: e.target.value as KnowledgeCategory })}
                  className="flex-none w-28 rounded-lg border border-gray-300 px-2 py-2 text-xs"
                >
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <input
                  value={item.question ?? ''}
                  onChange={(e) => updateKnowledgeRow(index, { question: e.target.value })}
                  className="min-w-0 flex-1 rounded-lg border border-gray-300 px-2 py-2 text-xs"
                  placeholder="Question / title (optional)"
                />
                <button type="button" onClick={() => removeKnowledgeRow(index)} className="text-gray-400 hover:text-red-500">
                  ×
                </button>
              </div>
              <textarea
                value={item.content}
                onChange={(e) => updateKnowledgeRow(index, { content: e.target.value })}
                rows={2}
                className={`${INPUT_CLASS} text-xs`}
                placeholder="Answer / content"
              />
            </div>
          ))}
          <Field label="Or crawl their real website (optional)" hint="Ingests page content instead of/alongside the rows above">
            <input
              value={form.websiteUrl}
              onChange={(e) => updateField('websiteUrl', e.target.value)}
              className={INPUT_CLASS}
              placeholder="https://theirsite.com"
            />
          </Field>
        </section>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={status === 'submitting'}
          className="w-full rounded-lg py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: ACCENT }}
        >
          {status === 'submitting' ? 'Setting up…' : 'Create business'}
        </button>
      </form>
      </div>
    </div>
  )
}
