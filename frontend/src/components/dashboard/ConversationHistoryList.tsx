import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import type { ConversationRead } from '@/types/analytics'

export function ConversationHistoryList({ conversations }: { conversations: ConversationRead[] }) {
  const [expandedId, setExpandedId] = useState<number | null>(null)

  return (
    <div className="flex flex-col gap-2">
      {conversations.length === 0 && <p className="text-xs text-white/40">No conversations yet.</p>}
      {conversations.map((c) => (
        <div key={c.id} className="rounded-xl border border-white/10 bg-white/[0.03]">
          <button
            type="button"
            onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <div>
              <p className="text-sm text-white">
                Conversation #{c.id} · {c.turn_count} turn{c.turn_count !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-white/40">{new Date(c.created_at).toLocaleString()}</p>
            </div>
            <span className="text-xs capitalize text-white/50">
              {c.current_stage.replace('_', ' ')} · {c.status}
            </span>
          </button>
          {expandedId === c.id && <TranscriptDetail conversationId={c.id} />}
        </div>
      ))}
    </div>
  )
}

function TranscriptDetail({ conversationId }: { conversationId: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ['conversation-messages', conversationId],
    queryFn: () => api.getConversationMessages(conversationId),
  })

  if (isLoading) return <p className="px-4 pb-3 text-xs text-white/30">Loading transcript…</p>

  return (
    <div className="border-t border-white/10 px-4 py-3">
      {(data ?? []).map((m, i) => (
        <p key={i} className="mb-1.5 text-xs">
          <span className={m.role === 'user' ? 'text-blue-300' : 'text-white/60'}>
            {m.role === 'user' ? 'Visitor' : 'AI'}:
          </span>{' '}
          <span className="text-white/80">{m.content}</span>
        </p>
      ))}
    </div>
  )
}
