import { useState } from 'react'
import { motion } from 'framer-motion'
import { ACCENT } from '@/lib/palette'
import { resolveMascotAssets } from '@/lib/mascotRegistry'

export function WidgetBubble({
  mascotKey = 'default',
  customImageUrl,
  assetBase = '',
  apiBase = '',
  onClick,
}: {
  mascotKey?: string
  customImageUrl?: string | null
  assetBase?: string
  apiBase?: string
  onClick: () => void
}) {
  const [imageFailed, setImageFailed] = useState(false)
  const { welcoming } = resolveMascotAssets(mascotKey, customImageUrl, assetBase, apiBase)

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="fixed bottom-6 right-6 z-[2147483647] flex h-16 w-16 items-center justify-center overflow-hidden rounded-full shadow-2xl"
      style={{ backgroundColor: ACCENT }}
      aria-label="Talk to us"
    >
      <motion.span
        className="absolute inline-flex h-full w-full rounded-full"
        style={{ backgroundColor: ACCENT }}
        animate={{ scale: [1, 1.6, 1.6], opacity: [0.5, 0, 0] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
      />
      {imageFailed ? (
        <MicGlyph />
      ) : (
        <img
          src={welcoming}
          alt=""
          className="relative h-full w-full object-cover object-top"
          onError={() => setImageFailed(true)}
        />
      )}
    </motion.button>
  )
}

function MicGlyph() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="relative">
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  )
}
