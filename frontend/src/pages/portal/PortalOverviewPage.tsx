import { useOutletContext, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { portalApi } from '@/services/portalApi'
import { ACCENT } from '@/lib/palette'
import { AnimatedCharacter } from '@/components/voice/AnimatedCharacter'
import { SpeechBubble } from '@/components/voice/SpeechBubble'
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Overview</h1>
        <p className="mt-1 text-sm text-gray-500">Welcome back, {business.name}.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_260px]">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Setup checklist</h2>
            <span className="text-xs text-gray-400">{doneCount} of {checklist.length} done</span>
          </div>
          {checklist.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 hover:border-gray-300"
            >
              <div className="flex items-center gap-3">
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs text-white"
                  style={{ backgroundColor: item.done ? '#22c55e' : '#d1d5db' }}
                >
                  {item.done ? '✓' : ''}
                </span>
                <span className={`text-sm ${item.done ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                  {item.label}
                </span>
              </div>
              {!item.done && (
                <span className="text-xs font-semibold" style={{ color: ACCENT }}>
                  {item.cta} →
                </span>
              )}
            </Link>
          ))}

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <StatTile label="Knowledge rows" value={knowledgeQuery.data?.length ?? 0} />
            <StatTile label="Leads captured" value={leadsQuery.data?.length ?? 0} />
            <StatTile
              label="Hot leads"
              value={leadsQuery.data?.filter((l) => l.category === 'Hot').length ?? 0}
            />
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Your bot right now</p>
          <div className="flex h-64 flex-col items-center justify-end gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
            <SpeechBubble text={business.greeting_template} />
            <AnimatedCharacter
              state="idle"
              mascotKey={business.mascot_key}
              energy={business.mascot_energy as MascotEnergy}
              compact
            />
          </div>
          <Link to="/portal/bot-setup" className="mt-2 block text-center text-xs font-semibold" style={{ color: ACCENT }}>
            Edit bot setup →
          </Link>
        </div>
      </div>
    </div>
  )
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gray-100 p-3">
      <p className="text-lg font-bold text-gray-900">{value}</p>
      <p className="text-[11px] text-gray-500">{label}</p>
    </div>
  )
}
