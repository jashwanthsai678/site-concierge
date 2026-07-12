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
 */
export function useConversationSocket(conversationId: number | null, handlers: ConversationSocketHandlers) {
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    if (conversationId === null) return

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const ws = new WebSocket(`${protocol}://${window.location.host}/ws/conversation/${conversationId}`)
    wsRef.current = ws

    ws.onopen = () => {
      setIsConnected(true)
      ws.send(JSON.stringify({ type: 'client_ready', data: {} }))
    }
    ws.onclose = () => setIsConnected(false)
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
      ws.close()
      wsRef.current = null
    }
  }, [conversationId])

  const sendUtterance = (text: string) => {
    wsRef.current?.send(JSON.stringify({ type: 'user_utterance', data: { text } }))
  }

  const sendEndConversation = () => {
    wsRef.current?.send(JSON.stringify({ type: 'end_conversation', data: {} }))
  }

  return { isConnected, sendUtterance, sendEndConversation }
}
