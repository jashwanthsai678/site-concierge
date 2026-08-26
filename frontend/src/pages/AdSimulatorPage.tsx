import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '@/services/api'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

// Single demo business/campaign for this MVP — see backend/app/database/seed.py.
const DEMO_SLUG = 'study-abroad-meta'

export function AdSimulatorPage() {
  const query = useQuery({
    queryKey: ['landing-page', DEMO_SLUG],
    queryFn: () => api.getLandingPage(DEMO_SLUG),
  })

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4 py-10">
      <div className="w-full max-w-md">
        <p className="mb-3 text-center text-xs text-white/30">
          Simulated Meta feed — this is what a visitor sees after your ad targets them
        </p>

        {query.isLoading && (
          <div className="flex justify-center py-10">
            <LoadingSpinner size={24} />
          </div>
        )}

        {query.data && (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#18191a] shadow-xl">
            <div className="flex items-center gap-3 px-4 pt-4">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: query.data.business.branding_color }}
              >
                {query.data.business.name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{query.data.business.name}</p>
                <p className="text-xs text-white/40">Sponsored</p>
              </div>
            </div>

            <div
              className="mx-4 mt-4 flex h-40 items-center justify-center rounded-xl"
              style={{
                backgroundImage: `linear-gradient(135deg, ${query.data.business.branding_color}55, #00000000)`,
              }}
            >
              <span className="text-sm text-white/40">Ad creative</span>
            </div>

            <div className="px-4 py-4">
              <p className="text-base font-semibold text-white">{query.data.ad_creative_headline}</p>
              <p className="mt-1 text-sm text-white/60">{query.data.ad_creative_body}</p>
            </div>

            <div className="border-t border-white/10 px-4 py-3">
              <Link
                to={`/site/${DEMO_SLUG}`}
                className="block w-full rounded-lg py-2.5 text-center text-sm font-semibold text-white"
                style={{ backgroundColor: query.data.business.branding_color }}
              >
                Learn More
              </Link>
            </div>
          </div>
        )}

        {query.isError && (
          <p className="text-center text-sm text-red-400">
            Could not load the demo campaign — is the backend running and seeded?
          </p>
        )}
      </div>
    </div>
  )
}
