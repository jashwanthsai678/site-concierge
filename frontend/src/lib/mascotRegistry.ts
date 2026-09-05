export interface MascotAssets {
  fullbody: string
  welcoming: string
}

/**
 * Maps a business's `mascot_key` (backend/app/models/business.py) to its
 * character art. Only "default" has real art today — the registry exists so
 * a second mascot is one new entry + asset files, not a code change, once
 * more character art is produced. `mascotAssetsFor` always falls back to
 * "default" for an unknown/unregistered key, so an old business row or a
 * typo'd key never renders a broken image.
 *
 * `assetBase` matters for the standalone embeddable widget
 * (widget-embed.tsx): these paths are root-relative, which resolves
 * correctly against THIS app's own origin when rendered in-app (the
 * default, empty assetBase) — but embedded on a client's external site, a
 * root-relative path would resolve against THEIR origin instead, since
 * that's whatever `window.location` the browser is currently on. The embed
 * entry passes the widget script's own origin as assetBase so these always
 * point back at wherever this app's static assets are actually hosted.
 */
const MASCOT_REGISTRY: Record<string, MascotAssets> = {
  default: { fullbody: '/mascot/fullbody.png', welcoming: '/mascot/welcoming.png' },
}

export function mascotAssetsFor(mascotKey: string, assetBase = ''): MascotAssets {
  const assets = MASCOT_REGISTRY[mascotKey] ?? MASCOT_REGISTRY.default
  return {
    fullbody: assetBase + assets.fullbody,
    welcoming: assetBase + assets.welcoming,
  }
}

/**
 * Resolves what image(s) to actually render, preferring a business's own
 * uploaded mascot image (backend/app/api/routers/portal.py's mascot-image
 * endpoint) over the built-in registry when one is set. The uploaded file
 * is served BY THE BACKEND (`/uploads/mascots/...`), not bundled into this
 * frontend build like registry art is — so it resolves against `apiBase`
 * (the same prop the widget already uses for its API calls), not
 * `assetBase` (which only applies to this build's own bundled assets).
 * One uploaded image stands in for both the full-body and bubble crops
 * rather than requiring two separate uploads.
 */
export function resolveMascotAssets(
  mascotKey: string,
  customImageUrl: string | null | undefined,
  assetBase = '',
  apiBase = '',
): MascotAssets {
  if (customImageUrl) {
    const url = apiBase + customImageUrl
    return { fullbody: url, welcoming: url }
  }
  return mascotAssetsFor(mascotKey, assetBase)
}

/** Drives the portal's mascot picker — one entry per registered character.
 * Adding a second mascot later is: one new MASCOT_REGISTRY entry above +
 * one new entry here, no other code changes. */
export const MASCOT_OPTIONS: { key: string; label: string }[] = [
  { key: 'default', label: 'Classic' },
]

export type MascotEnergy = 'calm' | 'balanced' | 'energetic'

export const MASCOT_ENERGY_OPTIONS: { key: MascotEnergy; label: string; hint: string }[] = [
  { key: 'calm', label: 'Calm', hint: 'Subtle, minimal movement — best for formal/professional tones' },
  { key: 'balanced', label: 'Balanced', hint: 'Natural, moderate movement — the default' },
  { key: 'energetic', label: 'Energetic', hint: 'Lively, expressive movement — best for casual/friendly tones' },
]
