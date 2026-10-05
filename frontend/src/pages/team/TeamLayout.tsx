import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { teamApi, teamAuth } from '@/services/teamApi'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ChartIcon, LogOutIcon, MenuIcon, UsersIcon, XIcon } from '@/components/portal/icons'
import type { StaffPublic } from '@/types/team'

export interface TeamContext {
  staff: StaffPublic
}

const NAV_LINKS = [
  { to: '/team/businesses', label: 'Businesses', Icon: UsersIcon },
  { to: '/team/usage', label: 'Usage', Icon: ChartIcon },
]

/**
 * Auth-gated shell around every /team/* page — mirrors PortalLayout, but
 * deliberately has no per-business branding color (this is a staff tool,
 * not a client's own portal) so it uses a fixed neutral dark header/sidebar
 * instead, which also visually distinguishes it from the customer portal at
 * a glance — important since a staff member may have both open at once.
 */
export function TeamLayout() {
  const navigate = useNavigate()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    if (!teamAuth.isLoggedIn()) navigate('/team/login', { replace: true })
  }, [navigate])

  const query = useQuery({
    queryKey: ['team-me'],
    queryFn: teamApi.getMe,
    enabled: teamAuth.isLoggedIn(),
    retry: false,
  })

  useEffect(() => {
    if (query.isError) navigate('/team/login', { replace: true })
  }, [query.isError, navigate])

  const handleLogout = async () => {
    try {
      await teamApi.logout()
    } finally {
      teamAuth.clearToken()
      navigate('/team/login', { replace: true })
    }
  }

  if (!teamAuth.isLoggedIn() || query.isLoading || !query.data) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <LoadingSpinner size={28} />
      </div>
    )
  }

  const staff = query.data

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 text-gray-800 lg:flex-row">
      <div className="flex items-center justify-between border-b border-gray-800 bg-gray-900 px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-700 text-sm font-bold text-white">
            {staff.name.charAt(0).toUpperCase()}
          </div>
          <p className="truncate text-sm font-semibold text-white">{staff.name}</p>
        </div>
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open menu"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-300 hover:bg-gray-800"
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
          <div className="relative flex h-full w-64 flex-col bg-gray-900 px-4 py-6 shadow-xl">
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              aria-label="Close menu"
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-800"
            >
              <XIcon className="h-5 w-5" />
            </button>
            <SidebarContent staff={staff} onLogout={handleLogout} onNavigate={() => setMobileNavOpen(false)} />
          </div>
        </div>
      )}

      <aside className="hidden w-60 shrink-0 flex-col bg-gray-900 px-4 py-6 lg:flex">
        <SidebarContent staff={staff} onLogout={handleLogout} />
      </aside>

      <div className="min-w-0 flex-1 overflow-y-auto px-4 py-8 sm:px-8 lg:px-12 lg:py-10">
        <div className="mx-auto max-w-4xl">
          <Outlet context={{ staff } satisfies TeamContext} />
        </div>
      </div>
    </div>
  )
}

function SidebarContent({
  staff,
  onLogout,
  onNavigate,
}: {
  staff: StaffPublic
  onLogout: () => void
  onNavigate?: () => void
}) {
  return (
    <>
      <div className="mb-1 hidden items-center gap-2.5 px-2 lg:flex">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-700 text-sm font-bold text-white">
          {staff.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{staff.name}</p>
          <p className="truncate text-[11px] text-gray-400">Qualeadio Team</p>
        </div>
      </div>

      <div className="my-5 hidden border-t border-gray-800 lg:block" />

      <nav className="flex flex-1 flex-col gap-0.5">
        {NAV_LINKS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive ? 'bg-gray-800 font-semibold text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <Icon className="h-[18px] w-[18px] shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-4 border-t border-gray-800 pt-3">
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
        >
          <LogOutIcon className="h-[18px] w-[18px]" />
          Log out
        </button>
      </div>
    </>
  )
}
