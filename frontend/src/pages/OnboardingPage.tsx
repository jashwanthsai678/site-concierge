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

interface CharacterPreset {
  id: string
  label: string
  blurb: string
  persona: (businessName: string) => string
  greeting: (businessName: string) => string
}

// Each preset just pre-fills the persona/greeting text below — nothing
// hidden. Picking one gives a non-technical business owner a working
// starting point instead of a blank "write an AI system prompt" textarea;
// the fields stay fully editable afterward.
const CHARACTER_PRESETS: CharacterPreset[] = [
  {
    id: 'closer',
    label: 'The Closer',
    blurb: 'Sales-first. Moves quickly toward budget and contact info, minimal small talk.',
    persona: (name) =>
      `You are a confident, efficient sales assistant for ${name || 'this business'}. Keep replies short. Quickly identify what the visitor needs, present the best-fit offer, and move toward getting their contact details or booking a call. Don't linger on small talk.`,
    greeting: (name) => `Hi, I'm here to help you find the right fit at ${name || 'us'} — what are you looking for today?`,
  },
  {
    id: 'friendly-guide',
    label: 'The Friendly Guide',
    blurb: 'Casual and patient. Builds rapport before ever asking for contact info.',
    persona: (name) =>
      `You are a warm, patient guide for ${name || 'this business'}. Chat naturally, answer questions fully, and only bring up next steps like sharing contact info once the visitor seems genuinely interested. Never rush them.`,
    greeting: (name) => `Hey there! Welcome to ${name || 'us'} — happy to answer anything you're curious about.`,
  },
  {
    id: 'qualifier',
    label: 'The Qualifier',
    blurb: 'Neutral and checklist-driven. Gathers requirements, no pitching.',
    persona: (name) =>
      `You are a neutral intake assistant for ${name || 'this business'}. Understand the visitor's requirements — budget, timeline, needs — clearly and accurately, without pitching or persuading. Pass qualified visitors to the team.`,
    greeting: (name) => `Hi, I'm here to understand what you need from ${name || 'us'} so we can point you in the right direction.`,
  },
  {
    id: 'support-rep',
    label: 'The Support Rep',
    blurb: "Answers FAQs from the knowledge base. Doesn't sell or collect leads.",
    persona: (name) =>
      `You are a helpful support assistant for ${name || 'this business'}. Answer questions using what you know about the business, accurately and concisely. Do not try to sell anything or ask for contact information unless the visitor asks for it.`,
    greeting: (name) => `Hi, I'm here to help answer any questions you have about ${name || 'us'}.`,
  },
  {
    id: 'consultant',
    label: 'The Consultant',
    blurb: 'Advisory tone. Asks about goals first, then recommends and closes.',
    persona: (name) =>
      `You are a thoughtful consultant for ${name || 'this business'}. Start by understanding the visitor's goals and situation with a couple of genuine questions, then recommend the option that fits best, and guide them toward next steps once they're convinced.`,
    greeting: (name) => `Hi, I'm here to help you figure out the best option at ${name || 'us'} — mind if I ask a couple of quick questions first?`,
  },
]

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

// landing_page_slug/ad_creative_headline/ad_creative_body are required by
// the backend (they back the internal ad-simulator demo page), but a real
// client has no reason to write ad copy during signup — auto-derive
// sensible defaults so the fields never block submission, and keep them
// tucked behind "Advanced" for the rare person who wants to customize them.
function defaultAdCreative(form: FormState): { landingPageSlug: string; adHeadline: string; adBody: string } {
  const slug = form.slug || slugify(form.name)
  return {
    landingPageSlug: form.landingPageSlug || (slug ? `${slug}-demo` : ''),
    adHeadline: form.adHeadline || `Talk to ${form.name || 'us'} instantly`,
    adBody: form.adBody || `Get instant answers about ${form.industry || 'what we offer'} — no forms, no waiting.`,
  }
}

type Status = 'idle' | 'submitting' | 'success' | 'error'

/**
 * Self-serve client onboarding — the UI on top of the
 * /api/onboarding/* endpoints (see backend/app/api/routers/onboarding.py).
 */
