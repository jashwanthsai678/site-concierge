import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'

// How long a pointed-at element stays visually highlighted before it fades —
// matches VoiceWidget's own POINTING_DURATION_MS so the mascot's "pointing"
// pose and the on-page highlight resolve at the same moment.
const HIGHLIGHT_DURATION_MS = 2500

interface HighlightContextValue {
  target: string | null
  trigger: (id: string) => void
}

const HighlightContext = createContext<HighlightContextValue | null>(null)

/**
 * Lives in CompanyWebsiteLayout, above the routed <Outlet> — the one thing
 * that survives a page-to-page navigation triggered by the AI, so a
 * highlight requested on the sentence that causes the navigation is still
 * "remembered" once the destination page finishes mounting a moment later.
 */
export function HighlightProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<string | null>(null)
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const trigger = useCallback((id: string) => {
    if (clearTimerRef.current) clearTimeout(clearTimerRef.current)
    // Force a re-fire even if the same id is requested twice in a row (e.g.
    // the AI mentions "USA" again later) — null-then-set on the next tick
    // guarantees Highlightable's effect sees a change either way.
    setTarget(null)
    requestAnimationFrame(() => setTarget(id))
    clearTimerRef.current = setTimeout(() => setTarget(null), HIGHLIGHT_DURATION_MS)
  }, [])

  const value = useMemo(() => ({ target, trigger }), [target, trigger])

  return <HighlightContext.Provider value={value}>{children}</HighlightContext.Provider>
}

export function useHighlight(): HighlightContextValue {
  const ctx = useContext(HighlightContext)
  if (!ctx) throw new Error('useHighlight must be used within a HighlightProvider')
  return ctx
}
