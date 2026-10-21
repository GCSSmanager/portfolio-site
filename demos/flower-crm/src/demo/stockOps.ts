import { resolveDemoPhotoUrl } from './demoArtCatalog'
import { discardStoreFlowerFifo } from './inventory'
import { moneyStr, parseMoney } from './money'
import { recordStockDiscard } from './stockDiscard'
import { usesMergedWarehouseCards } from './warehouseMode'
import type { DemoBatch, DemoBouquet, DemoCustomerOrder, DemoDb, DemoFlowerSale } from './types'

function bumpId(db: DemoDb): number {
  db.nextNumericId += 1
  return db.nextNumericId
}

function recordRetailIntake(
  db: DemoDb,
  shopUid: number,
  productId: number,
  productName: string,
  qty: number,
  unitCost: string,
  purchasedAt: string,
) {
  if (qty <= 0) return
  if (!db.retailIntakes) db.retailIntakes = []
  const uc = parseMoney(unitCost) ?? 0
  const amount = Math.round(uc * qty * 100) / 100
  db.retailIntakes.push({
    id: bumpId(db),
    user_id: shopUid,
    retail_product_id: productId,
    product_name: productName.slice(0, 200),
    quantity: qty,
    unit_cost: moneyStr(uc),
    amount_rub: moneyStr(amount),
    purchased_at: purchasedAt,
  })
}

function nowIso(): string {
  return new Date().toISOString()
}

function batchesForFlower(
  db: DemoDb,
  shopUid: number,
  storeFlowerId: number,
  scope?: 'cleared' | 'intake_pending' | null,
): DemoBatch[] {
  return db.batches
    .filter((b) => {
      if (b.user_id !== shopUid || b.store_flower_id !== storeFlowerId || b.quantity <= 0) return false
      if (scope === 'intake_pending') return b.intake_pending
      if (scope === 'cleared') return !b.intake_pending
      return true
    })
    .sort((a, b) => a.received_at.localeCompare(b.received_at) || a.id - b.id)
}

function flowerStockQty(
  db: DemoDb,
  shopUid: number,
  storeFlowerId: number,
  scope?: 'cleared' | 'intake_pending' | null,
): number {
  return batchesForFlower(db, shopUid, storeFlowerId, scope).reduce((s, b) => s + b.quantity, 0)
}

function flowerRealizationQty(
  db: DemoDb,
  shopUid: number,
  storeFlowerId: number,
  scope?: 'cleared' | 'intake_pending' | null,
): number {
  return batchesForFlower(db, shopUid, storeFlowerId, scope).reduce(
    (s, b) => s + (b.realization_quantity || 0),
    0,
  )
}

function parseDiscardRq(body: Record<string, unknown>, discardQty: number, maxRq: number): number {
  if (!('realization_quantity' in body)) return 0
  const rq = Number.parseInt(String(body.realization_quantity), 10)
  if (!Number.isFinite(rq) || rq < 0) return -1
  if (rq > discardQty || rq > maxRq) return -1
  return rq
}

function saleFinancials(
  unitCost: number,
  qty: number,
  unitPrice: number,
  rq: number,
  fixedPrice: string | null,
) {
  const total = Math.round(unitPrice * qty * 100) / 100
  const purchaseCost = Math.round(unitCost * (qty - rq) * 100) / 100
  let supplier = 0
  if (rq > 0 && fixedPrice) supplier = Math.round(parseFloat(fixedPrice) * rq * 100) / 100
  const profit = Math.round((total - purchaseCost - supplier) * 100) / 100
  return {
    total_amount: moneyStr(total),
    shop_profit: moneyStr(profit),
    supplier_payout: moneyStr(supplier),
    unit_cost: moneyStr(unitCost),
  }
}

function avgBatchCost(db: DemoDb, shopUid: number, storeFlowerId: number): number {
  const batches = db.batches.filter(
    (b) => b.user_id === shopUid && b.store_flower_id === storeFlowerId && b.quantity > 0,
  )
  let q = 0
  let t = 0
  for (const b of batches) {
    q += b.quantity
    t += parseMoney(b.unit_cost)! * b.quantity
  }
  return q > 0 ? Math.round((t / q) * 100) / 100 : 0
}

function deductBatch(
  batch: DemoBatch,
  qty: number,
  rq: number,
): { error?: string } {
  if (qty > batch.quantity) return { error: 'Недостаточно на складе.' }
  batch.quantity -= qty
  if (rq > 0) {
    const take = Math.min(rq, batch.realization_quantity || 0, qty)
    batch.realization_quantity = Math.max(0, (batch.realization_quantity || 0) - take)
  }
  return {}
}

function fifoDeductFlower(
  db: DemoDb,
  shopUid: number,
  storeFlowerId: number,
  qty: number,
  rq: number,
  scope?: 'cleared' | 'intake_pending' | null,
): { error?: string; unitCost?: number; fixedPrice?: string | null } {
  const stock = flowerStockQty(db, shopUid, storeFlowerId, scope)
  if (qty > stock) return { error: 'Недостаточно на складе.' }
  const maxRq = flowerRealizationQty(db, shopUid, storeFlowerId, scope)
  if (rq > maxRq) return { error: 'С реализации больше, чем доступно.' }

  let remaining = qty
  let rqLeft = rq
  let costSum = 0
  let costQty = 0
  let fixed: string | null = null
  for (const b of batchesForFlower(db, shopUid, storeFlowerId, scope)) {
    if (remaining <= 0) break
    const take = Math.min(b.quantity, remaining)
    costSum += parseMoney(b.unit_cost)! * take
    costQty += take
    if (!fixed && b.sale_terms_fixed_price) fixed = b.sale_terms_fixed_price
    remaining -= take
    b.quantity -= take
    if (rqLeft > 0) {
      const rqTake = Math.min(rqLeft, take, b.realization_quantity || 0)
      b.realization_quantity = Math.max(0, (b.realization_quantity || 0) - rqTake)
      rqLeft -= rqTake
    }
  }
  const unitCost = costQty > 0 ? Math.round((costSum / costQty) * 100) / 100 : avgBatchCost(db, shopUid, storeFlowerId)
  return { unitCost, fixedPrice: fixed }
}

type FifoSlice = {
  batch_id: number
  quantity: number
  store_flower_id: number
  taxon_id: number | null
}

