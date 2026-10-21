import { addCalendarDaysLocal } from './calendarDay'
import { photoUrlFromPath } from './demoAssetUrl'
import type { DemoDb } from './types'
import { moneyStr } from './money'

const KIND_FLOWER = 'flower'
const KIND_RETAIL = 'retail'
const KIND_BOUQUET = 'bouquet'

export type InventorySnapshotLine = {
  line_key: string
  stock_kind: string
  store_flower_id: number | null
  flower_batch_id: number | null
  retail_product_id: number | null
  bouquet_id: number | null
  display_name: string
  rank_label: string
  photo_url: string | null
  system_quantity: number
  system_realization_quantity: number
}

function displayForStoreFlower(db: DemoDb, sfId: number): { name: string; rank: string } {
  const sf = db.storeFlowers.find((s) => s.id === sfId)
  if (!sf) return { name: '—', rank: '' }
  if (sf.name_override.trim()) return { name: sf.name_override.trim(), rank: '' }
  const t = db.taxons.find((x) => x.id === sf.taxon_id)
  if (!t) return { name: '—', rank: '' }
  return { name: (t.name_ru || t.name).trim() || t.name, rank: t.rank === 'cultivar' ? 'Сорт' : '' }
}

function storeFlowerPhotoUrl(db: DemoDb, sfId: number): string | null {
  const sf = db.storeFlowers.find((s) => s.id === sfId)
  return photoUrlFromPath(sf?.photo_path ?? null)
}

export function buildInventorySnapshot(db: DemoDb, shopUid: number): InventorySnapshotLine[] {
  const out: InventorySnapshotLine[] = []
  const merged = new Map<string, InventorySnapshotLine>()

  for (const b of db.batches.filter((x) => x.user_id === shopUid && x.quantity > 0)) {
    const qty = b.quantity
    if (qty < 1) continue
    const brq = b.realization_quantity || 0
    if (b.store_flower_id != null) {
      const key = `sf:${b.store_flower_id}`
      const meta = displayForStoreFlower(db, b.store_flower_id)
      const existing = merged.get(key)
      if (!existing) {
        merged.set(key, {
          line_key: key,
          stock_kind: KIND_FLOWER,
          store_flower_id: b.store_flower_id,
          flower_batch_id: null,
          retail_product_id: null,
          bouquet_id: null,
          display_name: meta.name,
          rank_label: meta.rank,
          photo_url: storeFlowerPhotoUrl(db, b.store_flower_id),
          system_quantity: qty,
          system_realization_quantity: brq,
        })
      } else {
        existing.system_quantity += qty
        existing.system_realization_quantity += brq
      }
    } else {
      const t = db.taxons.find((x) => x.id === b.taxon_id)
      const name = t ? (t.name_ru || t.name).trim() || t.name : '—'
      merged.set(`batch:${b.id}`, {
        line_key: `batch:${b.id}`,
        stock_kind: KIND_FLOWER,
        store_flower_id: null,
        flower_batch_id: b.id,
        retail_product_id: null,
        bouquet_id: null,
        display_name: name,
        rank_label: '',
        photo_url: null,
        system_quantity: qty,
        system_realization_quantity: brq,
      })
    }
  }

  out.push(...merged.values())
  out.sort((a, b) => a.display_name.localeCompare(b.display_name, 'ru'))

  for (const p of db.retailProducts.filter((x) => x.user_id === shopUid && x.quantity > 0)) {
    out.push({
      line_key: `retail:${p.id}`,
      stock_kind: KIND_RETAIL,
      store_flower_id: null,
      flower_batch_id: null,
      retail_product_id: p.id,
      bouquet_id: null,
      display_name: p.name,
      rank_label: 'Товар',
      photo_url: photoUrlFromPath(p.photo_path),
      system_quantity: p.quantity,
      system_realization_quantity: p.realization_quantity || 0,
    })
  }

  for (const b of db.bouquets.filter((x) => x.user_id === shopUid && x.quantity > 0)) {
    out.push({
      line_key: `bouquet:${b.id}`,
      stock_kind: KIND_BOUQUET,
      store_flower_id: null,
      flower_batch_id: null,
      retail_product_id: null,
      bouquet_id: b.id,
      display_name: b.name,
      rank_label: 'Букет',
      photo_url: photoUrlFromPath(b.photo_path),
      system_quantity: b.quantity,
      system_realization_quantity: 0,
    })
  }

  return out
}

