import { useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { portalApi, portalAuth } from '@/services/portalApi'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ACCENT } from '@/lib/palette'
import type { BusinessPublic } from '@/types/business'

export interface PortalContext {
  business: BusinessPublic
  refetchBusiness: () => void
}

const NAV_LINKS = [
  { to: '/portal', label: 'Settings', end: true },
  { to: '/portal/knowledge', label: 'Knowledge' },
  { to: '/portal/embed', label: 'Embed' },
  { to: '/portal/leads', label: 'Leads' },
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
    <div className="min-h-screen bg-white text-gray-800">
      <nav className="flex items-center justify-between border-b border-gray-100 px-6 py-4 sm:px-12">
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-md text-sm font-bold text-white"
            style={{ backgroundColor: business.branding_color }}
          >
            {business.name.charAt(0)}
          </div>
          <span className="font-semibold">{business.name}</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-gray-500">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => (isActive ? 'font-semibold' : 'hover:text-gray-900')}
              style={({ isActive }) => (isActive ? { color: ACCENT } : undefined)}
            >
              {link.label}
            </NavLink>
          ))}
          <button type="button" onClick={handleLogout} className="text-gray-400 hover:text-gray-700">
            Log out
          </button>
        </div>
      </nav>

      <div className="mx-auto max-w-2xl px-6 py-10">
        <Outlet context={{ business, refetchBusiness: query.refetch } satisfies PortalContext} />
      </div>
    </div>
  )
}
