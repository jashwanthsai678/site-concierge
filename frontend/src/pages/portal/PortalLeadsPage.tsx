import { useQuery } from '@tanstack/react-query'
import { portalApi } from '@/services/portalApi'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

const CATEGORY_COLOR: Record<string, string> = {
  Hot: 'bg-red-100 text-red-700',
  Warm: 'bg-amber-100 text-amber-700',
  Cold: 'bg-blue-100 text-blue-700',
}

export function PortalLeadsPage() {
  const query = useQuery({ queryKey: ['portal-leads'], queryFn: portalApi.listLeads })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Leads</h1>
        <p className="mt-1 text-sm text-gray-500">Everyone the widget has qualified so far, newest first.</p>
      </div>

      {query.isLoading ? (
        <LoadingSpinner size={20} />
      ) : (query.data ?? []).length === 0 ? (
        <p className="text-xs text-gray-400">No leads yet — they'll show up here as conversations complete.</p>
      ) : (
        <div className="space-y-2">
          {(query.data ?? []).map((lead) => (
            <div key={lead.id} className="rounded-lg border border-gray-200 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900">{lead.name ?? 'Unnamed visitor'}</p>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${CATEGORY_COLOR[lead.category] ?? 'bg-gray-100 text-gray-600'}`}>
                  {lead.category}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500">{lead.summary}</p>
              <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-gray-400">
                {lead.email && <span>{lead.email}</span>}
                {lead.phone && <span>{lead.phone}</span>}
                {lead.location && <span>{lead.location}</span>}
                {lead.budget && <span>Budget: {lead.budget}</span>}
              </div>
              <p className="mt-2 text-xs font-medium text-gray-600">Next: {lead.next_action}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
