import { useCallback, useEffect, useRef, useState } from 'react'

function getRecognitionCtor(): (new () => SpeechRecognition) | null {
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null
}

/**
 * Wraps the browser's native SpeechRecognition (STT). Deliberately turn-based
 * (not `continuous`) — the visitor speaks one utterance, the recognizer
 * fires the final result, then stops; the caller decides when to restart it
 * (after the assistant finishes speaking), which is the push-to-talk-like
 * turn model this product uses instead of open-mic/VAD.
 */
export function useSpeechRecognition(onFinalResult: (text: string) => void) {
  const [isListening, setIsListening] = useState(false)
  const [isSupported] = useState(() => getRecognitionCtor() !== null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const onFinalResultRef = useRef(onFinalResult)
  onFinalResultRef.current = onFinalResult

  useEffect(() => {
    const Ctor = getRecognitionCtor()
    if (!Ctor) return

    const recognition = new Ctor()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const last = event.results[event.results.length - 1]
      if (last?.isFinal) {
        const text = last[0]?.transcript.trim()
        if (text) onFinalResultRef.current(text)
      }
    }
    recognition.onend = () => setIsListening(false)
    recognition.onerror = () => setIsListening(false)

    recognitionRef.current = recognition
    return () => {
      recognition.onresult = null
      recognition.onend = null
      recognition.onerror = null
      recognition.abort()
      recognitionRef.current = null
    }
  }, [])

  const start = useCallback(() => {
    if (!recognitionRef.current || isListening) return
    try {
      recognitionRef.current.start()
      setIsListening(true)
    } catch {
      // start() throws if a recognition session is already active — state
      // stays consistent via onend/onerror regardless.
    }
  }, [isListening])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  return { start, stop, isListening, isSupported }
}
