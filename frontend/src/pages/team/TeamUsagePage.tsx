import { useQuery } from '@tanstack/react-query'
import { teamApi } from '@/services/teamApi'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { PortalCard, PortalPageHeader } from '@/components/portal/PortalUI'

function formatNumber(n: number): string {
  return n.toLocaleString()
}

export function TeamUsagePage() {
  const query = useQuery({ queryKey: ['team-usage'], queryFn: teamApi.getUsage })

  return (
    <div className="space-y-6">
      <PortalPageHeader title="Usage" description="Token usage across every business, highest first." />

      {query.isLoading ? (
        <LoadingSpinner size={20} />
      ) : query.isError || !query.data ? (
        <PortalCard>
          <p className="text-xs text-red-600">Couldn't load usage just now.</p>
          <button
            type="button"
            onClick={() => void query.refetch()}
            className="mt-2 text-xs font-semibold text-gray-700 underline"
          >
            Try again
          </button>
        </PortalCard>
      ) : query.data.businesses.length === 0 ? (
        <PortalCard>
          <p className="text-xs text-gray-400">No usage recorded yet.</p>
        </PortalCard>
      ) : (
        <>
          <PortalCard className="flex items-baseline gap-2">
            <span className="text-sm font-medium text-gray-500">Total tokens</span>
            <span className="text-2xl font-bold text-gray-900">{formatNumber(query.data.total_tokens)}</span>
          </PortalCard>

          <PortalCard className="overflow-hidden p-0">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-[11px] uppercase tracking-wide text-gray-400">
                  <th className="px-4 py-2.5 font-medium">Business</th>
                  <th className="px-4 py-2.5 font-medium">Slug</th>
                  <th className="px-4 py-2.5 font-medium text-right">Total tokens</th>
                  <th className="px-4 py-2.5 font-medium text-right">Calls</th>
                </tr>
              </thead>
              <tbody>
                {query.data.businesses.map((row) => (
                  <tr key={row.business_id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-900">{row.business_name}</td>
                    <td className="px-4 py-3 text-gray-500">{row.business_slug}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{formatNumber(row.total_tokens)}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{formatNumber(row.call_count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </PortalCard>
        </>
      )}
    </div>
  )
}
