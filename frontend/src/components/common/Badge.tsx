import type { ReactNode } from 'react'

export function Badge({
  children,
  color = '#898781',
  icon,
}: {
  children: ReactNode
  color?: string
  icon?: ReactNode
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ color, backgroundColor: `${color}22`, border: `1px solid ${color}44` }}
    >
      {icon}
      {children}
    </span>
  )
}
