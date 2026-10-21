import { resolveDemoPhotoUrl } from './demoArtCatalog'
import type { DemoDb } from './types'

const DEMO_UPLOAD_PATH = 'demo-upload/user-photo.webp'

/** Принять «загрузку» в демо: сохраняем путь и отдаём URL как в prod. */
export function handleDemoPhotoUpload(db: DemoDb, shopUid: number, segments: string[]): Response | null {
  // /api/me/flowers/:id/photo/
  if (segments[1] === 'me' && segments[2] === 'flowers' && segments[4] === 'photo') {
    const id = Number.parseInt(segments[3]!, 10)
    const sf = db.storeFlowers.find((s) => s.id === id && s.user_id === shopUid)
    if (!sf) return null
    sf.photo_path = DEMO_UPLOAD_PATH
    return jsonOk({ photo_url: resolveDemoPhotoUrl('flower', sf.id, sf.photo_path) })
  }

  // /api/me/stock/retail/:id/photo/
  if (segments[1] === 'me' && segments[2] === 'stock' && segments[3] === 'retail' && segments[5] === 'photo') {
    const id = Number.parseInt(segments[4]!, 10)
    const p = db.retailProducts.find((x) => x.id === id && x.user_id === shopUid)
    if (!p) return null
    p.photo_path = DEMO_UPLOAD_PATH
    return jsonOk({ photo_url: resolveDemoPhotoUrl('retail', p.id, p.photo_path) })
  }

  // /api/me/stock/consumables/:id/photo/
  if (
    segments[1] === 'me' &&
    segments[2] === 'stock' &&
    segments[3] === 'consumables' &&
    segments[5] === 'photo'
  ) {
    const id = Number.parseInt(segments[4]!, 10)
    const c = db.consumables.find((x) => x.id === id && x.user_id === shopUid)
    if (!c) return null
    c.photo_path = DEMO_UPLOAD_PATH
    return jsonOk({ photo_url: resolveDemoPhotoUrl('consumable', c.id, c.photo_path) })
  }

  // /api/me/stock/bouquets/:id/photo/
  if (segments[1] === 'me' && segments[2] === 'stock' && segments[3] === 'bouquets' && segments[5] === 'photo') {
    const id = Number.parseInt(segments[4]!, 10)
    const b = db.bouquets.find((x) => x.id === id && x.user_id === shopUid)
    if (!b) return null
    b.photo_path = DEMO_UPLOAD_PATH
    return jsonOk({ photo_url: resolveDemoPhotoUrl('bouquet', b.id, b.photo_path) })
  }

  return null
}

function jsonOk(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
