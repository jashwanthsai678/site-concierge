import { motion } from 'framer-motion'
import { ACCENT } from '@/lib/palette'

export type CommunicationMode = 'voice' | 'text'

export function WidgetPromptCard({
  businessName,
  onAccept,
  onDismiss,
}: {
  businessName: string
  onAccept: (mode: CommunicationMode) => void
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
      <div className="flex items-start gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
          style={{ backgroundColor: ACCENT }}
        >
          {businessName.charAt(0)}
        </div>
        <p className="pt-1 text-sm text-gray-700">
          👋 Have a few questions about {businessName}? I'm happy to help — how would you like to chat?
        </p>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => onAccept('voice')}
          className="flex-1 rounded-lg py-2 text-sm font-semibold text-white"
          style={{ backgroundColor: ACCENT }}
        >
          🎙️ Talk
        </button>
        <button
          type="button"
          onClick={() => onAccept('text')}
          className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          ⌨️ Type
        </button>
      </div>
    </motion.div>
  )
}
