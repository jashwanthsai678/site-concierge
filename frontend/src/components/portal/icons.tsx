import type { CSSProperties } from 'react'

/**
 * Hand-authored line icons (24x24, stroke=currentColor) for the portal nav
 * and page chrome — no icon library dependency for a handful of shapes.
 * Sizing/color are controlled by the parent via className/style, same as
 * any inline SVG usage elsewhere in this codebase.
 */
type IconProps = { className?: string; style?: CSSProperties }

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export function HomeIcon({ className, style }: IconProps) {
  return (
    <svg {...base} className={className} style={style}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-9" />
      <path d="M9.5 20v-6h5v6" />
    </svg>
  )
}

export function BotIcon({ className, style }: IconProps) {
  return (
    <svg {...base} className={className} style={style}>
      <rect x="4" y="8" width="16" height="11" rx="3" />
      <path d="M12 8V4" />
      <circle cx="12" cy="3" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="9" cy="13.5" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="15" cy="13.5" r="1.3" fill="currentColor" stroke="none" />
      <path d="M9 17h6" />
      <path d="M2 12.5h2M20 12.5h2" />
    </svg>
  )
}

export function BookIcon({ className, style }: IconProps) {
  return (
    <svg {...base} className={className} style={style}>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H12v17H6.5A2.5 2.5 0 0 0 4 22.5v-17Z" />
      <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H12v17h5.5a2.5 2.5 0 0 1 2.5 2.5v-17Z" />
    </svg>
  )
}

export function GearIcon({ className, style }: IconProps) {
  return (
    <svg {...base} className={className} style={style}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 3.5v2.3M12 18.2v2.3M20.5 12h-2.3M5.8 12H3.5M17.8 6.2l-1.6 1.6M7.8 16.2l-1.6 1.6M17.8 17.8l-1.6-1.6M7.8 7.8 6.2 6.2" />
    </svg>
  )
}

export function LinkIcon({ className, style }: IconProps) {
  return (
    <svg {...base} className={className} style={style}>
      <path d="M9.5 14.5 14.5 9.5" />
      <path d="M11 6.5 12.6 4.9a3.6 3.6 0 0 1 5.1 5.1L16 11.7" />
      <path d="M13 17.5 11.4 19.1a3.6 3.6 0 0 1-5.1-5.1L8 12.3" />
    </svg>
  )
}

export function UsersIcon({ className, style }: IconProps) {
  return (
    <svg {...base} className={className} style={style}>
      <circle cx="9" cy="8.5" r="3" />
      <path d="M2.8 19.5a6.2 6.2 0 0 1 12.4 0" />
      <path d="M15.5 6a3 3 0 0 1 0 5.8" />
      <path d="M17.5 13.8a6.2 6.2 0 0 1 3.7 5.7" />
    </svg>
  )
}

export function LogOutIcon({ className, style }: IconProps) {
  return (
    <svg {...base} className={className} style={style}>
      <path d="M9 20H5.5A1.5 1.5 0 0 1 4 18.5v-13A1.5 1.5 0 0 1 5.5 4H9" />
      <path d="M15.5 16.5 20 12l-4.5-4.5" />
      <path d="M20 12H9" />
    </svg>
  )
}

export function CheckIcon({ className, style }: IconProps) {
  return (
    <svg {...base} className={className} style={style}>
      <path d="M4.5 12.5 9.5 17.5 19.5 6.5" />
    </svg>
  )
}

export function CopyIcon({ className, style }: IconProps) {
  return (
    <svg {...base} className={className} style={style}>
      <rect x="8.5" y="8.5" width="11" height="12" rx="2" />
      <path d="M15.5 8.5V5.5a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
    </svg>
  )
}

export function MenuIcon({ className, style }: IconProps) {
  return (
    <svg {...base} className={className} style={style}>
      <path d="M4 6.5h16M4 12h16M4 17.5h16" />
    </svg>
  )
}

export function XIcon({ className, style }: IconProps) {
  return (
    <svg {...base} className={className} style={style}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}

export function ChartIcon({ className, style }: IconProps) {
  return (
    <svg {...base} className={className} style={style}>
      <path d="M4 20V4" />
      <path d="M4 20h16" />
      <path d="M8 20v-6M12.5 20v-9M17 20v-4" />
    </svg>
  )
}

export function SparkIcon({ className, style }: IconProps) {
  return (
    <svg {...base} className={className} style={style}>
      <path d="M12 3.5c.6 3 2.4 4.9 5.5 5.5-3 .6-4.9 2.4-5.5 5.5-.6-3-2.4-4.9-5.5-5.5 3-.6 4.9-2.4 5.5-5.5Z" />
      <path d="M19 15.5c.3 1.4 1.1 2.2 2.5 2.5-1.4.3-2.2 1.1-2.5 2.5-.3-1.4-1.1-2.2-2.5-2.5 1.4-.3 2.2-1.1 2.5-2.5Z" />
    </svg>
  )
}
