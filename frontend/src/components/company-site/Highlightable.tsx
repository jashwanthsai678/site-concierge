import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { useHighlight } from '@/lib/highlightContext'

/**
 * Wraps one piece of on-page content (a pricing card, a country card, a
 * testimonial...) so the mascot can point at the SPECIFIC thing it's
 * currently talking about, not just navigate to the page it lives on — see
 * lib/highlightMatch.ts for how a sentence resolves to an `id` here.
 */
export function Highlightable({ id, children }: { id: string; children: ReactNode }) {
  const { target } = useHighlight()
  const ref = useRef<HTMLDivElement>(null)
  const isActive = target === id

  useEffect(() => {
    if (isActive) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [isActive])

  return (
    <div
      ref={ref}
      className="rounded-xl ring-4 ring-offset-2 transition-all duration-300"
      style={
        isActive
          ? ({ '--tw-ring-color': 'rgb(99 102 241 / 0.7)', boxShadow: '0 0 0 6px rgb(99 102 241 / 0.15)' } as CSSProperties)
          : ({ '--tw-ring-color': 'transparent' } as CSSProperties)
      }
    >
      {children}
    </div>
  )
}
