// The Web Speech API (SpeechRecognition) is not in TypeScript's default DOM
// lib (it's still non-standard). Minimal ambient types for the subset we
// use — avoids `any` casts in hooks/useSpeechRecognition.ts.
export {}

declare global {
  interface SpeechRecognitionResultItem {
    transcript: string
    confidence: number
  }

  interface SpeechRecognitionResult {
    [index: number]: SpeechRecognitionResultItem
    length: number
    isFinal: boolean
  }

  interface SpeechRecognitionResultList {
    [index: number]: SpeechRecognitionResult
    length: number
  }

  interface SpeechRecognitionEvent extends Event {
    resultIndex: number
    results: SpeechRecognitionResultList
  }

  interface SpeechRecognitionErrorEvent extends Event {
    error: string
    message: string
  }

  interface SpeechRecognition extends EventTarget {
    continuous: boolean
    interimResults: boolean
    lang: string
    start(): void
    stop(): void
    abort(): void
    onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => unknown) | null
    onend: ((this: SpeechRecognition, ev: Event) => unknown) | null
    onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => unknown) | null
    onstart: ((this: SpeechRecognition, ev: Event) => unknown) | null
  }

  interface Window {
    SpeechRecognition?: new () => SpeechRecognition
    webkitSpeechRecognition?: new () => SpeechRecognition
  }
}