function fifoDeductFlowerWithSlices(
  db: DemoDb,
  shopUid: number,
  storeFlowerId: number,
  qty: number,
  rq: number,
  scope?: 'cleared' | 'intake_pending' | null,
): { error?: string; slices?: FifoSlice[] } {
  const stock = flowerStockQty(db, shopUid, storeFlowerId, scope)
  if (qty > stock) return { error: 'Недостаточно на складе.' }
  const maxRq = flowerRealizationQty(db, shopUid, storeFlowerId, scope)
  if (rq > maxRq) return { error: 'С реализации больше, чем доступно.' }

  const slices: FifoSlice[] = []
  let remaining = qty
  let rqLeft = rq
  for (const b of batchesForFlower(db, shopUid, storeFlowerId, scope)) {
    if (remaining <= 0) break
    const take = Math.min(b.quantity, remaining)
    slices.push({
      batch_id: b.id,
      quantity: take,
      store_flower_id: b.store_flower_id,
      taxon_id: b.taxon_id,
    })
    remaining -= take
    b.quantity -= take
    if (rqLeft > 0) {
      const rqTake = Math.min(rqLeft, take, b.realization_quantity || 0)
      b.realization_quantity = Math.max(0, (b.realization_quantity || 0) - rqTake)
      rqLeft -= rqTake
    }
  }
  return { slices }
}

function touchBasicCare(db: DemoDb, shopUid: number, storeFlowerId: number, patch: Partial<DemoDb['basicCare'][number]>) {
  const care = db.basicCare.find((c) => c.user_id === shopUid && c.store_flower_id === storeFlowerId)
  if (care) Object.assign(care, patch)
}

function clearIntakeIfBothLogged(batch: DemoDb['batches'][number]): void {
  if (batch.last_trim_at && batch.last_water_change_at) batch.intake_pending = false
}

function refreshBasicCareTimestampsFromBatches(db: DemoDb, shopUid: number, storeFlowerId: number): void {
  const care = db.basicCare.find((c) => c.user_id === shopUid && c.store_flower_id === storeFlowerId)
  if (!care) return
  const batches = db.batches.filter(
    (b) => b.user_id === shopUid && b.store_flower_id === storeFlowerId && b.quantity > 0,
  )
  const trims = batches.map((b) => b.last_trim_at).filter(Boolean) as string[]
  const waters = batches.map((b) => b.last_water_change_at).filter(Boolean) as string[]
  if (trims.length) care.last_trim_at = trims.sort().at(-1)!
  if (waters.length) care.last_water_change_at = waters.sort().at(-1)!
}

function allFlowerBatches(db: DemoDb, shopUid: number, storeFlowerId: number): DemoDb['batches'] {
  return db.batches.filter(
    (b) => b.user_id === shopUid && b.store_flower_id === storeFlowerId && b.quantity > 0,
  )
}

function effectiveBasicBatchScope(
  all: DemoDb['batches'],
  scope: 'cleared' | 'intake_pending' | null,
  action: string,
): 'cleared' | 'intake_pending' | null {
  if (scope) return scope
  const mixed = all.some((b) => b.intake_pending) && all.some((b) => !b.intake_pending)
  if (!mixed) return null
  if (action === 'intake_done') return 'intake_pending'
  if (action === 'trim_now' || action === 'water_now') return 'cleared'
  return null
}

function inheritCareFromCleared(cleared: DemoDb['batches']): {
  trim: string | null
  water: string | null
} {
  const trims = cleared.map((b) => b.last_trim_at).filter(Boolean) as string[]
  const waters = cleared.map((b) => b.last_water_change_at).filter(Boolean) as string[]
  return {
    trim: trims.length ? trims.sort().at(-1)! : null,
    water: waters.length ? waters.sort().at(-1)! : null,
  }
}

function applyUnifiedBasicCare(now: string, care: DemoDb['basicCare'][number], batches: DemoDb['batches']): void {
  care.last_trim_at = now
  care.last_water_change_at = now
  for (const b of batches) {
    b.last_trim_at = now
    b.last_water_change_at = now
    clearIntakeIfBothLogged(b)
  }
}

function appendSale(
  db: DemoDb,
  shopUid: number,
  row: Omit<DemoFlowerSale, 'id' | 'user_id' | 'sold_at'> & { sold_at?: string },
  nextId: () => number,
): DemoFlowerSale {
  const sale: DemoFlowerSale = {
    id: nextId(),
    user_id: shopUid,
    sold_at: row.sold_at ?? nowIso(),
    batch_id: row.batch_id ?? null,
    taxon_id: row.taxon_id,
    store_flower_id: row.store_flower_id,
    display_name: row.display_name,
    quantity: row.quantity,
    unit_price: row.unit_price,
    unit_cost: row.unit_cost,
    total_amount: row.total_amount,
    realization_quantity: row.realization_quantity,
    supplier_payout: row.supplier_payout,
    shop_profit: row.shop_profit,
    payment_type: row.payment_type,
    line_kind: row.line_kind,
    bouquet_name: row.bouquet_name ?? null,
    retail_product_id: row.retail_product_id ?? null,
  }
  db.sales.push(sale)
  return sale
}

