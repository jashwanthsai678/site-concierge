import { useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { portalApi, portalAuth } from '@/services/portalApi'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ACCENT } from '@/lib/palette'
import type { PortalBusinessRead } from '@/types/portal'

export interface PortalContext {
  business: PortalBusinessRead
  refetchBusiness: () => void
}

const NAV_LINKS = [
  { to: '/portal', label: 'Overview', icon: '🏠', end: true },
  { to: '/portal/bot-setup', label: 'Bot Setup', icon: '🤖' },
  { to: '/portal/knowledge', label: 'Knowledge', icon: '📚' },
  { to: '/portal/settings', label: 'Settings', icon: '⚙️' },
  { to: '/portal/embed', label: 'Embed', icon: '🔗' },
  { to: '/portal/leads', label: 'Leads', icon: '📇' },
]

/**
 * Auth-gated shell around every /portal/* page — resolves the bearer token
 * (see services/portalApi.ts) to a live business via GET /api/portal/me,
 * redirecting to login on no-token or an invalid/expired one (a 401 there
 * means the token was already cleared by portalRequest's interceptor).
 */
export function PortalLayout() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!portalAuth.isLoggedIn()) navigate('/portal/login', { replace: true })
  }, [navigate])

  const query = useQuery({
    queryKey: ['portal-me'],
    queryFn: portalApi.getMe,
    enabled: portalAuth.isLoggedIn(),
    retry: false,
  })

  useEffect(() => {
    if (query.isError) navigate('/portal/login', { replace: true })
  }, [query.isError, navigate])

  const handleLogout = async () => {
    try {
      await portalApi.logout()
    } finally {
      portalAuth.clearToken()
      navigate('/portal/login', { replace: true })
    }
  }

  if (!portalAuth.isLoggedIn() || query.isLoading || !query.data) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <LoadingSpinner size={28} />
      </div>
    )
  }

  const business = query.data

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-800">
      <aside className="flex w-56 shrink-0 flex-col border-r border-gray-100 bg-white px-4 py-6">
        <div className="mb-8 flex items-center gap-2 px-2">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-sm font-bold text-white"
            style={{ backgroundColor: business.branding_color }}
          >
            {business.name.charAt(0)}
          </div>
          <span className="truncate text-sm font-semibold">{business.name}</span>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm ${
                  isActive ? 'font-semibold' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
              style={({ isActive }) => (isActive ? { color: ACCENT, backgroundColor: `${ACCENT}14` } : undefined)}
            >
              <span aria-hidden>{link.icon}</span>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-4 rounded-lg px-3 py-2 text-left text-sm text-gray-400 hover:bg-gray-50 hover:text-gray-700"
        >
          Log out
        </button>
      </aside>

      <div className="min-w-0 flex-1 px-8 py-10 sm:px-12">
        <div className="mx-auto max-w-3xl">
          <Outlet context={{ business, refetchBusiness: query.refetch } satisfies PortalContext} />
        </div>
      </div>
    </div>
  )
}
