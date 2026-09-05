import { useQuery } from '@tanstack/react-query'
import { portalApi } from '@/services/portalApi'
import { LEAD_CATEGORY_COLOR } from '@/lib/palette'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { Badge, PortalCard, PortalPageHeader } from '@/components/portal/PortalUI'

export function PortalLeadsPage() {
  const query = useQuery({ queryKey: ['portal-leads'], queryFn: portalApi.listLeads })

  return (
    <div className="space-y-6">
      <PortalPageHeader title="Leads" description="Everyone the widget has qualified so far, newest first." />

      {query.isLoading ? (
        <LoadingSpinner size={20} />
      ) : (query.data ?? []).length === 0 ? (
        <PortalCard>
          <p className="text-xs text-gray-400">No leads yet — they'll show up here as conversations complete.</p>
        </PortalCard>
      ) : (
        <div className="space-y-3">
          {(query.data ?? []).map((lead) => (
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
                  <p className="mt-2 text-xs font-medium text-gray-600">Next: {lead.next_action}</p>
                </div>
              </div>
            </PortalCard>
          ))}
        </div>
      )}
    </div>
  )
}
