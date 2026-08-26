export interface MascotAssets {
  fullbody: string
}

/**
 * Maps a business's `mascot_key` (backend/app/models/business.py) to its
 * character art. Only "default" has real art today — the registry exists so
 * a second mascot is one new entry + asset files, not a code change, once
 * more character art is produced. `mascotAssetsFor` always falls back to
 * "default" for an unknown/unregistered key, so an old business row or a
 * typo'd key never renders a broken image.
 */
const MASCOT_REGISTRY: Record<string, MascotAssets> = {
  default: { fullbody: '/mascot/fullbody.png' },
}

export function mascotAssetsFor(mascotKey: string): MascotAssets {
  return MASCOT_REGISTRY[mascotKey] ?? MASCOT_REGISTRY.default
}
