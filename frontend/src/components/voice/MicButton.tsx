import { motion } from 'framer-motion'

export function MicButton({
  isListening,
  isSupported,
  disabled,
  onClick,
}: {
  isListening: boolean
  isSupported: boolean
  disabled?: boolean
  onClick: () => void
}) {
  if (!isSupported) {
    return (
      <p className="max-w-xs text-center text-xs text-gray-400">
        Your browser doesn't support voice input. Try Chrome or Edge on desktop.
      </p>
    )
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: 0.94 }}
      className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-40 ${
        isListening ? 'bg-red-500 text-white' : 'border border-gray-300 bg-white text-gray-800'
      }`}
    >
      <MicIcon />
      {isListening ? 'Listening — tap to stop' : 'Tap to speak'}
    </motion.button>
  )
}

function MicIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  )
}
