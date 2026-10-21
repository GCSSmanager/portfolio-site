import { resolveDemoPhotoUrl } from './demoArtCatalog'
import { moneyStr, parseMoney } from './money'
import type { DemoDb } from './types'

const RANK_LABEL_RU: Record<string, string> = {
  family: 'Семейство',
  genus: 'Род',
  species: 'Вид',
  cultivar: 'Сорт',
}

function onStockStoreFlowerIds(db: DemoDb, shopUid: number): Set<number> {
  const ids = new Set<number>()
  for (const b of db.batches) {
    if (b.user_id === shopUid && b.quantity > 0 && b.store_flower_id != null) {
      ids.add(b.store_flower_id)
    }
  }
  return ids
}

function flowerDisplayName(db: DemoDb, sf: DemoDb['storeFlowers'][number]): string {
  if (sf.name_override.trim()) return sf.name_override.trim()
  const t = db.taxons.find((x) => x.id === sf.taxon_id)
  return t ? (t.name_ru || t.name).trim() || t.name : '—'
}

export function pricesCatalogPayload(db: DemoDb, shopUid: number) {
  const onStock = onStockStoreFlowerIds(db, shopUid)

  const flowers = db.storeFlowers
    .filter((sf) => sf.user_id === shopUid)
    .map((sf) => {
      const t = db.taxons.find((x) => x.id === sf.taxon_id)
      const price = db.prices.find((p) => p.user_id === shopUid && p.store_flower_id === sf.id)
      return {
        store_flower_id: sf.id,
        display_name: flowerDisplayName(db, sf),
        latin_name: t?.name ?? null,
        rank_label: t ? (RANK_LABEL_RU[t.rank] ?? t.rank) : '',
        unit_price: price?.unit_price && parseFloat(price.unit_price) > 0 ? moneyStr(price.unit_price) : null,
        on_warehouse: onStock.has(sf.id),
        photo_url: resolveDemoPhotoUrl('flower', sf.id, sf.photo_path),
      }
    })
  flowers.sort((a, b) => {
    if (a.on_warehouse !== b.on_warehouse) return a.on_warehouse ? -1 : 1
    return a.display_name.localeCompare(b.display_name, 'ru')
  })

  const retail_products = db.retailProducts
    .filter((p) => p.user_id === shopUid)
    .map((p) => ({
      id: p.id,
      name: p.name,
      unit_price: parseFloat(p.unit_price) > 0 ? moneyStr(p.unit_price) : null,
      on_warehouse: p.quantity > 0,
      photo_url: resolveDemoPhotoUrl('retail', p.id, p.photo_path),
    }))
  retail_products.sort((a, b) => {
    if (a.on_warehouse !== b.on_warehouse) return a.on_warehouse ? -1 : 1
    return a.name.localeCompare(b.name, 'ru')
  })

  const bouquets = db.bouquets
    .filter((b) => b.user_id === shopUid)
    .map((b) => ({
      id: b.id,
      name: b.name,
      unit_price:
        b.unit_price && parseFloat(b.unit_price) > 0 ? moneyStr(b.unit_price) : null,
      on_warehouse: b.quantity > 0,
      photo_url: resolveDemoPhotoUrl('bouquet', b.id, b.photo_path),
    }))
  bouquets.sort((a, b) => {
    if (a.on_warehouse !== b.on_warehouse) return a.on_warehouse ? -1 : 1
    return a.name.localeCompare(b.name, 'ru')
  })

  return { flowers, retail_products, bouquets }
}

function parseUnitPriceField(
  body: Record<string, unknown>,
): { ok: true; value: number | null } | { ok: false; error: string } {
  if (!('unit_price' in body)) {
    return { ok: false, error: 'Укажите unit_price (число или null).' }
  }
  const raw = body.unit_price
  if (raw === null || raw === '') return { ok: true, value: null }
  const parsed = parseMoney(raw)
  if (parsed === null) {
    return { ok: false, error: 'unit_price: ожидается число или пустая строка.' }
  }
  return { ok: true, value: parsed }
}