export function createWarehouseSale(
  db: DemoDb,
  shopUid: number,
  body: Record<string, unknown>,
  nextId: () => number,
): { error?: string; status?: number; payload?: unknown } {
  const payment_type = typeof body.payment_type === 'string' ? body.payment_type : 'cash'
  const qty = Number.parseInt(String(body.quantity ?? 0), 10)
  if (!Number.isFinite(qty) || qty < 1) return { error: 'quantity должно быть не меньше 1.' }
  const unitPrice = parseMoney(body.unit_price)
  if (unitPrice == null || unitPrice <= 0) return { error: 'Укажите цену.' }
  const rq = Number.parseInt(String(body.realization_quantity ?? 0), 10)
  const saleRq = Number.isFinite(rq) && rq > 0 ? rq : 0

  if (Array.isArray(body.composition)) {
    const comp = body.composition as Array<{ store_flower_id?: number; quantity?: number }>
    for (const ln of comp) {
      const sfId = Number(ln.store_flower_id)
      const lq = Number(ln.quantity) * qty
      if (!sfId || !lq) continue
      const d = fifoDeductFlower(db, shopUid, sfId, lq, 0)
      if (d.error) return { error: d.error }
    }
    const fin = saleFinancials(0, qty, unitPrice, 0, null)
    const sale = appendSale(
      db,
      shopUid,
      {
        batch_id: null,
        taxon_id: 0,
        store_flower_id: 0,
        display_name: String(body.bouquet_name || 'Букет на заказ'),
        quantity: qty,
        unit_price: moneyStr(unitPrice),
        ...fin,
        realization_quantity: 0,
        payment_type,
        line_kind: 'custom_bouquet',
        bouquet_name: String(body.bouquet_name || 'Букет на заказ'),
      },
      nextId,
    )
    return { status: 201, payload: { kind: 'custom_bouquet', sale: { id: sale.id, quantity: sale.quantity } } }
  }

  if (body.bouquet_id != null) {
    const bouquetId = Number.parseInt(String(body.bouquet_id), 10)
    const b = db.bouquets.find((x) => x.id === bouquetId && x.user_id === shopUid)
    if (!b) return { error: 'Букет не найден.', status: 404 }
    if (b.quantity < qty) return { error: 'Недостаточно букетов на складе.' }
    b.quantity -= qty
    const uc = 0
    const fin = saleFinancials(uc, qty, unitPrice, saleRq, null)
    appendSale(
      db,
      shopUid,
      {
        batch_id: null,
        taxon_id: 0,
        store_flower_id: 0,
        display_name: b.name,
        quantity: qty,
        unit_price: moneyStr(unitPrice),
        ...fin,
        realization_quantity: saleRq,
        payment_type,
        line_kind: 'bouquet',
        bouquet_name: b.name,
      },
      nextId,
    )
    return { status: 201, payload: { kind: 'bouquet' } }
  }

  if (body.retail_product_id != null) {
    const pid = Number.parseInt(String(body.retail_product_id), 10)
    const p = db.retailProducts.find((x) => x.id === pid && x.user_id === shopUid)
    if (!p) return { error: 'Товар не найден.', status: 404 }
    if (p.quantity < qty) return { error: 'Недостаточно товара на складе.' }
    if (saleRq > (p.realization_quantity || 0)) return { error: 'С реализации больше, чем доступно.' }
    p.quantity -= qty
    if (saleRq > 0) p.realization_quantity = Math.max(0, (p.realization_quantity || 0) - saleRq)
    const uc = parseMoney(p.unit_cost) ?? 0
    const fin = saleFinancials(uc, qty, unitPrice, saleRq, p.sale_terms_fixed_price)
    appendSale(
      db,
      shopUid,
      {
        batch_id: null,
        taxon_id: 0,
        store_flower_id: 0,
        display_name: p.name,
        quantity: qty,
        unit_price: moneyStr(unitPrice),
        ...fin,
        realization_quantity: saleRq,
        payment_type,
        line_kind: 'retail',
        retail_product_id: pid,
      },
      nextId,
    )
    return { status: 201, payload: { kind: 'retail' } }
  }

  if (body.batch_id != null) {
    const batchId = Number.parseInt(String(body.batch_id), 10)
    const batch = db.batches.find((b) => b.id === batchId && b.user_id === shopUid)
    if (!batch) return { error: 'Партия не найдена.', status: 404 }
    const maxRq = batch.realization_quantity || 0
    if (saleRq > maxRq) return { error: 'С реализации больше, чем доступно.' }
    const d = deductBatch(batch, qty, saleRq)
    if (d.error) return d
    const sf = db.storeFlowers.find((s) => s.id === batch.store_flower_id)
    const taxon = db.taxons.find((t) => t.id === batch.taxon_id)
    const name = taxon ? (taxon.name_ru || taxon.name) : sf?.name_override || 'Цветы'
    const uc = parseMoney(batch.unit_cost) ?? 0
    const fin = saleFinancials(uc, qty, unitPrice, saleRq, batch.sale_terms_fixed_price)
    appendSale(
      db,
      shopUid,
      {
        batch_id: batchId,
        taxon_id: batch.taxon_id,
        store_flower_id: batch.store_flower_id,
        display_name: name,
        quantity: qty,
        unit_price: moneyStr(unitPrice),
        ...fin,
        realization_quantity: saleRq,
        payment_type,
        line_kind: 'flower',
      },
      nextId,
    )
    return { status: 201, payload: { kind: 'flower' } }
  }

  if (body.store_flower_id != null) {
    const sfId = Number.parseInt(String(body.store_flower_id), 10)
    const sf = db.storeFlowers.find((s) => s.id === sfId && s.user_id === shopUid)
    if (!sf) return { error: 'Цветок не найден.', status: 404 }
    const d = fifoDeductFlower(db, shopUid, sfId, qty, saleRq)
    if (d.error) return d
    const taxon = db.taxons.find((t) => t.id === sf.taxon_id)
    const name = taxon ? (taxon.name_ru || taxon.name) : sf.name_override || 'Цветы'
    const uc = d.unitCost ?? 0
    const fin = saleFinancials(uc, qty, unitPrice, saleRq, d.fixedPrice ?? null)
    appendSale(
      db,
      shopUid,
      {
        batch_id: null,
        taxon_id: sf.taxon_id ?? 0,
        store_flower_id: sfId,
        display_name: name,
        quantity: qty,
        unit_price: moneyStr(unitPrice),
        ...fin,
        realization_quantity: saleRq,
        payment_type,
        line_kind: 'flower',
      },
      nextId,
    )
    return { status: 201, payload: { kind: 'flower' } }
  }

  return { error: 'Укажите позицию для продажи.' }
}

