import type { ReactNode } from 'react'
import { ACCENT } from '@/lib/palette'

/** Consistent white card shell used across every portal page — replaces
 * the ad-hoc mix of border-only divs each page previously rolled itself. */
export function PortalCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-6 shadow-sm ${className}`}>{children}</div>
  )
}

export function PortalPageHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="mb-8 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-gray-500">{description}</p>}
      </div>
      {action}
    </div>
  )
}

const VARIANT_CLASS = {
  primary: 'text-white shadow-sm hover:brightness-110',
  secondary: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
  ghost: 'text-gray-500 hover:bg-gray-100 hover:text-gray-900',
} as const

export function PortalButton({
  children,
  variant = 'primary',
  type = 'button',
  onClick,
  disabled,
  className = '',
}: {
  children: ReactNode
  variant?: keyof typeof VARIANT_CLASS
  type?: 'button' | 'submit'
  onClick?: () => void
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT_CLASS[variant]} ${className}`}
      style={variant === 'primary' ? { backgroundColor: ACCENT } : undefined}
    >
      {children}
    </button>
  )
}

/** A small rounded-rect frame mimicking a phone/browser chrome — used
 * anywhere the portal shows a "this is what visitors actually see"
 * preview, so it reads as a live preview rather than a floating mascot. */
export function PreviewFrame({ children, label = 'Live preview' }: { children: ReactNode; label?: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center gap-1.5 border-b border-gray-100 bg-gray-50 px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
        <span className="ml-2 text-[11px] font-medium text-gray-400">{label}</span>
      </div>
      <div className="flex flex-col items-center justify-end gap-3 bg-gradient-to-b from-gray-50 to-white p-5" style={{ minHeight: 240 }}>
        {children}
      </div>
    </div>
  )
}

export function Badge({ children, color }: { children: ReactNode; color: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
      style={{ backgroundColor: `${color}1a`, color }}
    >
      {children}
    </span>
  )
}