export function putWarehousePrice(
  db: DemoDb,
  shopUid: number,
  body: Record<string, unknown>,
  allocId: () => number,
): { error?: string; status?: number; payload?: Record<string, unknown> } {
  if (body.bouquet_id != null && body.bouquet_id !== '') {
    const bouquetId = Number.parseInt(String(body.bouquet_id), 10)
    if (!Number.isFinite(bouquetId)) {
      return { error: 'Укажите целочисленный bouquet_id.', status: 400 }
    }
    const priceField = parseUnitPriceField(body)
    if (!priceField.ok) return { error: priceField.error, status: 400 }
    const bouquet = db.bouquets.find((b) => b.id === bouquetId && b.user_id === shopUid)
    if (!bouquet) return { error: 'Букет не найден.', status: 404 }
    const parsed = priceField.value
    if (parsed === null || parsed <= 0) {
      bouquet.unit_price = '0.00'
      return { payload: { bouquet_id: bouquetId, unit_price: null } }
    }
    if (parsed < 0) return { error: 'Цена не может быть отрицательной.', status: 400 }
    bouquet.unit_price = moneyStr(parsed)
    return { payload: { bouquet_id: bouquetId, unit_price: moneyStr(bouquet.unit_price) } }
  }

  if (body.retail_product_id != null && body.retail_product_id !== '') {
    const productId = Number.parseInt(String(body.retail_product_id), 10)
    if (!Number.isFinite(productId)) {
      return { error: 'Укажите целочисленный retail_product_id.', status: 400 }
    }
    const priceField = parseUnitPriceField(body)
    if (!priceField.ok) return { error: priceField.error, status: 400 }
    const product = db.retailProducts.find((p) => p.id === productId && p.user_id === shopUid)
    if (!product) return { error: 'Товар не найден.', status: 404 }
    const parsed = priceField.value
    if (parsed === null || parsed <= 0) {
      product.unit_price = '0.00'
      return { payload: { retail_product_id: productId, unit_price: null } }
    }
    if (parsed < 0) return { error: 'Цена не может быть отрицательной.', status: 400 }
    product.unit_price = moneyStr(parsed)
    return { payload: { retail_product_id: productId, unit_price: moneyStr(product.unit_price) } }
  }

  const rawSf = body.store_flower_id
  if (rawSf != null && rawSf !== '') {
    const sfId = Number.parseInt(String(rawSf), 10)
    if (!Number.isFinite(sfId)) {
      return { error: 'store_flower_id: ожидается число.', status: 400 }
    }
    const priceField = parseUnitPriceField(body)
    if (!priceField.ok) return { error: priceField.error, status: 400 }
    const sf = db.storeFlowers.find((s) => s.id === sfId && s.user_id === shopUid)
    if (!sf) return { error: 'Цветок магазина не найден.', status: 404 }
    const parsed = priceField.value
    const taxonId = sf.taxon_id ?? 0
    let row = db.prices.find((p) => p.user_id === shopUid && p.store_flower_id === sfId)
    if (parsed === null || parsed <= 0) {
      if (row) row.unit_price = '0.00'
      else {
        db.prices.push({
          id: allocId(),
          user_id: shopUid,
          store_flower_id: sfId,
          taxon_id: taxonId,
          unit_price: '0.00',
        })
      }
      return { payload: { store_flower_id: sfId, unit_price: null } }
    }
    if (parsed < 0) return { error: 'Цена не может быть отрицательной.', status: 400 }
    if (!row) {
      row = {
        id: allocId(),
        user_id: shopUid,
        store_flower_id: sfId,
        taxon_id: taxonId,
        unit_price: moneyStr(parsed),
      }
      db.prices.push(row)
    } else {
      row.unit_price = moneyStr(parsed)
    }
    const saved = row
    return { payload: { store_flower_id: sfId, unit_price: moneyStr(saved.unit_price) } }
  }

  return {
    error: 'Укажите store_flower_id, retail_product_id или bouquet_id.',
    status: 400,
  }
}
