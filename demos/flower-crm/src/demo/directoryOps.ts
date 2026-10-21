import { photoUrlFromPath } from './demoAssetUrl'
import { moneyStr, parseMoney } from './money'
import { serializeStoreFlowerRow } from './storeFlowerApi'
import type { DemoDb, DemoDeliveryService, DemoSupplier, DemoSupplierOffer } from './types'

const RANK_LABEL_RU: Record<string, string> = {
  family: 'Семейство',
  genus: 'Род',
  species: 'Вид',
  cultivar: 'Сорт',
}

function optionalText(raw: unknown, maxLen?: number): string {
  if (raw == null) return ''
  let s = String(raw).trim()
  if (maxLen != null) s = s.slice(0, maxLen)
  return s
}

function serializeOffer(db: DemoDb, o: DemoSupplierOffer) {
  const sf = db.storeFlowers.find((s) => s.id === o.store_flower_id)
  const t = db.taxons.find((x) => x.id === (sf?.taxon_id ?? o.taxon_id))
  const display = t ? (t.name_ru || t.name) : sf?.name_override ?? '—'
  return {
    store_flower_id: o.store_flower_id,
    taxon_id: o.taxon_id,
    display_name: display,
    latin_name: t?.name ?? null,
    rank: t?.rank ?? '',
    rank_label: t ? (RANK_LABEL_RU[t.rank] ?? t.rank) : '',
    unit_purchase_price: o.unit_purchase_price,
    photo_url: photoUrlFromPath(sf?.photo_path ?? null),
  }
}

export function serializeSupplier(db: DemoDb, s: DemoSupplier) {
  return {
    id: s.id,
    name: s.name,
    legal_name: s.legal_name || null,
    legal_info: s.legal_info || null,
    address: s.address || null,
    contacts: s.contacts || null,
    notes: s.notes || null,
    created_at: null as string | null,
    offers: db.supplierOffers.filter((o) => o.supplier_id === s.id).map((o) => serializeOffer(db, o)),
  }
}

export function suppliersPayload(db: DemoDb, shopUid: number) {
  return {
    suppliers: db.suppliers.filter((s) => s.user_id === shopUid).map((s) => serializeSupplier(db, s)),
  }
}

function nameTaken(db: DemoDb, shopUid: number, name: string, excludeId?: number) {
  return db.suppliers.some(
    (s) => s.user_id === shopUid && s.name === name && (excludeId == null || s.id !== excludeId),
  )
}

export function createSupplier(
  db: DemoDb,
  shopUid: number,
  body: Record<string, unknown>,
  nextId: () => number,
): { error?: string; supplier?: ReturnType<typeof serializeSupplier> } {
  const name = optionalText(body.name, 255)
  if (!name) return { error: 'Укажите название поставщика.' }
  if (nameTaken(db, shopUid, name)) return { error: 'Поставщик с таким названием уже есть.' }
  const s: DemoSupplier = {
    id: nextId(),
    user_id: shopUid,
    name,
    legal_name: optionalText(body.legal_name, 512),
    legal_info: optionalText(body.legal_info),
    address: optionalText(body.address),
    contacts: optionalText(body.contacts),
    notes: optionalText(body.notes),
  }
  db.suppliers.push(s)
  return { supplier: serializeSupplier(db, s) }
}

export function patchSupplier(
  db: DemoDb,
  shopUid: number,
  supplierId: number,
  body: Record<string, unknown>,
): { error?: string; supplier?: ReturnType<typeof serializeSupplier> } {
  const s = db.suppliers.find((x) => x.id === supplierId && x.user_id === shopUid)
  if (!s) return { error: 'Поставщик не найден.' }
  if ('name' in body) {
    const name = optionalText(body.name, 255)
    if (!name) return { error: 'Укажите название поставщика.' }
    if (nameTaken(db, shopUid, name, s.id)) return { error: 'Поставщик с таким названием уже есть.' }
    s.name = name
  }
  if ('legal_name' in body) s.legal_name = optionalText(body.legal_name, 512)
  if ('legal_info' in body) s.legal_info = optionalText(body.legal_info)
  if ('address' in body) s.address = optionalText(body.address)
  if ('contacts' in body) s.contacts = optionalText(body.contacts)
  if ('notes' in body) s.notes = optionalText(body.notes)
  return { supplier: serializeSupplier(db, s) }
}

