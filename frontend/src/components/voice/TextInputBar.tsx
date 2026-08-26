import { useEffect, useRef, useState, type FormEvent } from 'react'

/**
 * The non-voice path — a visitor who can't or doesn't want to talk (quiet
 * room, phone on silent, no mic permission, or just switched the mode
 * toggle) types instead. Submits through the exact same utterance pipeline
 * as speech recognition (see VoiceWidget's handleTextSubmit), so the
 * backend can't tell the difference.
 *
 * `autoFocus` is imperative (a ref + effect), not the native HTML attribute
 * — this component stays mounted for the whole conversation, and the native
 * attribute only fires once on mount, so it wouldn't refocus when the
 * visitor toggles from voice back to text mid-conversation.
 */
export function TextInputBar({
  disabled,
  autoFocus,
  onSubmit,
}: {
  disabled?: boolean
  autoFocus?: boolean
  onSubmit: (text: string) => void
}) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const text = value.trim()
    if (!text || disabled) return
    onSubmit(text)
    setValue('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-[260px] items-center gap-2">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        disabled={disabled}
        placeholder="Or type your message…"
        aria-label="Type a message"
        className="min-w-0 flex-1 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm text-gray-800 shadow-sm placeholder:text-gray-400 disabled:opacity-40"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        aria-label="Send message"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-800 text-white shadow-sm transition-colors disabled:opacity-40"
      >
        <SendIcon />
      </button>
    </form>
  )
}

function SendIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}
