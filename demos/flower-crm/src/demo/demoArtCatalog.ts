import { demoAssetUrl, photoUrlFromPath } from './demoAssetUrl'

export const CANONICAL_STORE_FLOWER_PHOTOS: Record<number, string> = {
  101: 'demo-art/flower-explorer.webp',
  102: 'demo-art/flower-red.webp',
  103: 'demo-art/flower-freedom.webp',
  104: 'demo-art/flower-altai.webp',
  105: 'demo-art/flower-sprengeri.webp',
  106: 'demo-art/flower-gerbera-pink.webp',
  107: 'demo-art/flower-gerbera-orange.webp',
  108: 'demo-art/flower-white-ohara.webp',
  109: 'demo-art/flower-mondial.webp',
}

export const CANONICAL_RETAIL_PHOTOS: Record<number, string> = {
  5001: 'demo-art/retail-card.webp',
  5002: 'demo-art/retail-bag.webp',
  5003: 'demo-art/retail-vase.webp',
  5004: 'demo-art/retail-candle.webp',
  5005: 'demo-art/retail-tissue.webp',
  5006: 'demo-art/retail-box.webp',
}

export const CANONICAL_BOUQUET_PHOTOS: Record<number, string> = {
  4001: 'demo-art/bouquet-red.webp',
  4002: 'demo-art/bouquet-field-mix.webp',
  4003: 'demo-art/bouquet-classic.webp',
  4004: 'demo-art/bouquet-sunny-mix.webp',
  4005: 'demo-art/bouquet-white-classic.webp',
  4006: 'demo-art/bouquet-gerbera-mix.webp',
}

export const CANONICAL_CONSUMABLE_PHOTOS: Record<number, string> = {
  6001: 'demo-art/consumable-ribbon.webp',
  6002: 'demo-art/consumable-kraft.webp',
  6003: 'demo-art/consumable-oasis.webp',
}

const FALLBACK: Record<'flower' | 'retail' | 'bouquet' | 'consumable', string> = {
  flower: 'flower-art-placeholder.webp',
  retail: 'retail-product-placeholder.webp',
  bouquet: 'bouquet-placeholder.webp',
  consumable: 'consumable-placeholder.webp',
}

const CANON_BY_KIND = {
  flower: CANONICAL_STORE_FLOWER_PHOTOS,
  retail: CANONICAL_RETAIL_PHOTOS,
  bouquet: CANONICAL_BOUQUET_PHOTOS,
  consumable: CANONICAL_CONSUMABLE_PHOTOS,
} as const

function normalizeStoredPath(raw: string | null | undefined): string | null {
  if (raw == null) return null
  const s = String(raw).trim()
  if (!s) return null
  if (s.includes('demo-art/') && s.endsWith('.svg')) return `${s.slice(0, -4)}.webp`
  return s
}

/** Всегда отдаёт рабочий URL с учётом Vite base (для UI и API). */
export function resolveDemoPhotoUrl(
  kind: keyof typeof CANON_BY_KIND,
  _entityId: number | null | undefined,
  rawPath: string | null | undefined,
): string {
  const path = normalizeStoredPath(rawPath)
  if (path) {
    const url = photoUrlFromPath(path)
    if (url) return url
  }
  return demoAssetUrl(FALLBACK[kind])
}

export function applyCanonicalDemoPhotos(db: {
  storeFlowers: Array<{ id: number; photo_path: string | null }>
  retailProducts: Array<{ id: number; photo_path: string | null }>
  bouquets: Array<{ id: number; photo_path: string | null }>
  consumables: Array<{ id: number; photo_path: string | null }>
}): boolean {
  let changed = false
  const touch = (id: number, map: Record<number, string>, row: { photo_path: string | null }) => {
    const path = map[id]
    if (path && row.photo_path !== path) {
      row.photo_path = path
      changed = true
    }
  }
  for (const sf of db.storeFlowers) touch(sf.id, CANONICAL_STORE_FLOWER_PHOTOS, sf)
  for (const p of db.retailProducts) touch(p.id, CANONICAL_RETAIL_PHOTOS, p)
  for (const b of db.bouquets) touch(b.id, CANONICAL_BOUQUET_PHOTOS, b)
  for (const c of db.consumables) touch(c.id, CANONICAL_CONSUMABLE_PHOTOS, c)
  return changed
}
