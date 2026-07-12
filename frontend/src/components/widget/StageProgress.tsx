import { ACCENT } from '@/lib/palette'

const STEPS = ['Discovery', 'Qualification', 'Recommendation', 'Closing']

/** A 4-step funnel indicator — step is 0-4, see lib/stageGuide.ts for how backend stages map onto it. */
export function StageProgress({ step }: { step: number }) {
  return (
    <div
      className="flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 shadow-md backdrop-blur"
      aria-label="Conversation progress"
    >
      {STEPS.map((label, i) => {
        const stepNumber = i + 1
        return (
          <span
            key={label}
            title={label}
            className="h-1.5 flex-1 rounded-full transition-colors duration-500"
            style={{ backgroundColor: step >= stepNumber ? ACCENT : '#e5e7eb' }}
          />
        )
      })}
    </div>
  )
}
