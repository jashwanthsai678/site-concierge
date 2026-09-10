import { motion } from 'framer-motion'
import { TranscriptPanel } from '@/components/voice/TranscriptPanel'
import { ACCENT } from '@/lib/palette'
import type { TranscriptEntry } from '@/types/conversation'

export function HistoryDrawer({
  businessName,
  entries,
  onClose,
}: {
  businessName: string
  entries: TranscriptEntry[]
  onClose: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="fixed bottom-4 right-4 z-[2147483647] flex h-[480px] w-[340px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl sm:bottom-6 sm:right-6"
    >
      <div className="flex items-center justify-between px-4 py-3 text-white" style={{ backgroundColor: ACCENT }}>
        <p className="text-sm font-semibold">{businessName} — Conversation</p>
        <button type="button" onClick={onClose} aria-label="Close history" className="text-white/80 hover:text-white">
          ×
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <TranscriptPanel entries={entries} />
      </div>
    </motion.div>
  )
}
