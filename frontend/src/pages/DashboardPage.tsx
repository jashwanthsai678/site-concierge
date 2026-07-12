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

  useDashboardSocket(businessId)

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
    await api.updateLeadStatus(leadId, status)
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
            <p className="text-sm text-white/50">AI Conversion OS — live dashboard</p>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile label="Today's Visitors" value={String(summary?.visitors_today ?? '—')} />
          <StatTile label="Today's Conversations" value={String(summary?.conversations_today ?? '—')} />
          <StatTile label="Qualified Leads" value={String(summary?.qualified_leads_today ?? '—')} />
          <StatTile label="Booked Meetings" value={String(summary?.booked_meetings_today ?? '—')} />
        </div>

        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <GlassCard className="p-6 lg:col-span-2">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white/50">Conversion Funnel</h2>
            {funnel ? <ConversionFunnelChart funnel={funnel} /> : <LoadingSpinner />}
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
          <LeadPipeline leads={leads} onStatusChange={handleStatusChange} />
        </div>

        <div>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white/50">Conversation History</h2>
          <ConversationHistoryList conversations={conversations} />
        </div>
      </div>
    </div>
  )
}