function avgUnitCost(db: DemoDb, shopUid: number, storeFlowerId: number): number {
  const batches = db.batches.filter(
    (b) => b.user_id === shopUid && b.store_flower_id === storeFlowerId && b.quantity > 0,
  )
  let q = 0
  let t = 0
  for (const b of batches) {
    q += b.quantity
    t += parseFloat(b.unit_cost) * b.quantity
  }
  if (q < 1) return 0
  return Math.round((t / q) * 100) / 100
}

export function discardStoreFlowerFifo(
  db: DemoDb,
  shopUid: number,
  storeFlowerId: number,
  qty: number,
  realizationQty: number,
  scope?: 'cleared' | 'intake_pending' | null,
): number {
  let remaining = qty
  let rqLeft = realizationQty
  let totalCost = 0
  const batches = db.batches
    .filter((b) => {
      if (b.user_id !== shopUid || b.store_flower_id !== storeFlowerId || b.quantity <= 0) return false
      if (scope === 'intake_pending') return b.intake_pending
      if (scope === 'cleared') return !b.intake_pending
      return true
    })
    .sort((a, b) => a.received_at.localeCompare(b.received_at) || a.id - b.id)

  while (rqLeft > 0 && remaining > 0) {
    const b = batches.find((x) => x.quantity > 0 && (x.realization_quantity || 0) > 0)
    if (!b) break
    const rqAvail = b.realization_quantity || 0
    const take = Math.min(b.quantity, remaining, rqLeft, rqAvail)
    if (take <= 0) break
    totalCost += (parseFloat(b.unit_cost) || 0) * take
    b.quantity -= take
    b.realization_quantity = Math.max(0, rqAvail - take)
    remaining -= take
    rqLeft -= take
  }

  for (const b of batches) {
    if (remaining <= 0) break
    if (b.quantity <= 0) continue
    const take = Math.min(b.quantity, remaining)
    totalCost += (parseFloat(b.unit_cost) || 0) * take
    b.quantity -= take
    remaining -= take
  }
  return Math.round(totalCost * 100) / 100
}

function parseRealizationQty(body: Record<string, unknown>): number {
  if (!('realization_quantity' in body)) return 0
  const v = Number.parseInt(String(body.realization_quantity), 10)
  return Number.isFinite(v) && v >= 0 ? v : 0
}

function parseLinePayload(
  row: unknown,
  snapshotByKey: Map<string, InventorySnapshotLine>,
): { item: Record<string, unknown>; error?: string } {
  if (!row || typeof row !== 'object') return { item: {}, error: 'Каждая строка должна быть объектом.' }
  const o = row as Record<string, unknown>
  const line_key = o.line_key
  if (typeof line_key !== 'string' || !snapshotByKey.has(line_key)) {
    return { item: {}, error: 'Неизвестная позиция в строке инвентаризации.' }
  }
  const snap = snapshotByKey.get(line_key)!
  let counted: number
  let waste: number
  try {
    counted = Number.parseInt(String(o.counted_quantity ?? snap.system_quantity), 10)
    waste = Number.parseInt(String(o.waste_quantity ?? 0), 10)
  } catch {
    return { item: {}, error: 'Укажите целые числа ≥ 0 в «Факт» и «В утиль».' }
  }
  if (counted < 0 || waste < 0) return { item: {}, error: 'Количества не могут быть отрицательными.' }
  if (waste > counted) {
    return { item: {}, error: `«В утиль» не может быть больше факта для «${snap.display_name}».` }
  }
  const stock_quantity = counted - waste
  const shortfall = Math.max(0, snap.system_quantity - stock_quantity)
  let realization_discard = 0
  if (shortfall > 0 && snap.system_realization_quantity > 0) {
    const rq = parseRealizationQty(o)
    if (rq > shortfall) return { item: {}, error: 'С реализации не больше, чем списываемое количество.' }
    if (rq > snap.system_realization_quantity) {
      return {
        item: {},
        error: `На реализации доступно не больше ${snap.system_realization_quantity} шт.`,
      }
    }
    realization_discard = rq
  }
  return {
    item: {
      ...snap,
      counted_quantity: counted,
      waste_quantity: waste,
      stock_quantity,
      realization_discard,
    },
  }
}