export function patchBasicCare(
  db: DemoDb,
  shopUid: number,
  careId: number,
  body: Record<string, unknown>,
): { error?: string } {
  const care = db.basicCare.find((c) => c.id === careId && c.user_id === shopUid)
  if (!care) return { error: 'Строка не найдена.' }
  const action = String(body.action || '')
  const scope =
    body.basic_batch_scope === 'cleared' || body.basic_batch_scope === 'intake_pending'
      ? (body.basic_batch_scope as 'cleared' | 'intake_pending')
      : null
  const now = nowIso()

  if (action === 'discard_batch') {
    const dq = Number.parseInt(String(body.discard_quantity), 10)
    if (!Number.isFinite(dq) || dq < 1) return { error: 'Укажите discard_quantity ≥ 1.' }
    const stock = flowerStockQty(db, shopUid, care.store_flower_id, scope)
    if (dq > stock) return { error: 'Нельзя списать больше, чем есть на складе.' }
    const maxRq = flowerRealizationQty(db, shopUid, care.store_flower_id, scope)
    const rq = parseDiscardRq(body, dq, maxRq)
    if (rq < 0) return { error: 'Некорректное «с реализации».' }
    const cost = discardStoreFlowerFifo(db, shopUid, care.store_flower_id, dq, rq, scope)
    const sf = db.storeFlowers.find((s) => s.id === care.store_flower_id)
    const t = sf ? db.taxons.find((x) => x.id === sf.taxon_id) : null
    const label = sf ? (t ? t.name_ru || t.name : sf.name_override) : 'Цветы'
    recordStockDiscard(
      db,
      {
        user_id: shopUid,
        discarded_at: now,
        kind: 'store_flower',
        quantity: dq,
        unit_cost: '0.00',
        total_cost: moneyStr(cost),
        display_name: label,
        store_flower_id: care.store_flower_id,
        flower_batch_id: null,
        retail_product_id: null,
        bouquet_id: null,
        consumable_id: null,
        discard_meters: null,
      },
      () => bumpId(db),
    )
    if (scope === 'intake_pending') {
      for (const b of batchesForFlower(db, shopUid, care.store_flower_id, 'intake_pending')) {
        if (b.quantity <= 0) b.intake_pending = false
      }
    }
    care.intake_pending = allFlowerBatches(db, shopUid, care.store_flower_id).some((b) => b.intake_pending)
    return {}
  }

  const owner = db.users.find((u) => u.id === shopUid)
  const variety = owner?.warehouse_mode === 'variety'
  const all = allFlowerBatches(db, shopUid, care.store_flower_id)
  const effectiveScope = effectiveBasicBatchScope(all, scope, action)
  const target = batchesForFlower(db, shopUid, care.store_flower_id, effectiveScope)

  if (action === 'trim_now' || action === 'water_now') {
    if (!target.length) {
      care.intake_pending = all.some((b) => b.intake_pending)
      return {}
    }
    if (variety) {
      if (action === 'trim_now') {
        for (const b of target) {
          b.last_trim_at = now
          clearIntakeIfBothLogged(b)
        }
      } else {
        for (const b of target) {
          b.last_water_change_at = now
          clearIntakeIfBothLogged(b)
        }
      }
      refreshBasicCareTimestampsFromBatches(db, shopUid, care.store_flower_id)
    } else {
      applyUnifiedBasicCare(now, care, target)
    }
    care.intake_pending = all.some((b) => b.intake_pending)
    return {}
  }
  if (action === 'intake_done') {
    if (!target.length) {
      care.intake_pending = all.some((b) => b.intake_pending)
      return {}
    }
    const cleared = all.filter((b) => !b.intake_pending)
    let { trim: inheritTrim, water: inheritWater } = inheritCareFromCleared(cleared)
    if (!inheritTrim && !inheritWater) {
      inheritTrim = now
      inheritWater = now
    } else {
      if (!inheritTrim) inheritTrim = inheritWater ?? now
      if (!inheritWater) inheritWater = inheritTrim ?? now
    }
    for (const b of target) {
      b.last_trim_at = inheritTrim
      b.last_water_change_at = inheritWater
      b.intake_pending = false
      clearIntakeIfBothLogged(b)
    }
    refreshBasicCareTimestampsFromBatches(db, shopUid, care.store_flower_id)
    care.intake_pending = all.some((b) => b.intake_pending)
    return {}
  }
  return { error: 'Неизвестный action.' }
}

export function patchBatch(
  db: DemoDb,
  shopUid: number,
  batchId: number,
  body: Record<string, unknown>,
): { error?: string } {
  const batch = db.batches.find((b) => b.id === batchId && b.user_id === shopUid)
  if (!batch) return { error: 'Партия не найдена.' }
  const action = String(body.action || '')
  const now = nowIso()

  if (action === 'discard_batch') {
    const dq = Number.parseInt(String(body.discard_quantity), 10)
    if (!Number.isFinite(dq) || dq < 1) return { error: 'Укажите discard_quantity ≥ 1.' }
    const maxRq = batch.realization_quantity || 0
    const rq = parseDiscardRq(body, dq, maxRq)
    if (rq < 0) return { error: 'Некорректное «с реализации».' }
    const uc = parseMoney(batch.unit_cost) ?? 0
    const cost = Math.round(uc * dq * 100) / 100
    const err = deductBatch(batch, dq, rq)
    if (err.error) return err
    const sf = db.storeFlowers.find((s) => s.id === batch.store_flower_id)
    const t = db.taxons.find((x) => x.id === batch.taxon_id)
    const label = t ? t.name_ru || t.name : sf?.name_override || 'Партия'
    refreshBasicCareTimestampsFromBatches(db, shopUid, batch.store_flower_id)
    const care = db.basicCare.find((c) => c.user_id === shopUid && c.store_flower_id === batch.store_flower_id)
    if (care) {
      care.intake_pending = allFlowerBatches(db, shopUid, batch.store_flower_id).some((b) => b.intake_pending)
    }
    recordStockDiscard(
      db,
      {
        user_id: shopUid,
        discarded_at: now,
        kind: 'flower_batch',
        quantity: dq,
        unit_cost: moneyStr(uc),
        total_cost: moneyStr(cost),
        display_name: label,
        store_flower_id: batch.store_flower_id,
        flower_batch_id: batch.id,
        retail_product_id: null,
        bouquet_id: null,
        consumable_id: null,
        discard_meters: null,
      },
      () => bumpId(db),
    )
    return {}
  }
  if (action === 'trim_now') {
    batch.last_trim_at = now
    clearIntakeIfBothLogged(batch)
    touchBasicCare(db, shopUid, batch.store_flower_id, { last_trim_at: now })
    refreshBasicCareTimestampsFromBatches(db, shopUid, batch.store_flower_id)
    return {}
  }
  if (action === 'water_now') {
    batch.last_water_change_at = now
    clearIntakeIfBothLogged(batch)
    touchBasicCare(db, shopUid, batch.store_flower_id, { last_water_change_at: now })
    refreshBasicCareTimestampsFromBatches(db, shopUid, batch.store_flower_id)
    return {}
  }
  if (action === 'intake_done') {
    batch.intake_pending = false
    batch.last_trim_at = now
    batch.last_water_change_at = now
    clearIntakeIfBothLogged(batch)
    refreshBasicCareTimestampsFromBatches(db, shopUid, batch.store_flower_id)
    return {}
  }
  return { error: 'Неизвестный action.' }
}

