import { motion } from 'framer-motion'
import { ACCENT } from '@/lib/palette'

/**
 * Shown when starting a conversation fails (network error, backend down,
 * origin not registered, etc.) — previously this just silently collapsed
 * the widget back to its bubble with zero explanation, so a visitor who
 * tapped "Talk" saw it vanish with no idea anything went wrong.
 */
export function WidgetErrorCard({
  message,
  onRetry,
  onDismiss,
}: {
  message: string
  onRetry: () => void
  onDismiss: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="fixed bottom-24 right-6 z-[2147483647] w-72 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl"
    >
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
      >
        ×
      </button>
      <p className="pr-4 text-sm text-gray-700">⚠️ {message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 w-full rounded-lg py-2 text-sm font-semibold text-white"
        style={{ backgroundColor: ACCENT }}
      >
        Try again
      </button>
    </motion.div>
  )
}
