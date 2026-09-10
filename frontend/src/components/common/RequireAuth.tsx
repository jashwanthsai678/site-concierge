import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { portalAuth } from '@/services/portalApi'

/**
 * Route guard for pages outside the /portal/* tree, which get their gate
 * from PortalLayout instead. Only checks that a token exists — whether it's
 * still valid is settled by the first authenticated request the page makes,
 * which redirects on 401 (see portalApi.ts).
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  if (!portalAuth.isLoggedIn()) return <Navigate to="/portal/login" replace />
  return <>{children}</>
}