export function patchBouquet(
  db: DemoDb,
  shopUid: number,
  bouquetId: number,
  body: Record<string, unknown>,
): { error?: string } {
  const b = db.bouquets.find((x) => x.id === bouquetId && x.user_id === shopUid)
  if (!b) return { error: 'Букет не найден.' }
  const action = String(body.action || '')
  const now = nowIso()
  const owner = db.users.find((u) => u.id === shopUid)
  const basicMerged = owner?.warehouse_mode === 'basic'
  const assemblyIdRaw = body.assembly_id
  const assemblyId =
    assemblyIdRaw != null && assemblyIdRaw !== '' ? Number.parseInt(String(assemblyIdRaw), 10) : null
  const asm =
    assemblyId != null && Number.isFinite(assemblyId)
      ? db.bouquetAssemblies.find((a) => a.id === assemblyId && a.bouquet_id === bouquetId && a.user_id === shopUid)
      : null

  if (action === 'trim_now') {
    if (asm) asm.last_trim_at = now
    else {
      b.last_trim_at = now
      if (basicMerged) b.last_water_change_at = now
    }
    return {}
  }
  if (action === 'water_now') {
    if (asm) asm.last_water_change_at = now
    else b.last_water_change_at = now
    return {}
  }
  if (action === 'intake_done') {
    b.intake_pending = false
    return {}
  }
  if (body.unit_price != null) b.unit_price = moneyStr(parseMoney(body.unit_price) ?? 0)
  if (body.name != null && String(body.name).trim()) b.name = String(body.name).trim().slice(0, 200)
  return {}
}

export function discardStoreFlowerStock(
  db: DemoDb,
  shopUid: number,
  storeFlowerId: number,
  body: Record<string, unknown>,
): { error?: string } {
  const sf = db.storeFlowers.find((s) => s.id === storeFlowerId && s.user_id === shopUid)
  if (!sf) return { error: 'Цветок не найден.' }
  const qty = Number.parseInt(String(body.quantity), 10)
  if (!Number.isFinite(qty) || qty < 1) return { error: 'Укажите quantity ≥ 1.' }
  const stock = flowerStockQty(db, shopUid, storeFlowerId)
  if (qty > stock) return { error: 'Недостаточно на складе.' }
  const maxRq = flowerRealizationQty(db, shopUid, storeFlowerId)
  const rq = parseDiscardRq(body, qty, maxRq)
  if (rq < 0) return { error: 'Некорректное «с реализации».' }
  const now = nowIso()
  const cost = discardStoreFlowerFifo(db, shopUid, storeFlowerId, qty, rq)
  const t = db.taxons.find((x) => x.id === sf.taxon_id)
  const label = t ? t.name_ru || t.name : sf.name_override || 'Цветы'
  recordStockDiscard(
    db,
    {
      user_id: shopUid,
      discarded_at: now,
      kind: 'store_flower',
      quantity: qty,
      unit_cost: '0.00',
      total_cost: moneyStr(cost),
      display_name: label,
      store_flower_id: sf.id,
      flower_batch_id: null,
      retail_product_id: null,
      bouquet_id: null,
      consumable_id: null,
      discard_meters: null,
    },
    () => bumpId(db),
  )
  return {}
}

export function discardRetail(
  db: DemoDb,
  shopUid: number,
  productId: number,
  body: Record<string, unknown>,
): { error?: string } {
  const p = db.retailProducts.find((x) => x.id === productId && x.user_id === shopUid)
  if (!p) return { error: 'Товар не найден.' }
  const qty = Number.parseInt(String(body.quantity), 10)
  if (!Number.isFinite(qty) || qty < 1) return { error: 'Укажите quantity ≥ 1.' }
  if (qty > p.quantity) return { error: 'Недостаточно товара на складе.' }
  const rq = parseDiscardRq(body, qty, p.realization_quantity || 0)
  if (rq < 0) return { error: 'Некорректное «с реализации».' }
  const uc = parseMoney(p.unit_cost) ?? 0
  const cost = Math.round(uc * qty * 100) / 100
  p.quantity -= qty
  if (rq > 0) p.realization_quantity = Math.max(0, (p.realization_quantity || 0) - rq)
  recordStockDiscard(
    db,
    {
      user_id: shopUid,
      discarded_at: nowIso(),
      kind: 'retail',
      quantity: qty,
      unit_cost: moneyStr(uc),
      total_cost: moneyStr(cost),
      display_name: p.name,
      store_flower_id: null,
      flower_batch_id: null,
      retail_product_id: p.id,
      bouquet_id: null,
      consumable_id: null,
      discard_meters: null,
    },
    () => bumpId(db),
  )
  return {}
}

export function discardBouquet(
  db: DemoDb,
  shopUid: number,
  bouquetId: number,
  body: Record<string, unknown>,
): { error?: string } {
  const b = db.bouquets.find((x) => x.id === bouquetId && x.user_id === shopUid)
  if (!b) return { error: 'Букет не найден.' }
  const qty = Number.parseInt(String(body.quantity ?? 1), 10)
  if (!Number.isFinite(qty) || qty < 1) return { error: 'Укажите quantity ≥ 1.' }
  if (qty > b.quantity) return { error: 'Недостаточно букетов.' }
  b.quantity -= qty
  recordStockDiscard(
    db,
    {
      user_id: shopUid,
      discarded_at: nowIso(),
      kind: 'bouquet',
      quantity: qty,
      unit_cost: '0.00',
      total_cost: '0.00',
      display_name: b.name,
      store_flower_id: null,
      flower_batch_id: null,
      retail_product_id: null,
      bouquet_id: b.id,
      consumable_id: null,
      discard_meters: null,
    },
    () => bumpId(db),
  )
  return {}
}

