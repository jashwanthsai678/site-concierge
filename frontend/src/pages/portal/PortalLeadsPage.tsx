import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { portalApi } from '@/services/portalApi'
import { ACCENT_TEXT, LEAD_CATEGORY_COLOR } from '@/lib/palette'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { Badge, PortalCard, PortalPageHeader } from '@/components/portal/PortalUI'

// Lets a client check the actual conversation behind a lead's score/summary
// instead of taking the AI's extraction at face value — those can disagree
// with what was really said (e.g. a long conversation's score/summary only
// reflect the last few turns, see brain/extraction_engine.py's history
// window), so being able to read the transcript is the only way a client
// can catch that themselves.
function Transcript({ conversationId }: { conversationId: number }) {
  const query = useQuery({
    queryKey: ['conversation-messages', conversationId],
    queryFn: () => portalApi.getConversationMessages(conversationId),
  })

  if (query.isLoading) return <LoadingSpinner size={16} />
  if (query.isError) {
    return <p className="text-xs text-red-600">Couldn't load this transcript just now.</p>
  }

  const messages = query.data ?? []
  if (messages.length === 0) {
    return <p className="text-xs text-gray-400">No messages recorded for this conversation.</p>
  }

  return (
    <div className="space-y-2">
      {messages.map((m) => (
        <div key={m.sequence_number} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div
            className={`max-w-[85%] rounded-lg px-3 py-2 text-xs ${
              m.role === 'user' ? 'bg-gray-900 text-white' : 'border border-gray-200 bg-gray-50 text-gray-700'
            }`}
          >
            <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide opacity-60">
              {m.role === 'user' ? 'Visitor' : 'Assistant'}
            </p>
            {m.content}
          </div>
        </div>
      ))}
    </div>
  )
}

export function PortalLeadsPage() {
  const query = useQuery({ queryKey: ['portal-leads'], queryFn: portalApi.listLeads })
  const [expandedLeadId, setExpandedLeadId] = useState<number | null>(null)

  return (
    <div className="space-y-6">
      <PortalPageHeader title="Leads" description="Everyone the widget has qualified so far, newest first." />

      {query.isLoading ? (
        <LoadingSpinner size={20} />
      ) : query.isError ? (
        // Without this branch a failed fetch fell through to the empty
        // state below and told the client "No leads yet" — for a lead-gen
        // product, reporting a backend outage as "nobody contacted you" is
        // the single most damaging thing this page could say.
        <PortalCard>
          <p className="text-xs text-red-600">Couldn't load your leads just now.</p>
          <button
            type="button"
            onClick={() => void query.refetch()}
            className="mt-2 text-xs font-semibold text-gray-700 underline"
          >
            Try again
          </button>
        </PortalCard>
      ) : (query.data ?? []).length === 0 ? (
        <PortalCard>
          <p className="text-xs text-gray-400">No leads yet — they'll show up here as conversations complete.</p>
        </PortalCard>
      ) : (
        <div className="space-y-3">
          {(query.data ?? []).map((lead) => {
            const expanded = expandedLeadId === lead.id
            return (
              <PortalCard key={lead.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-500">
                    {(lead.name ?? '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-gray-900">{lead.name ?? 'Unnamed visitor'}</p>
                      <Badge color={LEAD_CATEGORY_COLOR[lead.category]}>{lead.category}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">{lead.summary}</p>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-400">
                      {lead.email && <span>{lead.email}</span>}
                      {lead.phone && <span>{lead.phone}</span>}
                      {lead.location && <span>{lead.location}</span>}
                      {lead.budget && <span>Budget: {lead.budget}</span>}
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-gray-600">Next: {lead.next_action}</p>
                      <button
                        type="button"
                        onClick={() => setExpandedLeadId(expanded ? null : lead.id)}
                        className="shrink-0 text-xs font-semibold underline"
                        style={{ color: ACCENT_TEXT }}
                      >
                        {expanded ? 'Hide transcript' : 'View transcript'}
                      </button>
                    </div>
                    {expanded && (
                      <div className="mt-3 rounded-lg border border-gray-100 bg-white p-3">
                        <Transcript conversationId={lead.conversation_id} />
                      </div>
                    )}
                  </div>
                </div>
              </PortalCard>
            )
          })}
        </div>
      )}
    </div>
  )
}
