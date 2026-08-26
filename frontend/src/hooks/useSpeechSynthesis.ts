import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Wraps the browser's native SpeechSynthesis (TTS) with a serial queue —
 * the backend streams the reply sentence-by-sentence (see
 * conversation/turn_orchestrator.py's chunking), and each sentence is
 * enqueued as it arrives so speech starts before the full reply has
 * finished generating, without ever overlapping two utterances.
 */
// Chrome/Edge bug (chromium:679437): speechSynthesis silently stalls after
// ~15s of continuous speaking (or when the tab loses focus) unless resumed
// periodically — when it stalls, `onend` never fires, so without this the
// mic-restart chain below just dies with no error shown to the visitor.
const RESUME_WORKAROUND_INTERVAL_MS = 5000

export function useSpeechSynthesis(onQueueEmpty?: () => void) {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const queueRef = useRef<string[]>([])
  const speakingRef = useRef(false)
  const resumeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const onQueueEmptyRef = useRef(onQueueEmpty)
  onQueueEmptyRef.current = onQueueEmpty

  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

  const stopResumeWorkaround = useCallback(() => {
    if (resumeTimerRef.current) {
      clearInterval(resumeTimerRef.current)
      resumeTimerRef.current = null
    }
  }, [])

  const processNext = useCallback(() => {
    if (!isSupported) return
    const next = queueRef.current.shift()
    if (next === undefined) {
      speakingRef.current = false
      setIsSpeaking(false)
      stopResumeWorkaround()
      onQueueEmptyRef.current?.()
      return
    }
    speakingRef.current = true
    setIsSpeaking(true)
    if (!resumeTimerRef.current) {
      resumeTimerRef.current = setInterval(() => {
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.pause()
          window.speechSynthesis.resume()
        }
      }, RESUME_WORKAROUND_INTERVAL_MS)
    }
    const utterance = new SpeechSynthesisUtterance(next)
    utterance.onend = () => processNext()
    utterance.onerror = () => processNext()
    window.speechSynthesis.speak(utterance)
  }, [isSupported, stopResumeWorkaround])

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
    stopResumeWorkaround()
  }, [isSupported, stopResumeWorkaround])

  useEffect(() => () => cancelAll(), [cancelAll])

  // Synchronous read of "is speaking right now" for callers that need to
  // make a decision inside an event handler without waiting for React
  // state to re-render (see LandingPage's assistant_done handler).
  const isSpeakingNow = useCallback(() => speakingRef.current, [])

  return { enqueue, cancelAll, isSpeaking, isSupported, isSpeakingNow }
}
