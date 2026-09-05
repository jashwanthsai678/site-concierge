import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import { useDashboardSocket } from '@/hooks/useDashboardSocket'
import { StatTile } from '@/components/dashboard/StatTile'
import { LeadPipeline } from '@/components/dashboard/LeadPipeline'
import { ConversionFunnelChart } from '@/components/dashboard/ConversionFunnelChart'
import { ConversationHistoryList } from '@/components/dashboard/ConversationHistoryList'
import { GlassCard } from '@/components/common/GlassCard'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import type { LeadRead } from '@/types/lead'

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mb-4 flex items-center justify-between rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
      <span>{message}</span>
      <button type="button" onClick={() => onRetry()} className="font-semibold underline">
        Retry
      </button>
    </div>
  )
}

function formatSeconds(seconds: number | null): string {
  if (seconds === null) return '—'
  const minutes = Math.floor(seconds / 60)
  const rest = Math.round(seconds % 60)
  return minutes > 0 ? `${minutes}m ${rest}s` : `${rest}s`
}

export function DashboardPage() {
  const queryClient = useQueryClient()

  const businessQuery = useQuery({ queryKey: ['current-business'], queryFn: api.getCurrentBusiness })
  const businessId = businessQuery.data?.id ?? null

  const { connected: liveUpdatesConnected } = useDashboardSocket(businessId)

  const summaryQuery = useQuery({
    queryKey: ['analytics-summary', businessId],
    queryFn: () => api.getSummary(businessId as number),
    enabled: businessId !== null,
  })
  const funnelQuery = useQuery({
    queryKey: ['analytics-funnel', businessId],
    queryFn: () => api.getFunnel(businessId as number),
    enabled: businessId !== null,
  })
  const leadsQuery = useQuery({
    queryKey: ['leads', businessId],
    queryFn: () => api.listLeads(businessId as number),
    enabled: businessId !== null,
  })
  const conversationsQuery = useQuery({
    queryKey: ['conversations', businessId],
    queryFn: () => api.listConversations(businessId as number),
    enabled: businessId !== null,
  })

  const handleStatusChange = async (leadId: number, status: LeadRead['status']) => {
    if (businessId === null) return
    await api.updateLeadStatus(leadId, businessId, status)
    void queryClient.invalidateQueries({ queryKey: ['leads', businessId] })
    void queryClient.invalidateQueries({ queryKey: ['analytics-pipeline', businessId] })
  }

  if (businessQuery.isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <LoadingSpinner size={28} />
      </div>
    )
  }

  if (businessQuery.isError || !businessQuery.data) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-white/60">
        No business configured yet — run the seed script.
      </div>
    )
  }

  const summary = summaryQuery.data
  const funnel = funnelQuery.data
  const leads = leadsQuery.data ?? []
  const conversations = conversationsQuery.data ?? []

  return (
    <div className="min-h-screen bg-black px-6 py-10 text-white sm:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{businessQuery.data.name}</h1>
            <p className="text-sm text-white/50">Site Concierge — live dashboard</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-white/50">
            <span
              className={`h-2 w-2 rounded-full ${liveUpdatesConnected ? 'bg-green-400' : 'bg-amber-400'}`}
              aria-hidden="true"
            />
            {liveUpdatesConnected ? 'Live' : 'Reconnecting…'}
          </div>
        </div>

        {summaryQuery.isError && <ErrorBanner message="Couldn't load today's stats." onRetry={summaryQuery.refetch} />}
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile label="Today's Visitors" value={summaryQuery.isLoading ? '…' : String(summary?.visitors_today ?? '—')} />
          <StatTile label="Today's Conversations" value={summaryQuery.isLoading ? '…' : String(summary?.conversations_today ?? '—')} />
          <StatTile label="Qualified Leads" value={summaryQuery.isLoading ? '…' : String(summary?.qualified_leads_today ?? '—')} />
          <StatTile label="Booked Meetings" value={summaryQuery.isLoading ? '…' : String(summary?.booked_meetings_today ?? '—')} />
        </div>

        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <GlassCard className="p-6 lg:col-span-2">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white/50">Conversion Funnel</h2>
            {funnelQuery.isError ? (
              <ErrorBanner message="Couldn't load the funnel." onRetry={funnelQuery.refetch} />
            ) : funnel ? (
              <ConversionFunnelChart funnel={funnel} />
            ) : (
              <LoadingSpinner />
            )}
          </GlassCard>
          <GlassCard className="p-6">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-white/50">
              Avg. Conversation Time
            </h2>
            <p className="text-3xl font-bold" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {formatSeconds(summary?.avg_conversation_seconds ?? null)}
            </p>
          </GlassCard>
        </div>

        <div className="mb-8">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white/50">Lead Pipeline</h2>
          {leadsQuery.isLoading ? (
            <LoadingSpinner />
          ) : leadsQuery.isError ? (
            <ErrorBanner message="Couldn't load leads." onRetry={leadsQuery.refetch} />
          ) : (
            <LeadPipeline leads={leads} onStatusChange={handleStatusChange} />
          )}
        </div>

        <div>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white/50">Conversation History</h2>
          {conversationsQuery.isLoading ? (
            <LoadingSpinner />
          ) : conversationsQuery.isError ? (
            <ErrorBanner message="Couldn't load conversation history." onRetry={conversationsQuery.refetch} />
          ) : (
            <ConversationHistoryList conversations={conversations} businessId={businessId as number} />
          )}
        </div>
      </div>
    </div>
  )
}
