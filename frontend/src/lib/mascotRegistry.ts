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