export function stockSearch(
  db: DemoDb,
  shopUid: number,
  q: string,
  supplierId: number | null = null,
): { error?: string; status?: number; results?: unknown[] } {
  if (supplierId != null) {
    const supplier = db.suppliers.find((s) => s.id === supplierId && s.user_id === shopUid)
    if (!supplier) return { error: 'Поставщик не найден.', status: 404 }
  }
  const query = q.trim().toLowerCase()
  let sfRows = db.storeFlowers.filter((sf) => sf.user_id === shopUid)
  if (supplierId != null) {
    const allowed = new Set(
      db.supplierOffers.filter((o) => o.supplier_id === supplierId).map((o) => o.store_flower_id),
    )
    sfRows = sfRows.filter((sf) => allowed.has(sf.id))
  }
  const flowers = sfRows
    .filter((sf) => {
      const t = db.taxons.find((x) => x.id === sf.taxon_id)
      const blob = `${sf.name_override} ${t?.name ?? ''} ${t?.name_ru ?? ''}`.toLowerCase()
      return !query || blob.includes(query)
    })
    .slice(0, 25)
    .map((sf) => {
      const t = db.taxons.find((x) => x.id === sf.taxon_id)
      const offer =
        supplierId != null
          ? db.supplierOffers.find(
              (o) => o.supplier_id === supplierId && o.store_flower_id === sf.id,
            )
          : null
      return {
        kind: 'flower' as const,
        stock_kind: 'flower' as const,
        store_flower_id: sf.id,
        taxon_id: sf.taxon_id,
        id: sf.id,
        display_name: t ? (t.name_ru || t.name) : sf.name_override,
        latin_name: t?.name ?? '',
        rank_label: t?.rank ?? '',
        quantity: flowerStockQty(db, shopUid, sf.id),
        unit_purchase_price: offer ? parseFloat(offer.unit_purchase_price) : undefined,
        photo_url: resolveDemoPhotoUrl('flower', sf.id, sf.photo_path),
      }
    })
  const retail = db.retailProducts
    .filter((p) => p.user_id === shopUid)
    .filter((p) => !query || p.name.toLowerCase().includes(query))
    .slice(0, 15)
    .map((p) => ({
      kind: 'retail' as const,
      stock_kind: 'retail' as const,
      retail_product_id: p.id,
      id: p.id,
      display_name: p.name,
      name: p.name,
      rank_label: 'Товар',
      quantity: p.quantity,
      photo_url: resolveDemoPhotoUrl('retail', p.id, p.photo_path),
    }))
  const bouquets = db.bouquets
    .filter((b) => b.user_id === shopUid && b.quantity > 0)
    .filter((b) => !query || b.name.toLowerCase().includes(query))
    .slice(0, 15)
    .map((b) => ({
      kind: 'bouquet' as const,
      stock_kind: 'bouquet' as const,
      bouquet_id: b.id,
      id: b.id,
      display_name: b.name,
      name: b.name,
      rank_label: 'Букет',
      quantity: b.quantity,
      photo_url: resolveDemoPhotoUrl('bouquet', b.id, b.photo_path),
    }))
  const consumables = db.consumables
    .filter((c) => c.user_id === shopUid)
    .filter((c) => !query || c.name.toLowerCase().includes(query))
    .slice(0, 15)
    .map((c) => ({
      kind: 'consumable' as const,
      stock_kind: 'consumable' as const,
      consumable_id: c.id,
      id: c.id,
      display_name: c.name,
      name: c.name,
      rank_label: c.unit_kind === 'meter' ? 'Расходник (м)' : 'Расходник (шт)',
      photo_url: resolveDemoPhotoUrl('consumable', c.id, c.photo_path),
    }))
  return { results: [...flowers, ...retail, ...bouquets, ...consumables] }
}

export function createBatchIntake(
  db: DemoDb,
  shopUid: number,
  body: Record<string, unknown>,
  nextId: () => number,
): { error?: string } {
  const lines = Array.isArray(body.lines) ? body.lines : []
  if (!lines.length) return { error: 'Добавьте строки прихода.' }
  const now = nowIso()
  for (const raw of lines) {
    if (!raw || typeof raw !== 'object') continue
    const o = raw as Record<string, unknown>
    const qty = Number.parseInt(String(o.quantity), 10)
    if (!Number.isFinite(qty) || qty < 1) return { error: 'Количество ≥ 1.' }
    const sfId = Number(o.store_flower_id ?? o.taxon_id)
    const sf = db.storeFlowers.find((s) => s.id === sfId && s.user_id === shopUid)
    const taxonId = sf?.taxon_id ?? Number(o.taxon_id)
    if (!sf && !taxonId) return { error: 'Укажите цветок.' }
    const unitCost = moneyStr(parseMoney(o.unit_cost ?? o.unit_purchase_price) ?? 0)
    const rq = Number.parseInt(String(o.realization_quantity ?? 0), 10)
    const batchId = nextId()
    db.batches.push({
      id: batchId,
      user_id: shopUid,
      store_flower_id: sf?.id ?? sfId,
      taxon_id: taxonId,
      quantity: qty,
      received_at: now,
      last_trim_at: null,
      last_water_change_at: null,
      intake_pending: true,
      unit_cost: unitCost,
      realization_quantity: Number.isFinite(rq) && rq > 0 ? rq : 0,
      sale_terms_fixed_price:
        typeof o.sale_terms_fixed_price === 'string' ? o.sale_terms_fixed_price : null,
    })
    if (sf) {
      let care = db.basicCare.find((c) => c.store_flower_id === sf.id)
      if (!care) {
        care = {
          id: nextId(),
          user_id: shopUid,
          store_flower_id: sf.id,
          intake_pending: true,
          last_trim_at: null,
          last_water_change_at: null,
        }
        db.basicCare.push(care)
      } else care.intake_pending = true
    }
  }
  return {}
}

export function upsertBouquetRecipe(
  db: DemoDb,
  shopUid: number,
  body: Record<string, unknown>,
  bouquetId: number | null,
  nextId: () => number,
): { error?: string; bouquet?: { id: number } } {
  const name = String(body.name || '').trim()
  if (!name) return { error: 'Укажите название.' }
  const lines = Array.isArray(body.lines) ? body.lines : []
  const recipe_lines = lines
    .map((raw) => {
      const o = raw as Record<string, unknown>
      const sfId = Number(o.store_flower_id)
      const q = Number.parseInt(String(o.quantity), 10)
      if (!sfId || !Number.isFinite(q) || q < 1) return null
      return { store_flower_id: sfId, quantity: q }
    })
    .filter(Boolean) as DemoDb['bouquets'][number]['recipe_lines']
  const consumable_lines = Array.isArray(body.consumable_lines)
    ? (body.consumable_lines as DemoDb['bouquets'][number]['consumable_recipe_lines'])
    : []
  const priceRaw = body.unit_price
  const unit_price =
    priceRaw != null && Number(priceRaw) > 0 ? moneyStr(Number(priceRaw)) : null

  if (bouquetId != null) {
    const b = db.bouquets.find((x) => x.id === bouquetId && x.user_id === shopUid)
    if (!b) return { error: 'Букет не найден.' }
    b.name = name.slice(0, 200)
    b.recipe_lines = recipe_lines
    b.consumable_recipe_lines = consumable_lines
    b.unit_price = unit_price
    return { bouquet: { id: b.id } }
  }
  const id = nextId()
  db.bouquets.push({
    id,
    user_id: shopUid,
    name: name.slice(0, 200),
    unit_price,
    quantity: 0,
    assembled_at: null,
    last_trim_at: null,
    last_water_change_at: null,
    intake_pending: false,
    photo_path: null,
    recipe_lines,
    consumable_recipe_lines: consumable_lines,
  })
  return { bouquet: { id } }
}