function applyFlowerStoreFlower(
  db: DemoDb,
  shopUid: number,
  storeFlowerId: number,
  system: number,
  stockQty: number,
  nowIso: string,
  realizationDiscard: number,
  nextId: () => number,
) {
  const delta = stockQty - system
  if (delta === 0) return
  if (delta < 0) {
    discardStoreFlowerFifo(db, shopUid, storeFlowerId, -delta, realizationDiscard)
    return
  }
  const sf = db.storeFlowers.find((s) => s.id === storeFlowerId && s.user_id === shopUid)
  if (!sf) throw new Error('Цветок не найден.')
  const unit_cost = moneyStr(avgUnitCost(db, shopUid, storeFlowerId))
  const id = nextId()
  db.batches.push({
    id,
    user_id: shopUid,
    store_flower_id: storeFlowerId,
    taxon_id: sf.taxon_id ?? 0,
    quantity: delta,
    received_at: nowIso,
    last_trim_at: null,
    last_water_change_at: null,
    intake_pending: false,
    unit_cost,
    realization_quantity: 0,
    sale_terms_fixed_price: null,
  })
}

function applyFlowerBatch(
  db: DemoDb,
  shopUid: number,
  batchId: number,
  system: number,
  stockQty: number,
  realizationDiscard: number,
) {
  const delta = stockQty - system
  if (delta === 0) return
  const batch = db.batches.find((b) => b.id === batchId && b.user_id === shopUid)
  if (!batch) throw new Error('Партия не найдена.')
  if (delta < 0) {
    const take = -delta
    batch.quantity = Math.max(0, batch.quantity - take)
    if (realizationDiscard > 0) {
      batch.realization_quantity = Math.max(0, (batch.realization_quantity || 0) - realizationDiscard)
    }
  } else {
    batch.quantity += delta
  }
}

function applyRetail(db: DemoDb, shopUid: number, productId: number, stockQty: number, rqDiscard: number) {
  const product = db.retailProducts.find((p) => p.id === productId && p.user_id === shopUid)
  if (!product) throw new Error('Товар не найден.')
  const shortfall = Math.max(0, product.quantity - stockQty)
  if (shortfall > 0 && rqDiscard > 0) {
    product.realization_quantity = Math.max(0, (product.realization_quantity || 0) - rqDiscard)
  }
  product.quantity = stockQty
}

function applyBouquet(db: DemoDb, shopUid: number, bouquetId: number, stockQty: number) {
  const b = db.bouquets.find((x) => x.id === bouquetId && x.user_id === shopUid)
  if (!b) throw new Error('Букет не найден.')
  b.quantity = stockQty
}

export function inventoryMeta(db: DemoDb, owner: DemoDb['users'][number]) {
  const interval = Math.max(1, Math.min(owner.inventory_interval_days || 14, 90))
  let due = true
  if (owner.last_inventory_completed_at) {
    const last = owner.last_inventory_completed_at.slice(0, 10)
    due = db.demoDay >= addCalendarDaysLocal(last, interval)
  }
  return {
    inventory_periodic_due: due,
    inventory_interval_days: interval,
    last_inventory_completed_at: owner.last_inventory_completed_at,
  }
}

