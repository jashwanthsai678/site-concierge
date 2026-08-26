import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/services/api'
import { startEmbeddedConversation } from '@/services/widgetApi'
import { useEngagementTracker } from '@/hooks/useEngagementTracker'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis'
import { useConversationSocket } from '@/hooks/useConversationSocket'
import { WidgetBubble } from '@/components/widget/WidgetBubble'
import { WidgetPromptCard, type CommunicationMode } from '@/components/widget/WidgetPromptCard'
import { MascotStage } from '@/components/widget/MascotStage'
import type { VoiceOrbState } from '@/components/voice/AnimatedCharacter'
import type { TranscriptEntry } from '@/types/conversation'
import { matchTopic, type Topic } from '@/lib/topicMatch'
import { stepIndexForStage, suggestionForStage } from '@/lib/stageGuide'

type WidgetState = 'collapsed' | 'prompting' | 'connecting' | 'active' | 'ended'

// How long the mascot holds its "pointing" pose after steering the visitor
// to a page — purely the widget's own animation timing, independent of
// whatever the host app does with the topic match (see onTopicMatch below).
const POINTING_DURATION_MS = 2500

/**
 * The embeddable assistant. This is what a business would drop onto their
 * own existing website — it starts as an unobtrusive floating bubble and
 * only proactively reaches out once `useEngagementTracker` decides the
 * visitor has shown genuine interest (or the visitor clicks it themselves,
 * which always works immediately as a manual override).
 *
 * `onTopicMatch` is optional and deliberately dumb (keyword matching on the
 * reply text, no backend involvement) — the widget doesn't know or assume
 * anything about the host site's structure; it just reports "this reply
 * seems to be about X" and lets the host decide what to do with that (see
 * CompanyWebsiteLayout, which navigates to the matching page).
 *
 * `apiBase`/`assetBase` are only set by the standalone embeddable bundle
 * (widget-embed.tsx). `apiBase` switches conversation-start to the
 * campaign-free `/api/widget/{slug}/start` endpoint and makes the WebSocket
 * URL absolute, since an external site has no Vite dev proxy and
 * `window.location` would point at the CLIENT's own domain, not this
 * backend. `assetBase` does the same for mascot images specifically (see
 * lib/mascotRegistry.ts) — they're static files served by wherever THIS
 * app is hosted, which isn't necessarily the same origin as the backend
 * API. Both omitted (the default), this behaves exactly as before:
 * relative same-origin calls through the ad-simulator's campaign-based
 * /api/pages/{slug}/start.
 */