export function deleteBouquetById(db: DemoDb, shopUid: number, bouquetId: number): { error?: string } {
  const b = db.bouquets.find((x) => x.id === bouquetId && x.user_id === shopUid)
  if (!b) return { error: 'Букет не найден.' }
  if (b.quantity > 0) return { error: 'Сначала спишите или продайте остаток букета.' }
  db.bouquets = db.bouquets.filter((x) => x.id !== bouquetId)
  return {}
}

export function assembleBouquet(
  db: DemoDb,
  shopUid: number,
  body: Record<string, unknown>,
): { error?: string } {
  const bouquetId = Number.parseInt(String(body.bouquet_id), 10)
  const qty = Number.parseInt(String(body.quantity ?? 1), 10)
  if (!Number.isFinite(qty) || qty < 1) return { error: 'quantity ≥ 1.' }
  const b = db.bouquets.find((x) => x.id === bouquetId && x.user_id === shopUid)
  if (!b) return { error: 'Букет не найден.' }
  const owner = db.users.find((u) => u.id === shopUid)
  const advanced = owner != null && !usesMergedWarehouseCards(owner.warehouse_mode)
  const sliceByBatch = new Map<number, FifoSlice>()
  for (const ln of b.recipe_lines) {
    const need = ln.quantity * qty
    const stock = flowerStockQty(db, shopUid, ln.store_flower_id)
    if (need > stock) return { error: 'Недостаточно цветов для сборки.' }
    if (advanced) {
      const d = fifoDeductFlowerWithSlices(db, shopUid, ln.store_flower_id, need, 0)
      if (d.error) return d
      for (const sl of d.slices ?? []) {
        const prev = sliceByBatch.get(sl.batch_id)
        if (prev) prev.quantity += sl.quantity
        else sliceByBatch.set(sl.batch_id, { ...sl })
      }
    } else {
      const d = fifoDeductFlower(db, shopUid, ln.store_flower_id, need, 0)
      if (d.error) return d
    }
  }
  const now = nowIso()
  const oldQty = b.quantity
  b.quantity += qty
  const batchesUsed = [...sliceByBatch.values()]
    .map((sl) => db.batches.find((x) => x.id === sl.batch_id))
    .filter(Boolean) as DemoBatch[]
  const { trim: trimAt, water: waterAt } = bouquetCareTimesFromBatches(batchesUsed)

  if (advanced) {
    const asmId = bumpId(db)
    db.bouquetAssemblies.push({
      id: asmId,
      bouquet_id: b.id,
      user_id: shopUid,
      quantity: qty,
      assembled_at: now,
      last_trim_at: trimAt ?? now,
      last_water_change_at: waterAt ?? now,
    })
    for (const sl of sliceByBatch.values()) {
      const perBouquet = Math.floor(sl.quantity / qty)
      if (perBouquet <= 0) continue
      db.bouquetComponents.push({
        id: bumpId(db),
        bouquet_id: b.id,
        assembly_id: asmId,
        batch_id: sl.batch_id,
        store_flower_id: sl.store_flower_id,
        taxon_id: sl.taxon_id,
        quantity: perBouquet,
      })
    }
    if (oldQty <= 0) {
      b.assembled_at = now
      b.last_trim_at = trimAt ?? now
      b.last_water_change_at = waterAt ?? now
    }
    b.intake_pending = false
  } else {
    b.assembled_at = now
    b.intake_pending = true
    if (oldQty <= 0 && owner?.warehouse_mode === 'basic') {
      const shopCare = basicShopCareTimesForRecipe(db, shopUid, b.recipe_lines)
      b.last_trim_at = shopCare.trim ?? trimAt ?? now
      b.last_water_change_at = shopCare.water ?? waterAt ?? now
    }
  }
  return {}
}

function bouquetCareTimesFromBatches(batches: DemoBatch[]): {
  trim: string | null
  water: string | null
} {
  const trims = batches.map((x) => x.last_trim_at).filter(Boolean) as string[]
  const waters = batches.map((x) => x.last_water_change_at).filter(Boolean) as string[]
  const minIso = (list: string[]) => list.reduce((a, c) => (c < a ? c : a))
  return {
    trim: trims.length ? minIso(trims) : null,
    water: waters.length ? minIso(waters) : null,
  }
}

function basicShopCareTimesForRecipe(
  db: DemoDb,
  shopUid: number,
  recipe: DemoBouquet['recipe_lines'],
): { trim: string | null; water: string | null } {
  const sfIds = recipe.map((r) => r.store_flower_id).filter(Boolean)
  const cares = db.basicCare.filter((c) => c.user_id === shopUid && sfIds.includes(c.store_flower_id))
  const trims = cares.map((c) => c.last_trim_at).filter(Boolean) as string[]
  const waters = cares.map((c) => c.last_water_change_at).filter(Boolean) as string[]
  return {
    trim: trims.length ? trims.reduce((a, c) => (c > a ? c : a)) : null,
    water: waters.length ? waters.reduce((a, c) => (c > a ? c : a)) : null,
  }
}

