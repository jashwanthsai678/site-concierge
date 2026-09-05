import { useOutletContext, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { portalApi } from '@/services/portalApi'
import { ACCENT, ACCENT_TEXT } from '@/lib/palette'
import { AnimatedCharacter } from '@/components/voice/AnimatedCharacter'
import { SpeechBubble } from '@/components/voice/SpeechBubble'
import { PortalCard, PortalPageHeader, PreviewFrame } from '@/components/portal/PortalUI'
import { CheckIcon } from '@/components/portal/icons'
import type { MascotEnergy } from '@/lib/mascotRegistry'
import type { PortalContext } from '@/pages/portal/PortalLayout'

interface ChecklistItem {
  label: string
  done: boolean
  to: string
  cta: string
}

export function PortalOverviewPage() {
  const { business } = useOutletContext<PortalContext>()
  const knowledgeQuery = useQuery({ queryKey: ['portal-knowledge'], queryFn: portalApi.listKnowledge })
  const leadsQuery = useQuery({ queryKey: ['portal-leads'], queryFn: portalApi.listLeads })

  const hasKnowledge = (knowledgeQuery.data?.length ?? 0) > 0
  const hasPersona = business.persona_description.trim().length > 0
  const hasEmbedOrigin = business.allowed_origins.length > 0

  const checklist: ChecklistItem[] = [
    { label: 'Tell your bot what to focus on', done: hasPersona, to: '/portal/bot-setup', cta: 'Set up focus' },
    { label: 'Add knowledge for your bot to use', done: hasKnowledge, to: '/portal/knowledge', cta: 'Add knowledge' },
    { label: 'Register a site to embed on', done: hasEmbedOrigin, to: '/portal/settings', cta: 'Add origin' },
    { label: 'Copy the embed snippet onto your site', done: false, to: '/portal/embed', cta: 'Get snippet' },
  ]
  const doneCount = checklist.filter((c) => c.done).length
  const progressPct = Math.round((doneCount / checklist.length) * 100)

  const loadFailed = knowledgeQuery.isError || leadsQuery.isError

  return (
    <div className="space-y-8">
      <PortalPageHeader title="Overview" description={`Welcome back, ${business.name}.`} />

      {loadFailed && (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
          <span>Some of this page couldn't load — the numbers below may be incomplete.</span>
          <button
            type="button"
            onClick={() => {
              void knowledgeQuery.refetch()
              void leadsQuery.refetch()
            }}
            className="font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <StatCard
          label="Knowledge rows"
          value={knowledgeQuery.data?.length ?? 0}
          loading={knowledgeQuery.isLoading}
          error={knowledgeQuery.isError}
        />
        <StatCard
          label="Leads captured"
          value={leadsQuery.data?.length ?? 0}
          loading={leadsQuery.isLoading}
          error={leadsQuery.isError}
        />
        <StatCard
          label="Hot leads"
          value={leadsQuery.data?.filter((l) => l.category === 'Hot').length ?? 0}
          loading={leadsQuery.isLoading}
          error={leadsQuery.isError}
          accent="#d03b3b"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        <PortalCard>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Setup checklist</h2>
            <span className="text-xs font-medium text-gray-400">{doneCount} of {checklist.length} done</span>
          </div>

          <div className="mb-5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progressPct}%`, backgroundColor: ACCENT }}
            />
          </div>

          <div className="space-y-1">
            {checklist.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                className="flex items-center justify-between rounded-lg px-2 py-2.5 hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: item.done ? '#22c55e' : '#e5e7eb' }}
                  >
                    {item.done && <CheckIcon className="h-3 w-3 text-white" />}
                  </span>
                  <span className={`text-sm ${item.done ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                    {item.label}
                  </span>
                </div>
                {!item.done && (
                  <span className="shrink-0 text-xs font-semibold" style={{ color: ACCENT_TEXT }}>
                    {item.cta} →
                  </span>
                )}
              </Link>
            ))}
          </div>
        </PortalCard>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Your bot right now</p>
          <PreviewFrame label={business.name}>
            <SpeechBubble text={business.greeting_template} />
            <AnimatedCharacter
              state="idle"
              mascotKey={business.mascot_key}
              customImageUrl={business.mascot_image_url}
              energy={business.mascot_energy as MascotEnergy}
              compact
            />
          </PreviewFrame>
          <Link to="/portal/bot-setup" className="mt-2 block text-center text-xs font-semibold" style={{ color: ACCENT_TEXT }}>
            Edit bot setup →
          </Link>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  accent = ACCENT,
  loading,
  error,
}: {
  label: string
  value: number
  accent?: string
  loading?: boolean
  error?: boolean
}) {
  return (
    <PortalCard className="p-5">
      <p
        className="text-3xl font-bold"
        style={{ color: error ? '#9ca3af' : accent, fontVariantNumeric: 'tabular-nums' }}
      >
        {error ? '—' : loading ? '…' : value}
      </p>
      <p className="mt-1 text-xs font-medium text-gray-500">{label}</p>
    </PortalCard>
  )
}
