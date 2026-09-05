// Values sourced from the dataviz skill's validated default palette
// (dark-mode steps) — colorblind-safe and contrast-checked already, so
// these are used as-is rather than re-validated for a brand swap.

export const STATUS_COLORS = {
  hot: '#d03b3b', // critical — "act now"
  warm: '#fab219', // warning
  cold: '#898781', // muted ink, not a status color — cold isn't an alarm state
} as const

export const LEAD_CATEGORY_COLOR: Record<'Hot' | 'Warm' | 'Cold', string> = {
  Hot: STATUS_COLORS.hot,
  Warm: STATUS_COLORS.warm,
  Cold: STATUS_COLORS.cold,
}

// Ordinal sequential blue ramp (dark-mode steps, darkest no darker than
// step 600) — for the funnel's 4 discrete ordered stages.
export const FUNNEL_RAMP = ['#86b6ef', '#5598e7', '#2a78d6', '#184f95'] as const

export const ACCENT = '#3987e5'
export const ACCENT_STRONG = '#2a78d6'
// ACCENT measures ~4.4:1 against white — just under the 4.5:1 WCAG AA
// minimum for normal-size text. Fine for backgrounds/borders/large text
// (which only need 3:1), but small text/links on a white background
// should use this darker shade instead — verified ~6.8:1.
export const ACCENT_TEXT = '#1d4ed8'

// Fixed 8-hue categorical order — never cycle/reassign per series.
export const CATEGORICAL = [
  '#3987e5', // blue
  '#199e70', // aqua
  '#c98500', // yellow
  '#008300', // green
  '#9085e9', // violet
  '#e66767', // red
  '#d55181', // magenta
  '#d95926', // orange
] as const