export function upsertRetailProduct(
  db: DemoDb,
  shopUid: number,
  body: Record<string, unknown>,
  productId: number | null,
  nextId: () => number,
): { error?: string; product?: { id: number } } {
  const name = String(body.name || '').trim()
  if (!name) return { error: 'Укажите название.' }
  const qty = Number.parseInt(String(body.quantity ?? 0), 10)
  const unit_price = moneyStr(parseMoney(body.unit_price) ?? 0)
  const unit_cost = moneyStr(parseMoney(body.unit_cost) ?? 0)
  if (productId != null) {
    const p = db.retailProducts.find((x) => x.id === productId && x.user_id === shopUid)
    if (!p) return { error: 'Товар не найден.' }
    const prevQty = p.quantity
    p.name = name.slice(0, 200)
    if (Number.isFinite(qty) && qty >= 0) p.quantity = qty
    p.unit_price = unit_price
    p.unit_cost = unit_cost
    if (Number.isFinite(qty) && qty > prevQty) {
      recordRetailIntake(db, shopUid, p.id, p.name, qty - prevQty, unit_cost, nowIso())
    }
    return { product: { id: p.id } }
  }
  const id = nextId()
  const initialQty = Number.isFinite(qty) && qty >= 0 ? qty : 0
  db.retailProducts.push({
    id,
    user_id: shopUid,
    name: name.slice(0, 200),
    quantity: initialQty,
    unit_cost,
    unit_price,
    photo_path: null,
    created_at: nowIso(),
    realization_quantity: 0,
    sale_terms_fixed_price: null,
  })
  if (initialQty > 0) {
    recordRetailIntake(db, shopUid, id, name.slice(0, 200), initialQty, unit_cost, nowIso())
  }
  return { product: { id } }
}

export function deleteRetailProduct(db: DemoDb, shopUid: number, productId: number): { error?: string } {
  const p = db.retailProducts.find((x) => x.id === productId && x.user_id === shopUid)
  if (!p) return { error: 'Товар не найден.' }
  db.retailProducts = db.retailProducts.filter((x) => x.id !== productId)
  return {}
}

export function discardConsumableMeters(
  db: DemoDb,
  shopUid: number,
  consumableId: number,
  body: Record<string, unknown>,
): { error?: string } {
  const c = db.consumables.find((x) => x.id === consumableId && x.user_id === shopUid)
  if (!c) return { error: 'Расходник не найден.' }
  const meters = parseMoney(body.meters ?? body.quantity)
  if (meters == null || meters <= 0) return { error: 'Укажите количество.' }
  const bal = parseMoney(c.meters_balance) ?? 0
  if (meters > bal) return { error: 'Недостаточно на балансе.' }
  const ucpm = parseMoney(c.unit_cost_per_meter) ?? 0
  const cost = Math.round(meters * ucpm * 100) / 100
  c.meters_balance = moneyStr(bal - meters)
  recordStockDiscard(
    db,
    {
      user_id: shopUid,
      discarded_at: nowIso(),
      kind: 'consumable',
      quantity: 1,
      unit_cost: moneyStr(cost),
      total_cost: moneyStr(cost),
      display_name: c.name,
      store_flower_id: null,
      flower_batch_id: null,
      retail_product_id: null,
      bouquet_id: null,
      consumable_id: c.id,
      discard_meters: moneyStr(meters),
    },
    () => bumpId(db),
  )
  return {}
}

export function completeOrderHandoff(
  db: DemoDb,
  shopUid: number,
  order: DemoCustomerOrder,
  nextId: () => number,
): { error?: string } {
  const payment_type = order.payment_type
  const qty = order.quantity
  const unitPrice = parseMoney(order.unit_price)
  if (unitPrice == null) return { error: 'Некорректная цена в заказе.' }
  const saleRq = order.realization_quantity || 0

  if (order.line_kind === 'bouquet') {
    if (saleRq > 0) return { error: 'Продажа букетов с реализации пока не поддерживается.' }
    const b = db.bouquets.find((x) => x.id === order.bouquet_id && x.user_id === shopUid)
    if (!b) return { error: 'Букет не найден.' }
    const uc = 0
    const fin = saleFinancials(uc, qty, unitPrice, 0, null)
    appendSale(
      db,
      shopUid,
      {
        batch_id: null,
        taxon_id: 0,
        store_flower_id: 0,
        display_name: order.product_name,
        quantity: qty,
        unit_price: order.unit_price,
        ...fin,
        realization_quantity: 0,
        payment_type,
        line_kind: 'bouquet',
        bouquet_name: order.product_name,
      },
      nextId,
    )
    return {}
  }

  if (order.line_kind === 'retail') {
    const p = db.retailProducts.find((x) => x.id === order.retail_product_id && x.user_id === shopUid)
    if (!p) return { error: 'Товар не найден.' }
    const uc = parseMoney(p.unit_cost) ?? 0
    const fin = saleFinancials(uc, qty, unitPrice, saleRq, p.sale_terms_fixed_price)
    appendSale(
      db,
      shopUid,
      {
        batch_id: null,
        taxon_id: 0,
        store_flower_id: 0,
        display_name: order.product_name,
        quantity: qty,
        unit_price: order.unit_price,
        ...fin,
        realization_quantity: saleRq,
        payment_type,
        line_kind: 'retail',
        retail_product_id: order.retail_product_id,
      },
      nextId,
    )
    return {}
  }

  if (order.line_kind === 'store_flower') {
    const sfId = order.store_flower_id
    if (sfId == null) return { error: 'Цветок не найден.' }
    const d = fifoDeductFlower(db, shopUid, sfId, qty, saleRq)
    if (d.error) return d
    const sf = db.storeFlowers.find((s) => s.id === sfId)
    const fin = saleFinancials(d.unitCost ?? 0, qty, unitPrice, saleRq, d.fixedPrice ?? null)
    appendSale(
      db,
      shopUid,
      {
        batch_id: null,
        taxon_id: sf?.taxon_id ?? 0,
        store_flower_id: sfId,
        display_name: order.product_name,
        quantity: qty,
        unit_price: order.unit_price,
        ...fin,
        realization_quantity: saleRq,
        payment_type,
        line_kind: 'flower',
      },
      nextId,
    )
    return {}
  }

  const batchId = order.batch_id
  if (batchId == null) return { error: 'Партия не найдена.' }
  const batch = db.batches.find((b) => b.id === batchId && b.user_id === shopUid)
  if (!batch) return { error: 'Партия не найдена.' }
  const uc = parseMoney(order.unit_cost) ?? parseMoney(batch.unit_cost) ?? 0
  const fin = saleFinancials(uc, qty, unitPrice, saleRq, batch.sale_terms_fixed_price)
  appendSale(
    db,
    shopUid,
    {
      batch_id: batchId,
      taxon_id: batch.taxon_id,
      store_flower_id: batch.store_flower_id,
      display_name: order.product_name,
      quantity: qty,
      unit_price: order.unit_price,
      ...fin,
      realization_quantity: saleRq,
      payment_type,
      line_kind: 'flower',
    },
    nextId,
  )
  return {}
}
