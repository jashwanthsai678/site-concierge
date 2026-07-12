import { useState } from 'react'
import { FUNNEL_RAMP } from '@/lib/palette'
import type { FunnelCounts } from '@/types/analytics'

const STAGES: { key: keyof FunnelCounts; label: string }[] = [
  { key: 'visitors', label: 'Visitors' },
  { key: 'conversations', label: 'Conversations' },
  { key: 'qualified_leads', label: 'Qualified Leads' },
  { key: 'booked_meetings', label: 'Booked Meetings' },
]

export function ConversionFunnelChart({ funnel }: { funnel: FunnelCounts }) {
  const [hovered, setHovered] = useState<number | null>(null)
  const max = Math.max(funnel.visitors, 1)

  return (
    <div className="flex flex-col gap-4">
      {STAGES.map((stage, i) => {
        const value = funnel[stage.key]
        const widthPct = Math.max((value / max) * 100, value > 0 ? 4 : 0)
        const prevValue = i > 0 ? funnel[STAGES[i - 1].key] : null
        const conversionRate = prevValue && prevValue > 0 ? Math.round((value / prevValue) * 100) : null

        return (
          <div key={stage.key} className="relative">
            <div className="mb-1 flex items-center justify-between text-xs text-white/60">
              <span>{stage.label}</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</span>
            </div>
            <div
              className="relative h-3 rounded-full bg-white/5"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              <div
                className="h-3 rounded-full transition-all"
                style={{ width: `${widthPct}%`, backgroundColor: FUNNEL_RAMP[i] }}
              />
              {hovered === i && conversionRate !== null && (
                <div className="absolute -top-8 left-0 rounded-md border border-white/10 bg-black px-2 py-1 text-xs text-white shadow-lg">
                  {conversionRate}% of previous stage
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