export function deleteSupplier(db: DemoDb, shopUid: number, supplierId: number): { error?: string; status?: number } {
  const s = db.suppliers.find((x) => x.id === supplierId && x.user_id === shopUid)
  if (!s) return { error: 'Поставщик не найден.', status: 404 }
  const pending = db.supplierDeliveries.some(
    (d) => d.user_id === shopUid && d.supplier_id === supplierId && d.status === 'pending',
  )
  if (pending) {
    return {
      error: 'Нельзя удалить: есть запланированные поставки. Примите или отмените их.',
      status: 409,
    }
  }
  db.suppliers = db.suppliers.filter((x) => x.id !== supplierId)
  db.supplierOffers = db.supplierOffers.filter((o) => o.supplier_id !== supplierId)
  return {}
}

function resolveOfferFlower(
  db: DemoDb,
  shopUid: number,
  body: Record<string, unknown>,
): { sfId?: number; taxonId?: number; error?: string; status?: number } {
  if (body.store_flower_id != null && body.store_flower_id !== '') {
    const sfId = Number.parseInt(String(body.store_flower_id), 10)
    const sf = db.storeFlowers.find((s) => s.id === sfId && s.user_id === shopUid)
    if (!sf) return { error: 'Цветок магазина не найден.', status: 404 }
    return { sfId: sf.id, taxonId: sf.taxon_id ?? 0 }
  }
  if (body.taxon_id != null && body.taxon_id !== '') {
    const tid = Number.parseInt(String(body.taxon_id), 10)
    const sf = db.storeFlowers.find((s) => s.user_id === shopUid && s.taxon_id === tid)
    if (!sf) return { error: 'Цветок магазина не найден.', status: 404 }
    return { sfId: sf.id, taxonId: tid }
  }
  return { error: 'Укажите store_flower_id или taxon_id.' }
}

export function createSupplierOffer(
  db: DemoDb,
  shopUid: number,
  supplierId: number,
  body: Record<string, unknown>,
  nextId: () => number,
): { error?: string; status?: number } {
  const supplier = db.suppliers.find((s) => s.id === supplierId && s.user_id === shopUid)
  if (!supplier) return { error: 'Поставщик не найден.', status: 404 }
  const resolved = resolveOfferFlower(db, shopUid, body)
  if (resolved.error) return { error: resolved.error, status: resolved.status }
  const price = parseMoney(body.unit_purchase_price)
  if (price == null || price < 0) return { error: 'Укажите закупочную цену (0 или больше).' }
  if (
    db.supplierOffers.some((o) => o.supplier_id === supplierId && o.store_flower_id === resolved.sfId)
  ) {
    return { error: 'Этот цветок уже есть в прайсе поставщика.' }
  }
  db.supplierOffers.push({
    id: nextId(),
    supplier_id: supplierId,
    store_flower_id: resolved.sfId!,
    taxon_id: resolved.taxonId!,
    unit_purchase_price: moneyStr(price),
  })
  return {}
}

export function patchSupplierOffer(
  db: DemoDb,
  shopUid: number,
  supplierId: number,
  storeFlowerId: number,
  body: Record<string, unknown>,
): { error?: string; status?: number } {
  const supplier = db.suppliers.find((s) => s.id === supplierId && s.user_id === shopUid)
  if (!supplier) return { error: 'Поставщик не найден.', status: 404 }
  const offer = db.supplierOffers.find(
    (o) => o.supplier_id === supplierId && o.store_flower_id === storeFlowerId,
  )
  if (!offer) return { error: 'Позиция не найдена.', status: 404 }
  if ('unit_purchase_price' in body) {
    const price = parseMoney(body.unit_purchase_price)
    if (price == null || price < 0) return { error: 'Укажите закупочную цену (0 или больше).' }
    offer.unit_purchase_price = moneyStr(price)
  }
  return {}
}

