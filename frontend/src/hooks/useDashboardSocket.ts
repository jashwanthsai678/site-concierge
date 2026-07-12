import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { DashboardLeadUpdateData, WSEnvelope } from '@/types/conversation'

/**
 * Subscribes to /ws/dashboard and invalidates the relevant React Query
 * caches on `lead_update` — this (not polling) is what makes a new lead
 * appear "instantly" when an investor switches to this tab mid-demo.
 */
export function useDashboardSocket(businessId: number | null) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (businessId === null) return

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const ws = new WebSocket(`${protocol}://${window.location.host}/ws/dashboard`)

    ws.onmessage = (event: MessageEvent<string>) => {
      let envelope: WSEnvelope<DashboardLeadUpdateData>
      try {
        envelope = JSON.parse(event.data)
      } catch {
        return
      }
      if (envelope.type === 'lead_update' && envelope.data.business_id === businessId) {
        void queryClient.invalidateQueries({ queryKey: ['leads', businessId] })
        void queryClient.invalidateQueries({ queryKey: ['analytics-summary', businessId] })
        void queryClient.invalidateQueries({ queryKey: ['analytics-funnel', businessId] })
        void queryClient.invalidateQueries({ queryKey: ['analytics-pipeline', businessId] })
        void queryClient.invalidateQueries({ queryKey: ['conversations', businessId] })
      }
    }

    return () => ws.close()
  }, [businessId, queryClient])
}
