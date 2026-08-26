import type { ReactNode } from 'react'

export function GlassCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-[0_1px_0_rgba(255,255,255,0.05)_inset] ${className}`}
    >
      {children}
    </div>
  )
}
