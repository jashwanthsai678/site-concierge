import { GlassCard } from '@/components/common/GlassCard'

export function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <GlassCard className="p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-white/50">{label}</p>
      <p className="mt-2 text-3xl font-bold text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-white/40">{hint}</p>}
    </GlassCard>
  )
}