export function deleteSupplierOffer(
  db: DemoDb,
  shopUid: number,
  supplierId: number,
  storeFlowerId: number,
): { error?: string; status?: number } {
  const supplier = db.suppliers.find((s) => s.id === supplierId && s.user_id === shopUid)
  if (!supplier) return { error: 'Поставщик не найден.', status: 404 }
  const before = db.supplierOffers.length
  db.supplierOffers = db.supplierOffers.filter(
    (o) => !(o.supplier_id === supplierId && o.store_flower_id === storeFlowerId),
  )
  if (db.supplierOffers.length === before) return { error: 'Позиция не найдена.', status: 404 }
  return {}
}

export function serializeDeliveryService(s: DemoDeliveryService) {
  return {
    id: s.id,
    name: s.name,
    description: s.notes || null,
    contacts: null as string | null,
    city_delivery_price: s.price,
    created_at: null as string | null,
  }
}

export function deliveryServicesPayload(db: DemoDb, shopUid: number) {
  return {
    delivery_services: db.deliveryServices
      .filter((s) => s.user_id === shopUid)
      .map((s) => serializeDeliveryService(s)),
  }
}

function serviceNameTaken(db: DemoDb, shopUid: number, name: string, excludeId?: number) {
  return db.deliveryServices.some(
    (s) => s.user_id === shopUid && s.name === name && (excludeId == null || s.id !== excludeId),
  )
}

export function createDeliveryService(
  db: DemoDb,
  shopUid: number,
  body: Record<string, unknown>,
  nextId: () => number,
): { error?: string; service?: ReturnType<typeof serializeDeliveryService> } {
  const name = optionalText(body.name, 255)
  if (!name) return { error: 'Укажите название сервиса.' }
  const price = parseMoney(body.city_delivery_price)
  if (price == null || price < 0) return { error: 'Укажите цену доставки по городу.' }
  if (serviceNameTaken(db, shopUid, name)) return { error: 'Сервис с таким названием уже есть.' }
  const s: DemoDeliveryService = {
    id: nextId(),
    user_id: shopUid,
    name,
    price: moneyStr(price),
    notes: optionalText(body.description),
  }
  db.deliveryServices.push(s)
  return { service: serializeDeliveryService(s) }
}

export function patchDeliveryService(
  db: DemoDb,
  shopUid: number,
  serviceId: number,
  body: Record<string, unknown>,
): { error?: string; service?: ReturnType<typeof serializeDeliveryService> } {
  const s = db.deliveryServices.find((x) => x.id === serviceId && x.user_id === shopUid)
  if (!s) return { error: 'Сервис не найден.' }
  if ('name' in body) {
    const name = optionalText(body.name, 255)
    if (!name) return { error: 'Укажите название сервиса.' }
    if (serviceNameTaken(db, shopUid, name, s.id)) return { error: 'Сервис с таким названием уже есть.' }
    s.name = name
  }
  if ('description' in body) s.notes = optionalText(body.description)
  if ('city_delivery_price' in body) {
    const price = parseMoney(body.city_delivery_price)
    if (price == null || price < 0) return { error: 'Цена доставки по городу не может быть отрицательной.' }
    s.price = moneyStr(price)
  }
  return { service: serializeDeliveryService(s) }
}

export function deleteDeliveryService(
  db: DemoDb,
  shopUid: number,
  serviceId: number,
): { error?: string; status?: number } {
  const s = db.deliveryServices.find((x) => x.id === serviceId && x.user_id === shopUid)
  if (!s) return { error: 'Сервис не найден.', status: 404 }
  db.deliveryServices = db.deliveryServices.filter((x) => x.id !== serviceId)
  return {}
}

export function flowersListPayload(db: DemoDb, shopUid: number) {
  return {
    flowers: db.storeFlowers
      .filter((sf) => sf.user_id === shopUid)
      .map((sf) => serializeStoreFlowerRow(db, shopUid, sf)),
  }
}
