import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { teamApi } from '@/services/teamApi'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { Badge, PortalCard, PortalPageHeader } from '@/components/portal/PortalUI'
import { INPUT_CLASS } from '@/lib/formStyles'

const ACTIVE_COLOR = '#199e70'
const SUSPENDED_COLOR = '#d03b3b'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function TeamBusinessesPage() {
  const query = useQuery({ queryKey: ['team-businesses'], queryFn: teamApi.listBusinesses })
  const [filter, setFilter] = useState('')

  const businesses = query.data ?? []
  const filtered = useMemo(() => {
    const needle = filter.trim().toLowerCase()
    if (!needle) return businesses
    return businesses.filter((b) =>
      [b.name, b.slug, b.industry].some((field) => field.toLowerCase().includes(needle)),
    )
  }, [businesses, filter])

  return (
    <div className="space-y-6">
      <PortalPageHeader title="Businesses" description="Every client business on the platform." />

      <input
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className={`${INPUT_CLASS} max-w-sm`}
        placeholder="Filter by name, slug, or industry…"
      />

      {query.isLoading ? (
        <LoadingSpinner size={20} />
      ) : query.isError ? (
        // A distinct error state, not the empty state below — a failed
        // fetch here should never read as "there are no businesses".
        <PortalCard>
          <p className="text-xs text-red-600">Couldn't load businesses just now.</p>
          <button
            type="button"
            onClick={() => void query.refetch()}
            className="mt-2 text-xs font-semibold text-gray-700 underline"
          >
            Try again
          </button>
        </PortalCard>
      ) : filtered.length === 0 ? (
        <PortalCard>
          <p className="text-xs text-gray-400">
            {businesses.length === 0 ? 'No businesses yet.' : 'No businesses match that filter.'}
          </p>
        </PortalCard>
      ) : (
        <PortalCard className="overflow-hidden p-0">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-[11px] uppercase tracking-wide text-gray-400">
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">Slug</th>
                <th className="px-4 py-2.5 font-medium">Industry</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((business) => (
                <tr key={business.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      to={`/team/businesses/${business.id}`}
                      className="font-semibold text-gray-900 hover:underline"
                    >
                      {business.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{business.slug}</td>
                  <td className="px-4 py-3 text-gray-500">{business.industry}</td>
                  <td className="px-4 py-3">
                    <Badge color={business.is_active ? ACTIVE_COLOR : SUSPENDED_COLOR}>
                      {business.is_active ? 'Active' : 'Suspended'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(business.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </PortalCard>
      )}
    </div>
  )
}
