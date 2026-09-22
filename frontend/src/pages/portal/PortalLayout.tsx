import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { portalApi, portalAuth } from '@/services/portalApi'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ACCENT, ACCENT_TEXT } from '@/lib/palette'
import { BookIcon, BotIcon, GearIcon, HomeIcon, LinkIcon, LogOutIcon, MenuIcon, UsersIcon, XIcon } from '@/components/portal/icons'
import type { PortalBusinessRead } from '@/types/portal'

export interface PortalContext {
  business: PortalBusinessRead
  refetchBusiness: () => void
}

const NAV_LINKS = [
  { to: '/portal', label: 'Overview', Icon: HomeIcon, end: true },
  { to: '/portal/bot-setup', label: 'Bot Setup', Icon: BotIcon },
  { to: '/portal/knowledge', label: 'Knowledge', Icon: BookIcon },
  { to: '/portal/settings', label: 'Settings', Icon: GearIcon },
  { to: '/portal/embed', label: 'Embed', Icon: LinkIcon },
  { to: '/portal/leads', label: 'Leads', Icon: UsersIcon },
]

/**
 * Auth-gated shell around every /portal/* page — resolves the bearer token
 * (see services/portalApi.ts) to a live business via GET /api/portal/me,
 * redirecting to login on no-token or an invalid/expired one (a 401 there
 * means the token was already cleared by portalRequest's interceptor).
 */
export function PortalLayout() {
  const navigate = useNavigate()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

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
    <div className="flex min-h-screen flex-col bg-gray-50 text-gray-800 lg:flex-row">
      {/* Mobile top bar — the sidebar below is desktop-only (`hidden lg:flex`);
          below the `lg` breakpoint this is the only nav entry point, opening
          the same links in a slide-over drawer instead of a permanent rail
          that would otherwise eat half a phone screen. */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
            style={{ backgroundColor: business.branding_color }}
          >
            {business.name.charAt(0)}
          </div>
          <p className="truncate text-sm font-semibold text-gray-900">{business.name}</p>
        </div>
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open menu"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
        >
          <MenuIcon className="h-5 w-5" />
        </button>
      </div>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden="true"
          />
          <div className="relative flex h-full w-64 flex-col bg-white px-4 py-6 shadow-xl">
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              aria-label="Close menu"
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100"
            >
              <XIcon className="h-5 w-5" />
            </button>
            <SidebarContent business={business} onLogout={handleLogout} onNavigate={() => setMobileNavOpen(false)} />
          </div>
        </div>
      )}

      <aside className="hidden w-60 shrink-0 flex-col border-r border-gray-200 bg-white px-4 py-6 lg:flex">
        <SidebarContent business={business} onLogout={handleLogout} />
      </aside>

      <div className="min-w-0 flex-1 overflow-y-auto px-4 py-8 sm:px-8 lg:px-12 lg:py-10">
        <div className="mx-auto max-w-4xl">
          <Outlet context={{ business, refetchBusiness: query.refetch } satisfies PortalContext} />
        </div>
      </div>
    </div>
  )
}

function SidebarContent({
  business,
  onLogout,
  onNavigate,
}: {
  business: PortalBusinessRead
  onLogout: () => void
  onNavigate?: () => void
}) {
  return (
    <>
      <div className="mb-1 hidden items-center gap-2.5 px-2 lg:flex">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
          style={{ backgroundColor: business.branding_color }}
        >
          {business.name.charAt(0)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900">{business.name}</p>
          <p className="truncate text-[11px] text-gray-400">Qualeadio Portal</p>
        </div>
      </div>

      <div className="my-5 hidden border-t border-gray-100 lg:block" />

      <nav className="flex flex-1 flex-col gap-0.5">
        {NAV_LINKS.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive ? 'font-semibold' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
            style={({ isActive }) => (isActive ? { color: ACCENT_TEXT, backgroundColor: `${ACCENT}12` } : undefined)}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span
                    className="absolute left-0 top-1/2 h-4 w-1 -translate-y-1/2 rounded-r-full"
                    style={{ backgroundColor: ACCENT }}
                  />
                )}
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-4 border-t border-gray-100 pt-3">
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-700"
        >
          <LogOutIcon className="h-[18px] w-[18px]" />
          Log out
        </button>
      </div>
    </>
  )
}