export function completeInventory(
  db: DemoDb,
  shopUid: number,
  linesPayload: unknown,
  nextId: () => number,
): { error?: string; detail?: ReturnType<typeof serializeInventoryDetail> } {
  const snapshot = buildInventorySnapshot(db, shopUid)
  if (!snapshot.length) {
    return { error: 'На складе нет остатков для инвентаризации.' }
  }
  const snapshotByKey = new Map(snapshot.map((ln) => [ln.line_key, ln]))
  if (!Array.isArray(linesPayload) || !linesPayload.length) {
    return { error: 'Передайте непустой массив lines.' }
  }
  const parsed: Record<string, unknown>[] = []
  const seen = new Set<string>()
  for (const row of linesPayload) {
    const { item, error } = parseLinePayload(row, snapshotByKey)
    if (error) return { error }
    const key = String(item.line_key)
    if (seen.has(key)) return { error: 'Дублирующаяся позиция в строках.' }
    seen.add(key)
    parsed.push(item)
  }
  if (seen.size !== snapshotByKey.size) {
    return { error: 'Укажите факт по всем позициям склада.' }
  }

  const nowIso = new Date().toISOString()
  const invId = nextId()
  const lines = parsed.map((item) => ({
    id: nextId(),
    inventory_id: invId,
    stock_kind: String(item.stock_kind),
    store_flower_id: (item.store_flower_id as number | null) ?? null,
    flower_batch_id: (item.flower_batch_id as number | null) ?? null,
    retail_product_id: (item.retail_product_id as number | null) ?? null,
    bouquet_id: (item.bouquet_id as number | null) ?? null,
    display_name: String(item.display_name).slice(0, 255),
    system_quantity: Number(item.system_quantity),
    counted_quantity: Number(item.counted_quantity),
    waste_quantity: Number(item.waste_quantity),
  }))

  try {
    for (const item of parsed) {
      const system = Number(item.system_quantity)
      const stockQty = Number(item.stock_quantity)
      const kind = String(item.stock_kind)
      const rqDisc = Number(item.realization_discard || 0)
      if (kind === KIND_FLOWER) {
        const sfId = item.store_flower_id as number | null
        const batchId = item.flower_batch_id as number | null
        if (sfId != null) {
          applyFlowerStoreFlower(db, shopUid, sfId, system, stockQty, nowIso, rqDisc, nextId)
        } else if (batchId != null) {
          applyFlowerBatch(db, shopUid, batchId, system, stockQty, rqDisc)
        }
      } else if (kind === KIND_RETAIL) {
        const rpId = item.retail_product_id as number | null
        if (rpId != null) applyRetail(db, shopUid, rpId, stockQty, rqDisc)
      } else if (kind === KIND_BOUQUET) {
        const bId = item.bouquet_id as number | null
        if (bId != null) applyBouquet(db, shopUid, bId, stockQty)
      }
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Ошибка корректировки остатков.' }
  }

  db.inventories.push({
    id: invId,
    user_id: shopUid,
    completed_at: nowIso,
    lines,
  })
  const owner = db.users.find((u) => u.id === shopUid)
  if (owner) owner.last_inventory_completed_at = nowIso

  const inv = db.inventories.find((x) => x.id === invId)!
  return { detail: serializeInventoryDetail(inv) }
}

export function serializeInventorySummary(inv: DemoDb['inventories'][number]) {
  const lines = inv.lines
  let adjusted = 0
  for (const ln of lines) {
    const stock = ln.counted_quantity - ln.waste_quantity
    if (stock !== ln.system_quantity || ln.waste_quantity > 0) adjusted += 1
  }
  return {
    id: inv.id,
    completed_at: inv.completed_at,
    line_count: lines.length,
    adjusted_count: adjusted,
  }
}

export function serializeInventoryDetail(inv: DemoDb['inventories'][number]) {
  const lines_out = inv.lines.map((ln) => ({
    id: ln.id,
    stock_kind: ln.stock_kind,
    display_name: ln.display_name,
    system_quantity: ln.system_quantity,
    counted_quantity: ln.counted_quantity,
    waste_quantity: ln.waste_quantity,
    stock_quantity: ln.counted_quantity - ln.waste_quantity,
  }))
  return {
    ...serializeInventorySummary(inv),
    lines: lines_out,
  }
}

export function listInventoryHistory(db: DemoDb, shopUid: number, limit = 50) {
  return db.inventories
    .filter((i) => i.user_id === shopUid)
    .sort((a, b) => b.completed_at.localeCompare(a.completed_at) || b.id - a.id)
    .slice(0, limit)
    .map(serializeInventorySummary)
}
