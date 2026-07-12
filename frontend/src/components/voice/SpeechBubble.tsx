import { motion, AnimatePresence } from 'framer-motion'

/**
 * A comic-style speech bubble with a tail pointing down toward the
 * mascot's head/mouth (the mascot is always rendered directly beneath
 * this). `typing` shows bouncing dots instead of text, for the
 * "Thinking…" / "Connecting…" moments where there's nothing to say yet.
 */
export function SpeechBubble({
  text,
  typing = false,
  muted = false,
}: {
  text?: string
  typing?: boolean
  muted?: boolean
}) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={typing ? 'typing' : text}
        initial={{ opacity: 0, y: 6, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="relative max-w-[250px] rounded-2xl bg-white px-4 py-3 text-sm leading-snug shadow-xl"
        style={{ color: muted ? '#6b7280' : '#1f2937' }}
      >
        {typing ? (
          <div className="flex items-center gap-1 px-1 py-0.5">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="h-2 w-2 rounded-full bg-gray-400"
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
              />
            ))}
          </div>
        ) : (
          <p>{muted ? `“${text}”` : text}</p>
        )}
        <span
          aria-hidden
          className="absolute left-9 top-full"
          style={{
            width: 0,
            height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderTop: '10px solid white',
          }}
        />
      </motion.div>
    </AnimatePresence>
  )
}
