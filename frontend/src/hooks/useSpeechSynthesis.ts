import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Wraps the browser's native SpeechSynthesis (TTS) with a serial queue —
 * the backend streams the reply sentence-by-sentence (see
 * conversation/turn_orchestrator.py's chunking), and each sentence is
 * enqueued as it arrives so speech starts before the full reply has
 * finished generating, without ever overlapping two utterances.
 */
export function useSpeechSynthesis(onQueueEmpty?: () => void) {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const queueRef = useRef<string[]>([])
  const speakingRef = useRef(false)
  const onQueueEmptyRef = useRef(onQueueEmpty)
  onQueueEmptyRef.current = onQueueEmpty

  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

  const processNext = useCallback(() => {
    if (!isSupported) return
    const next = queueRef.current.shift()
    if (next === undefined) {
      speakingRef.current = false
      setIsSpeaking(false)
      onQueueEmptyRef.current?.()
      return
    }
    speakingRef.current = true
    setIsSpeaking(true)
    const utterance = new SpeechSynthesisUtterance(next)
    utterance.onend = () => processNext()
    utterance.onerror = () => processNext()
    window.speechSynthesis.speak(utterance)
  }, [isSupported])

  const enqueue = useCallback(
    (text: string) => {
      if (!isSupported || !text.trim()) return
      queueRef.current.push(text)
      if (!speakingRef.current) processNext()
    },
    [isSupported, processNext],
  )

  const cancelAll = useCallback(() => {
    queueRef.current = []
    if (isSupported) window.speechSynthesis.cancel()
    speakingRef.current = false
    setIsSpeaking(false)
  }, [isSupported])

  useEffect(() => () => cancelAll(), [cancelAll])

  // Synchronous read of "is speaking right now" for callers that need to
  // make a decision inside an event handler without waiting for React
  // state to re-render (see LandingPage's assistant_done handler).
  const isSpeakingNow = useCallback(() => speakingRef.current, [])

  return { enqueue, cancelAll, isSpeaking, isSupported, isSpeakingNow }
}
