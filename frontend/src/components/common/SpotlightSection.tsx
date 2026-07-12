import { AnimatePresence, motion } from 'framer-motion'
import type { ReactNode } from 'react'

/**
 * Wraps a page region with a pulsing colored ring + a floating caption when
 * `active` — this is what makes "the AI scrolled you here" feel like the AI
 * is actually pointing at something, rather than a silent, easy-to-miss
 * scroll. Purely presentational; the host page owns the timing (see
 * CompanyWebsitePage's spotlight-clear timeout).
 */
export function SpotlightSection({
  active,
  color,
  caption,
  children,
  className = '',
}: {
  active: boolean
  color: string
  caption: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`relative ${className}`}>
      <AnimatePresence>
        {active && (
          <>
            <motion.div
              key="spotlight-ring"
              className="pointer-events-none absolute -inset-3 z-10 rounded-2xl border-4"
              style={{ borderColor: color }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.9, 0.35, 0.9] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              key="spotlight-caption"
              className="absolute left-1/2 top-3 z-20 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-semibold text-white shadow-lg"
              style={{ backgroundColor: color }}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
            >
              {caption}
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {children}
    </div>
  )
}