export function VoiceWidget({
  slug,
  businessName,
  mascotKey = 'default',
  apiBase,
  assetBase,
  onTopicMatch,
}: {
  slug: string
  businessName: string
  mascotKey?: string
  apiBase?: string
  assetBase?: string
  onTopicMatch?: (topic: Topic) => void
}) {
  const [state, setState] = useState<WidgetState>('collapsed')
  const [conversationId, setConversationId] = useState<number | null>(null)
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
  const [isThinking, setIsThinking] = useState(false)
  const [isPointing, setIsPointing] = useState(false)
  const [endMessage, setEndMessage] = useState<string | null>(null)
  const [stage, setStage] = useState('greeting')
  const [showHistory, setShowHistory] = useState(false)
  // Chosen once, on the prompt card, before a conversation exists — gates
  // whether the mic auto-activates after the AI speaks (voice) or the text
  // input gets focus instead (text). Either control stays usable regardless
  // of this choice; it only decides what activates without an extra tap.
  const [mode, setMode] = useState<CommunicationMode>('voice')

  const dismissedRef = useRef(false)
  const transcriptIdRef = useRef(0)
  const pendingAutoListenRef = useRef(false)
  const pointingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Topics already covered — either the AI happened to mention one, or the
  // visitor tapped a suggestion chip — so the same nudge never repeats.
  const visitedTopicsRef = useRef<Set<Topic>>(new Set())

  const engagement = useEngagementTracker(() => {
    if (!dismissedRef.current) setState((s) => (s === 'collapsed' ? 'prompting' : s))
  })

  useEffect(() => {
    return () => {
      if (pointingTimerRef.current) clearTimeout(pointingTimerRef.current)
    }
  }, [])

  const nextId = useCallback(() => {
    transcriptIdRef.current += 1
    return `t${transcriptIdRef.current}`
  }, [])

  const pushTranscript = useCallback(
    (role: TranscriptEntry['role'], text: string) => {
      setTranscript((prev) => [...prev, { id: nextId(), role, text }])
    },
    [nextId],
  )

  const { start: startListening, stop: stopListening, isListening, isSupported: sttSupported } =
    useSpeechRecognition((text) => {
      pushTranscript('visitor', text)
      setIsThinking(true)
      sendUtterance(text)
    })

  const { enqueue, isSpeaking, isSpeakingNow } = useSpeechSynthesis(() => {
    if (pendingAutoListenRef.current) {
      pendingAutoListenRef.current = false
      startListening()
    }
  })

  const { sendUtterance, sendEndConversation } = useConversationSocket(conversationId, {
    onGreeting: (data) => {
      pushTranscript('assistant', data.text)
      enqueue(data.text)
      if (mode === 'voice') {
        if (isSpeakingNow()) pendingAutoListenRef.current = true
        else startListening()
      }
    },
    onAssistantChunk: (data) => enqueue(data.text),
    onAssistantDone: (data) => {
      setIsThinking(false)
      setStage(data.stage)
      pushTranscript('assistant', data.full_text)
      if (mode === 'voice') {
        if (isSpeakingNow()) pendingAutoListenRef.current = true
        else startListening()
      }

      const topic = matchTopic(data.full_text)
      if (topic) {
        visitedTopicsRef.current.add(topic)
        onTopicMatch?.(topic)
        if (pointingTimerRef.current) clearTimeout(pointingTimerRef.current)
        setIsPointing(true)
        pointingTimerRef.current = setTimeout(() => setIsPointing(false), POINTING_DURATION_MS)
      }
    },
    onConversationEnd: (data) => {
      stopListening()
      setState('ended')
      setEndMessage(
        data.reason === 'completed'
          ? "You're all set — a specialist will reach out shortly to confirm your call."
          : 'This conversation has ended.',
      )
    },
    onError: (data) => {
      setIsThinking(false)
      pushTranscript('assistant', data.message || "Sorry, something went wrong — could you say that again?")
      if (mode === 'voice') startListening()
    },
  }, apiBase)

  const handleStart = useCallback(async (chosenMode: CommunicationMode) => {
    engagement.cancel()
    dismissedRef.current = true
    setMode(chosenMode)
    setState('connecting')
    try {
      const res = apiBase ? await startEmbeddedConversation(apiBase, slug) : await api.startConversation(slug)
      setConversationId(res.conversation_id)
      setState('active')
    } catch {
      setState('collapsed')
    }
    // engagement is a stable ref-backed object from a hook with no reactive
    // deps that should retrigger this callback's identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, apiBase])

  // Clicking the bubble directly (manual override) asks the same mode
  // question the proactive prompt card does — one place decides voice vs.
  // text, regardless of how the conversation was triggered.
  const handleBubbleClick = useCallback(() => {
    engagement.cancel()
    dismissedRef.current = true
    setState('prompting')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDismiss = useCallback(() => {
    dismissedRef.current = true
    setState('collapsed')
  }, [])

  const handleClose = useCallback(() => {
    stopListening()
    if (conversationId !== null) sendEndConversation()
    setState('collapsed')
    setShowHistory(false)
  }, [conversationId, sendEndConversation, stopListening])

  const handleMicClick = useCallback(() => {
    if (isListening) stopListening()
    else startListening()
  }, [isListening, startListening, stopListening])

  // A persistent toggle, not just the one-time prompt-card choice — lets
  // the visitor change their mind mid-conversation (e.g. someone walks into
  // the room, or the mic isn't cooperating). Switching to text stops any
  // active listening; switching to voice immediately starts listening if
  // it's actually the visitor's turn (not while the AI is speaking/thinking
  // — mode still governs auto-restart for the *next* turn in that case).
  const handleModeToggle = useCallback(() => {
    const next: CommunicationMode = mode === 'voice' ? 'text' : 'voice'
    if (next === 'text') {
      stopListening()
    } else if (!isSpeaking && !isThinking) {
      startListening()
    }
    setMode(next)
  }, [mode, isSpeaking, isThinking, startListening, stopListening])

  // The non-voice fallback path (see TextInputBar) — reuses the exact same
  // utterance pipeline as speech recognition's callback above, so the
  // backend never knows or cares whether the visitor typed or spoke.
  const handleTextSubmit = useCallback(
    (text: string) => {
      if (isListening) stopListening()
      pushTranscript('visitor', text)
      setIsThinking(true)
      sendUtterance(text)
    },
    [isListening, stopListening, pushTranscript, sendUtterance],
  )

  // Tapping a proactive suggestion behaves exactly like the visitor having
  // said it out loud — reuses the same utterance pipeline as
  // useSpeechRecognition's callback above, so the backend can't tell the
  // difference and the reply/extraction/stage logic all just works.
  const handleSuggestionTap = useCallback(
    (topic: Topic, prompt: string) => {
      visitedTopicsRef.current.add(topic)
      pushTranscript('visitor', prompt)
      setIsThinking(true)
      sendUtterance(prompt)
    },
    [pushTranscript, sendUtterance],
  )

  const orbState: VoiceOrbState = isPointing
    ? 'pointing'
    : isSpeaking
      ? 'speaking'
      : isListening
        ? 'listening'
        : isThinking
          ? 'thinking'
          : 'idle'

  if (state === 'collapsed') {
    return <WidgetBubble mascotKey={mascotKey} assetBase={assetBase} onClick={handleBubbleClick} />
  }

  if (state === 'prompting') {
    return <WidgetPromptCard businessName={businessName} onAccept={handleStart} onDismiss={handleDismiss} />
  }

  // Only nudge between turns (never mid-"Thinking…") and never once the
  // conversation has ended.
  const stageSuggestion =
    state === 'active' && !endMessage && !isThinking ? suggestionForStage(stage, visitedTopicsRef.current) : null

  return (
    <MascotStage
      businessName={businessName}
      mascotKey={mascotKey}
      assetBase={assetBase}
      connecting={state === 'connecting'}
      orbState={orbState}
      transcript={transcript}
      isListening={isListening}
      sttSupported={sttSupported}
      micDisabled={isSpeaking || isThinking}
      onMicClick={handleMicClick}
      onTextSubmit={handleTextSubmit}
      textInputAutoFocus={mode === 'text'}
      mode={mode}
      onModeToggle={handleModeToggle}
      onClose={handleClose}
      endMessage={state === 'ended' ? endMessage : null}
      stageStep={stepIndexForStage(stage)}
      suggestion={
        stageSuggestion
          ? { label: stageSuggestion.label, onClick: () => handleSuggestionTap(stageSuggestion.topic, stageSuggestion.prompt) }
          : null
      }
      showHistory={showHistory}
      onToggleHistory={() => setShowHistory((v) => !v)}
    />
  )
}
