import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { DashboardLeadUpdateData, WSEnvelope } from '@/types/conversation'

const MAX_RECONNECT_DELAY_MS = 15_000

/**
 * Subscribes to /ws/dashboard and invalidates the relevant React Query
 * caches on `lead_update` — this (not polling) is what makes a new lead
 * appear "instantly" when an investor switches to this tab mid-demo.
 *
 * Previously a dropped connection (server restart, network blip) killed
 * live updates permanently until a full page reload, with no indication
 * to the viewer that anything had stopped working. This reconnects with
 * exponential backoff and returns `connected` so the page can show that.
 */
export function useDashboardSocket(businessId: number | null): { connected: boolean } {
  const queryClient = useQueryClient()
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (businessId === null) return

    let cancelled = false
    let ws: WebSocket | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let attempt = 0

    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
      const socket = new WebSocket(`${protocol}://${window.location.host}/ws/dashboard`)
      ws = socket

      socket.onopen = () => {
        attempt = 0
        setConnected(true)
      }

      socket.onmessage = (event: MessageEvent<string>) => {
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

      socket.onerror = () => {
        socket.close()
      }

      socket.onclose = () => {
        setConnected(false)
        if (cancelled) return
        const delay = Math.min(1000 * 2 ** attempt, MAX_RECONNECT_DELAY_MS)
        attempt += 1
        reconnectTimer = setTimeout(connect, delay)
      }
    }

    connect()

    return () => {
      cancelled = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      ws?.close()
    }
  }, [businessId, queryClient])

  return { connected }
}
