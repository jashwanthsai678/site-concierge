import { useEffect, useRef } from 'react'

interface EngagementOptions {
  /** Actual visible (tab-focused) dwell time required before triggering. */
  minDwellMs?: number
  /** Minimum scroll depth (0..1) required before triggering. */
  minScrollRatio?: number
}

/**
 * The "should the AI speak yet?" decision engine — a real visitor browses
 * for a while before a good salesperson walks up; this watches dwell time
 * (only while the tab is actually visible, so a backgrounded tab doesn't
 * silently accumulate "engagement") and scroll depth, and fires once both
 * thresholds are crossed.
 *
 * Demo-tuned defaults (8s / 15%) — a real deployment would tune these much
 * longer (30-60s+) from actual visitor analytics; short here so a live demo
 * doesn't sit around waiting.
 */
export function useEngagementTracker(onEngaged: () => void, options: EngagementOptions = {}) {
  const { minDwellMs = 8_000, minScrollRatio = 0.15 } = options

  const cancelledRef = useRef(false)
  const visibleMsRef = useRef(0)
  const lastTickRef = useRef<number | null>(null)
  const maxScrollRatioRef = useRef(0)
  const onEngagedRef = useRef(onEngaged)
  onEngagedRef.current = onEngaged

  useEffect(() => {
    const tick = () => {
      if (cancelledRef.current) return
      const now = performance.now()
      if (document.visibilityState === 'visible' && lastTickRef.current !== null) {
        visibleMsRef.current += now - lastTickRef.current
      }
      lastTickRef.current = now

      const scrollable = document.documentElement.scrollHeight - window.innerHeight
      const ratio = scrollable > 0 ? Math.min(1, window.scrollY / scrollable) : 1
      maxScrollRatioRef.current = Math.max(maxScrollRatioRef.current, ratio)

      if (visibleMsRef.current >= minDwellMs && maxScrollRatioRef.current >= minScrollRatio) {
        cancelledRef.current = true
        onEngagedRef.current()
      }
    }

    lastTickRef.current = performance.now()
    const interval = setInterval(tick, 1000)
    const onScroll = () => tick()
    const onVisibilityChange = () => {
      lastTickRef.current = performance.now()
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      clearInterval(interval)
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [minDwellMs, minScrollRatio])

  /** Call when the visitor starts the conversation manually, so the
   * passive trigger doesn't also fire afterward. */
  const cancel = () => {
    cancelledRef.current = true
  }

  return { cancel }
}
