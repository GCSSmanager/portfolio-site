import { photoUrlFromPath } from './demoAssetUrl'
import { subscriptionActive } from './serialize'
import { parseMoney } from './money'
import type { DemoDb, DemoUser } from './types'

const RANK_LABEL_RU: Record<string, string> = {
  family: 'Семейство',
  genus: 'Род',
  species: 'Вид',
  cultivar: 'Сорт',
}

function shopDisplayLabel(owner: DemoUser): string {
  const name = (owner.shop_name || '').trim()
  if (name) return name
  if (owner.phone) return `Магазин ${owner.phone}`
  return `Магазин #${owner.id}`
}

function warehousePriceMap(db: DemoDb, shopUid: number): Map<number, string> {
  const out = new Map<number, string>()
  for (const p of db.prices) {
    if (p.user_id !== shopUid) continue
    const price = parseMoney(p.unit_price)
    if (price == null || price <= 0) continue
    out.set(p.store_flower_id, p.unit_price)
  }
  return out
}

function storeFlowerIdsOnStock(db: DemoDb, shopUid: number): Set<number> {
  const ids = new Set<number>()
  for (const b of db.batches) {
    if (b.user_id === shopUid && b.quantity > 0 && b.store_flower_id) {
      ids.add(b.store_flower_id)
    }
  }
  return ids
}

export function marketplaceCatalogForShop(db: DemoDb, shopUid: number) {
  const priceMap = warehousePriceMap(db, shopUid)
  const onStock = storeFlowerIdsOnStock(db, shopUid)

  const flowers = db.storeFlowers
    .filter((sf) => sf.user_id === shopUid)
    .map((sf) => {
      const t = db.taxons.find((x) => x.id === sf.taxon_id)
      const display_name = (sf.name_override || '').trim() || (t ? t.name_ru || t.name : 'Цветок')
      const latin_name = t?.name ?? null
      const rank_label = t ? (RANK_LABEL_RU[t.rank] ?? t.rank) : ''
      const rawPrice = priceMap.get(sf.id)
      return {
        store_flower_id: sf.id,
        display_name,
        latin_name,
        rank_label,
        photo_url: photoUrlFromPath(sf.photo_path),
        in_stock: onStock.has(sf.id),
        unit_price: rawPrice ?? null,
      }
    })
    .sort((a, b) => a.display_name.localeCompare(b.display_name, 'ru'))

  const retail_products = db.retailProducts
    .filter((p) => p.user_id === shopUid && p.quantity > 0)
    .filter((p) => {
      const up = parseMoney(p.unit_price)
      return up != null && up > 0
    })
    .map((p) => ({
      id: p.id,
      name: p.name,
      unit_price: p.unit_price,
      photo_url: photoUrlFromPath(p.photo_path),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'))

  const bouquets = db.bouquets
    .filter((b) => b.user_id === shopUid && b.quantity > 0)
    .filter((b) => {
      const up = b.unit_price ? parseMoney(b.unit_price) : null
      return up != null && up > 0
    })
    .map((b) => ({
      id: b.id,
      name: b.name,
      unit_price: b.unit_price!,
      photo_url: photoUrlFromPath(b.photo_path),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'))

  return { flowers, retail_products, bouquets }
}

function catalogCounts(catalog: ReturnType<typeof marketplaceCatalogForShop>) {
  return {
    flowers: catalog.flowers.length,
    retail_products: catalog.retail_products.length,
    bouquets: catalog.bouquets.length,
  }
}

export function listMarketShops(db: DemoDb) {
  const owners = db.users.filter(
    (u) => u.role === 'owner' && subscriptionActive(u),
  )
  const shops = owners.map((owner) => {
    const catalog = marketplaceCatalogForShop(db, owner.id)
    const counts = catalogCounts(catalog)
    const name = shopDisplayLabel(owner)
    return {
      id: owner.id,
      name,
      label: name,
      phone: owner.phone || null,
      flowers_count: counts.flowers,
      retail_count: counts.retail_products,
      bouquets_count: counts.bouquets,
      items_count: counts.flowers + counts.retail_products + counts.bouquets,
    }
  })
  shops.sort((a, b) => {
    if (b.items_count !== a.items_count) return b.items_count - a.items_count
    return a.label.localeCompare(b.label, 'ru')
  })
  return shops
}

export function marketShopCatalog(db: DemoDb, shopId: number) {
  const owner = db.users.find((u) => u.id === shopId && u.role === 'owner')
  if (!owner || !subscriptionActive(owner)) return null
  const catalog = marketplaceCatalogForShop(db, owner.id)
  return {
    shop: {
      id: owner.id,
      name: shopDisplayLabel(owner),
      phone: owner.phone || null,
    },
    ...catalog,
  }
}
