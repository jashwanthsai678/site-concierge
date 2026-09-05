import { useState } from 'react'
import { motion } from 'framer-motion'
import { mascotAssetsFor, type MascotEnergy } from '@/lib/mascotRegistry'

export type VoiceOrbState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'pointing'

// How much each energy level scales the SAME animation's amplitude (pixel
// offsets / rotation degrees) and speed — this is the whole "expression"
// mechanism when there's only one static character image: calm and
// energetic never move differently in kind, only in how much and how fast.
const ENERGY_FACTOR: Record<MascotEnergy, { amplitude: number; speed: number }> = {
  calm: { amplitude: 0.55, speed: 0.75 },
  balanced: { amplitude: 1, speed: 1 },
  energetic: { amplitude: 1.6, speed: 1.3 },
}

function scaleAnimation(
  animate: Record<string, number[]>,
  amplitude: number,
): Record<string, number[]> {
  const scaled: Record<string, number[]> = {}
  for (const [key, values] of Object.entries(animate)) {
    // `scale` values sit around 1 (e.g. [1, 1.02, 1]) — scale the DEVIATION
    // from 1, not the raw number, or amplitude=0 would shrink the mascot to
    // nothing instead of just holding it still.
    scaled[key] = key === 'scale' ? values.map((v) => 1 + (v - 1) * amplitude) : values.map((v) => v * amplitude)
  }
  return scaled
}

const STATE_LABEL: Record<VoiceOrbState, string> = {
  idle: 'Ready',
  listening: 'Listening…',
  thinking: 'Thinking…',
  speaking: 'Speaking…',
  pointing: 'Let me show you…',
}

/**
 * `stageTier` (0-4, see lib/stageGuide.ts::stepIndexForStage) makes the SAME
 * pose read as progressively more present/confident as the funnel advances
 * — the only art asset is one static full-body image, so "expression" can
 * only ever come from how it moves, not what it looks like. A visitor near
 * booking should feel like the mascot is more engaged than one who just
 * said hello, without needing new character art to show it.
 */
function animationFor(state: VoiceOrbState, stageTier: number): { animate: Record<string, number[]>; duration: number } {
  const tier = Math.min(Math.max(stageTier, 0), 4)
  switch (state) {
    case 'idle':
      return { animate: { y: [0, -(4 + tier), 0] }, duration: 2.6 - tier * 0.15 }
    case 'listening':
      return { animate: { y: [0, -(5 + tier), 0] }, duration: 2.2 - tier * 0.1 }
    case 'thinking':
      return { animate: { rotate: [0, -3, 3, -1.5, 0] }, duration: 2.2 }
    case 'speaking':
      return { animate: { scale: [1, 1.02 + tier * 0.005, 1] }, duration: 0.5 }
    case 'pointing':
      return { animate: { x: [0, 6, 0] }, duration: 0.8 }
  }
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
  assetBase = '',
  compact = false,
  stageTier = 0,
  energy = 'balanced',
}: {
  state: VoiceOrbState
  mascotKey?: string
  assetBase?: string
  compact?: boolean
  stageTier?: number
  energy?: MascotEnergy
}) {
  const height = compact ? 190 : 260
  const [failed, setFailed] = useState(false)
  const base = animationFor(state, stageTier)
  const { amplitude, speed } = ENERGY_FACTOR[energy] ?? ENERGY_FACTOR.balanced
  const animate = scaleAnimation(base.animate, amplitude)
  const duration = base.duration / speed
  const { fullbody } = mascotAssetsFor(mascotKey, assetBase)

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
