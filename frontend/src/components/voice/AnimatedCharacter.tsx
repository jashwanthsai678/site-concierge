import { useState } from 'react'
import { motion } from 'framer-motion'
import { mascotAssetsFor } from '@/lib/mascotRegistry'

export type VoiceOrbState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'pointing'

const STATE_LABEL: Record<VoiceOrbState, string> = {
  idle: 'Ready',
  listening: 'Listening…',
  thinking: 'Thinking…',
  speaking: 'Speaking…',
  pointing: 'Let me show you…',
}

const STATE_ANIMATION: Record<VoiceOrbState, { animate: Record<string, number[]>; duration: number }> = {
  idle: { animate: { y: [0, -4, 0] }, duration: 2.6 },
  listening: { animate: { y: [0, -5, 0] }, duration: 2.2 },
  thinking: { animate: { rotate: [0, -3, 3, -1.5, 0] }, duration: 2.2 },
  speaking: { animate: { scale: [1, 1.02, 1] }, duration: 0.5 },
  pointing: { animate: { x: [0, 6, 0] }, duration: 0.8 },
}

/**
 * The mascot's full-body figure — only one true full-body pose exists
 * (fullbody.png; the others are bust-only crops), so state is conveyed
 * through motion on this single image rather than swapping his body, which
 * would look broken (sudden framing/zoom change) mid-conversation.
 */
export function AnimatedCharacter({
  state,
  mascotKey = 'default',
  compact = false,
}: {
  state: VoiceOrbState
  mascotKey?: string
  compact?: boolean
}) {
  const height = compact ? 190 : 260
  const [failed, setFailed] = useState(false)
  const { animate, duration } = STATE_ANIMATION[state]
  const { fullbody } = mascotAssetsFor(mascotKey)

  return (
    <div className="flex flex-col items-center">
      <motion.div
        style={{ height, width: height * 0.42 }}
        animate={animate}
        transition={{ duration, repeat: Infinity, ease: 'easeInOut' }}
      >
        {failed ? (
          <div className="flex h-full w-full items-end justify-center pb-4 text-4xl">🧑‍💼</div>
        ) : (
          <img
            src={fullbody}
            alt=""
            className="h-full w-full object-contain object-bottom drop-shadow-xl"
            onError={() => setFailed(true)}
          />
        )}
      </motion.div>
      <span className="mt-1 text-xs font-medium text-gray-500">{STATE_LABEL[state]}</span>
    </div>
  )
}