export function OnboardingPage() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [slugTouched, setSlugTouched] = useState(false)
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
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
    }
  }

  const selectCharacter = (preset: CharacterPreset) => {
    setSelectedCharacter(preset.id)
    updateField('personaDescription', preset.persona(form.name))
    updateField('greetingTemplate', preset.greeting(form.name))
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

    const adCreative = defaultAdCreative(form)

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
        landing_page_slug: adCreative.landingPageSlug,
        ad_creative_headline: adCreative.adHeadline,
        ad_creative_body: adCreative.adBody,
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
            Paste this before the closing <code>&lt;/body&gt;</code> tag — on a page builder (Wix, Shopify,
            WordPress), look for a "Custom code" or "Embed HTML" section and paste it there. Only works from
            an origin you registered above; add one later in the portal if you skipped that step.
          </p>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-gray-900 p-3 text-[11px] leading-relaxed text-gray-100">
{`<script>
  window.QUALEADIO_CONFIG = {
    slug: "${result.slug}",
    apiBase: "${DEFAULT_API_BASE}"
  };
</script>
<script src="${window.location.origin}/widget.js" defer></script>`}
          </pre>
          <p className="mt-2 text-xs text-gray-500">
            Not comfortable editing your site's code yourself? Forward this snippet to whoever built your
            website — it's a two-line copy-paste job for them.
          </p>
        </div>
        {/* Straight into the portal, not the login form — signup already
            stored a valid session token above, so sending them to /login
            made a brand-new client retype the password they'd just set. */}
        <Link to="/portal" className="mt-6 block text-sm font-semibold underline" style={{ color: ACCENT_TEXT }}>
          Go to your portal to manage this business →
        </Link>
        <button
          type="button"
          onClick={() => {
            setForm(INITIAL_FORM)
            setSlugTouched(false)
            setSelectedCharacter(null)
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
        Sets up a working widget in a few steps — business info, how the AI should behave, and what it should know.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-8">
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">1. Your business</h2>
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
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">2. Choose how your AI behaves</h2>
          <p className="text-xs text-gray-500">
            Pick a starting character — it fills in the fields below, which you can still edit.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {CHARACTER_PRESETS.map((preset) => {
              const active = selectedCharacter === preset.id
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => selectCharacter(preset)}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    active ? 'border-current bg-gray-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  style={active ? { borderColor: ACCENT, boxShadow: `0 0 0 1px ${ACCENT}` } : undefined}
                >
                  <p className="text-xs font-semibold text-gray-900">{preset.label}</p>
                  <p className="mt-0.5 text-[11px] text-gray-500">{preset.blurb}</p>
                </button>
              )
            })}
          </div>
          <Field label="Persona description" hint="Who the AI is and how it should behave — edit freely after picking a character above">
            <textarea
              required
              rows={3}
              value={form.personaDescription}
              onChange={(e) => {
                setSelectedCharacter(null)
                updateField('personaDescription', e.target.value)
              }}
              className={INPUT_CLASS}
              placeholder="You are Maya, a friendly and knowledgeable fitness consultant..."
            />
          </Field>
          <Field label="Greeting" hint="Spoken immediately when a visitor opens the widget — never generated by the AI">
            <textarea
              required
              rows={2}
              value={form.greetingTemplate}
              onChange={(e) => {
                setSelectedCharacter(null)
                updateField('greetingTemplate', e.target.value)
              }}
              className={INPUT_CLASS}
              placeholder="Hi, I'm Maya from Acme Fitness Studio..."
            />
          </Field>
          <p className="text-[11px] text-gray-400">
            Custom widget art is coming soon — every business uses the default character for now.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">3. Where it's allowed to run</h2>
          <Field
            label="Allowed website origins"
            hint={`One per line — the exact web address(es) you'll embed the widget on, including https://, e.g. https://acmefitness.com. Optional for now — you can add this later in the portal before going live, but the widget won't load on your real site until it's set.`}
          >
            <textarea
              rows={2}
              value={form.embedOrigins}
              onChange={(e) => updateField('embedOrigins', e.target.value)}
              className={INPUT_CLASS}
              placeholder="https://acmefitness.com"
            />
          </Field>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">4. What it should know (optional)</h2>
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
          <Field label="Or crawl your real website (optional)" hint="Pulls in page content instead of/alongside the rows above">
            <input
              value={form.websiteUrl}
              onChange={(e) => updateField('websiteUrl', e.target.value)}
              className={INPUT_CLASS}
              placeholder="https://acmefitness.com"
            />
          </Field>
        </section>

        <section>
          <button
            type="button"
            onClick={() => setShowAdvanced((prev) => !prev)}
            className="text-xs font-semibold text-gray-500 underline"
          >
            {showAdvanced ? 'Hide advanced options' : 'Advanced options (optional demo landing page)'}
          </button>
          {showAdvanced && (
            <div className="mt-3 space-y-3 rounded-lg border border-dashed border-gray-200 p-3">
              <p className="text-[11px] text-gray-400">
                These only affect the built-in demo landing page — not your real website embed. We'll fill in
                sensible defaults automatically if you leave them blank.
              </p>
              <Field label="Landing page slug">
                <input
                  value={form.landingPageSlug}
                  onChange={(e) => updateField('landingPageSlug', e.target.value)}
                  className={INPUT_CLASS}
                  placeholder={form.slug ? `${form.slug}-demo` : 'acme-fitness-demo'}
                />
              </Field>
              <Field label="Ad headline">
                <input
                  value={form.adHeadline}
                  onChange={(e) => updateField('adHeadline', e.target.value)}
                  className={INPUT_CLASS}
                  placeholder={`Talk to ${form.name || 'us'} instantly`}
                />
              </Field>
              <Field label="Ad body">
                <input
                  value={form.adBody}
                  onChange={(e) => updateField('adBody', e.target.value)}
                  className={INPUT_CLASS}
                  placeholder="Get instant answers — no forms, no waiting."
                />
              </Field>
            </div>
          )}
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
