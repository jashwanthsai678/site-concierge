import { useEffect, useRef, useState } from 'react'
import type {
  AssistantChunkData,
  AssistantDoneData,
  ConversationEndData,
  ErrorData,
  GreetingData,
  LeadUpdateData,
  StageChangeData,
  WSEnvelope,
} from '@/types/conversation'

// Backend force-closes an idle connection after 90s of silence (see
// conversation_idle_timeout_seconds) — a long pause between turns (the
// visitor thinking, or TTS running long) would otherwise get treated the
// same as an abandoned conversation. Comfortably under that threshold.
const HEARTBEAT_INTERVAL_MS = 30_000

interface ConversationSocketHandlers {
  onGreeting?: (data: GreetingData) => void
  onAssistantChunk?: (data: AssistantChunkData) => void
  onAssistantDone?: (data: AssistantDoneData) => void
  onLeadUpdate?: (data: LeadUpdateData) => void
  onStageChange?: (data: StageChangeData) => void
  onError?: (data: ErrorData) => void
  onConversationEnd?: (data: ConversationEndData) => void
}

/**
 * One native WebSocket per conversation — see backend/app/voice/ws_protocol.py
 * for the envelope contract this dispatches on. Handlers are held in a ref
 * so identity changes on every render don't force a socket reconnect.
 *
 * `apiBase` is only needed by the standalone embeddable widget
 * (widget-embed.tsx) — when the widget runs on a client's own external
 * site, `window.location.host` is THEIR site, not our backend, so the WS
 * URL can't be derived from it. Omit it (the default) for same-origin use,
 * which covers this app's own demo pages via Vite's dev proxy.
 */
export function useConversationSocket(
  conversationId: number | null,
  handlers: ConversationSocketHandlers,
  apiBase?: string,
) {
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers
  // A visitor can plausibly type and hit send before the handshake
  // finishes (this raced in practice during automated testing, which acts
  // faster than a human but the underlying window is real on a slow
  // connection too) — queue rather than drop, flushed once open.
  const pendingSendsRef = useRef<string[]>([])

  useEffect(() => {
    if (conversationId === null) return

    const wsUrl = apiBase
      ? `${apiBase.replace(/^http/, 'ws')}/ws/conversation/${conversationId}`
      : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws/conversation/${conversationId}`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      setIsConnected(true)
      ws.send(JSON.stringify({ type: 'client_ready', data: {} }))
      for (const raw of pendingSendsRef.current) ws.send(raw)
      pendingSendsRef.current = []
    }
    const heartbeat = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'heartbeat', data: {} }))
    }, HEARTBEAT_INTERVAL_MS)
    ws.onclose = () => {
      clearInterval(heartbeat)
      setIsConnected(false)
    }
    ws.onmessage = (event: MessageEvent<string>) => {
      let envelope: WSEnvelope
      try {
        envelope = JSON.parse(event.data)
      } catch {
        return
      }
      switch (envelope.type) {
        case 'greeting':
          handlersRef.current.onGreeting?.(envelope.data as GreetingData)
          break
        case 'assistant_chunk':
          handlersRef.current.onAssistantChunk?.(envelope.data as AssistantChunkData)
          break
        case 'assistant_done':
          handlersRef.current.onAssistantDone?.(envelope.data as AssistantDoneData)
          break
        case 'lead_update':
          handlersRef.current.onLeadUpdate?.(envelope.data as LeadUpdateData)
          break
        case 'stage_change':
          handlersRef.current.onStageChange?.(envelope.data as StageChangeData)
          break
        case 'error':
          handlersRef.current.onError?.(envelope.data as ErrorData)
          break
        case 'conversation_end':
          handlersRef.current.onConversationEnd?.(envelope.data as ConversationEndData)
          break
      }
    }

    return () => {
      clearInterval(heartbeat)
      ws.close()
      wsRef.current = null
    }
  }, [conversationId, apiBase])

  const send = (raw: string) => {
    const ws = wsRef.current
    if (ws?.readyState === WebSocket.OPEN) ws.send(raw)
    else pendingSendsRef.current.push(raw)
  }

  const sendUtterance = (text: string) => {
    send(JSON.stringify({ type: 'user_utterance', data: { text } }))
  }

  const sendEndConversation = () => {
    send(JSON.stringify({ type: 'end_conversation', data: {} }))
  }

  return { isConnected, sendUtterance, sendEndConversation }
}
