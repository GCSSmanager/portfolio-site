import { completeOrderHandoff } from './stockOps'
import { moneyStr, parseMoney } from './money'
import type { DemoCustomerOrder, DemoDb } from './types'

const PICKUP_NAME = 'Заберёт в магазине'

function parsePhone(raw: unknown): string | null {
  const digits = String(raw ?? '').replace(/\D/g, '')
  let d = digits
  if (d.startsWith('8')) d = `7${d.slice(1)}`
  if (d && !d.startsWith('7')) d = `7${d}`
  if (d.length !== 11) return null
  return d
}

function saleFinancials(unitCost: number, qty: number, unitPrice: number, rq: number, fixed: string | null) {
  const total = Math.round(unitPrice * qty * 100) / 100
  const purchaseCost = Math.round(unitCost * (qty - rq) * 100) / 100
  let supplier = 0
  if (rq > 0 && fixed) supplier = Math.round(parseFloat(fixed) * rq * 100) / 100
  const profit = Math.round((total - purchaseCost - supplier) * 100) / 100
  return {
    product_total: moneyStr(total),
    unit_cost: moneyStr(unitCost),
    shop_profit: moneyStr(profit),
    supplier_payout: moneyStr(supplier),
    unit_price: moneyStr(unitPrice),
  }
}

function reserveLine(
  db: DemoDb,
  shopUid: number,
  body: Record<string, unknown>,
): { error?: string; snapshot?: Omit<DemoCustomerOrder, 'id' | 'user_id' | 'status'> & { line_kind: DemoCustomerOrder['line_kind'] } } {
  const qty = Number.parseInt(String(body.quantity ?? 0), 10)
  if (!Number.isFinite(qty) || qty < 1) return { error: 'quantity должно быть не меньше 1.' }
  const unitPrice = parseMoney(body.unit_price)
  if (unitPrice == null || unitPrice <= 0) return { error: 'Укажите unit_price для заказа.' }
  const rq = Math.max(0, Number.parseInt(String(body.realization_quantity ?? 0), 10) || 0)

  if (Array.isArray(body.composition)) {
    return {
      error: 'Букет на заказ в заказах пока не поддерживается — выберите позицию со склада.',
    }
  }

  if (body.bouquet_id != null) {
    const bouquetId = Number.parseInt(String(body.bouquet_id), 10)
    const b = db.bouquets.find((x) => x.id === bouquetId && x.user_id === shopUid)
    if (!b) return { error: 'Букет не найден.' }
    if (rq > 0) return { error: 'Продажа букетов с реализации пока не поддерживается.' }
    if (qty > b.quantity) return { error: 'Недостаточно букетов на складе.' }
    b.quantity -= qty
    const fin = saleFinancials(0, qty, unitPrice, rq, null)
    return {
      snapshot: {
        line_kind: 'bouquet',
        batch_id: null,
        store_flower_id: null,
        retail_product_id: null,
        bouquet_id: bouquetId,
        taxon_id: null,
        product_name: b.name,
        quantity: qty,
        unit_price: fin.unit_price,
        unit_cost: fin.unit_cost,
        realization_quantity: rq,
        product_total_amount: fin.product_total,
        total_amount: fin.product_total,
        delivery_service_id: null,
        delivery_service_name: '',
        pickup_at_store: false,
        delivery_price: '0.00',
        delivery_address: '',
        customer_phone: '',
        scheduled_at: '',
        payment_type: 'cash',
      },
    }
  }

  if (body.retail_product_id != null) {
    const pid = Number.parseInt(String(body.retail_product_id), 10)
    const p = db.retailProducts.find((x) => x.id === pid && x.user_id === shopUid)
    if (!p) return { error: 'Товар не найден.' }
    if (qty > p.quantity) return { error: 'Недостаточно товара на складе.' }
    if (rq > (p.realization_quantity || 0)) return { error: 'С реализации больше, чем доступно.' }
    p.quantity -= qty
    if (rq > 0) p.realization_quantity = Math.max(0, (p.realization_quantity || 0) - rq)
    const uc = parseMoney(p.unit_cost) ?? 0
    const fin = saleFinancials(uc, qty, unitPrice, rq, p.sale_terms_fixed_price)
    return {
      snapshot: {
        line_kind: 'retail',
        batch_id: null,
        store_flower_id: null,
        retail_product_id: pid,
        bouquet_id: null,
        taxon_id: null,
        product_name: p.name,
        quantity: qty,
        unit_price: fin.unit_price,
        unit_cost: fin.unit_cost,
        realization_quantity: rq,
        product_total_amount: fin.product_total,
        total_amount: fin.product_total,
        delivery_service_id: null,
        delivery_service_name: '',
        pickup_at_store: false,
        delivery_price: '0.00',
        delivery_address: '',
        customer_phone: '',
        scheduled_at: '',
        payment_type: 'cash',
      },
    }
  }

  if (body.store_flower_id != null) {
    const sfId = Number.parseInt(String(body.store_flower_id), 10)
    const sf = db.storeFlowers.find((s) => s.id === sfId && s.user_id === shopUid)
    if (!sf) return { error: 'Цветок не найден.' }
    const batches = db.batches.filter((b) => b.user_id === shopUid && b.store_flower_id === sfId && b.quantity > 0)
    const stock = batches.reduce((s, b) => s + b.quantity, 0)
    const maxRq = batches.reduce((s, b) => s + (b.realization_quantity || 0), 0)
    if (qty > stock) return { error: 'Недостаточно на выбранной позиции.' }
    if (rq > maxRq) return { error: 'С реализации больше, чем доступно.' }
    const t = db.taxons.find((x) => x.id === sf.taxon_id)
    const name = t ? (t.name_ru || t.name) : sf.name_override || 'Цветы'
    const fin = saleFinancials(0, qty, unitPrice, rq, null)
    return {
      snapshot: {
        line_kind: 'store_flower',
        batch_id: null,
        store_flower_id: sfId,
        retail_product_id: null,
        bouquet_id: null,
        taxon_id: sf.taxon_id,
        product_name: name,
        quantity: qty,
        unit_price: fin.unit_price,
        unit_cost: fin.unit_cost,
        realization_quantity: rq,
        product_total_amount: fin.product_total,
        total_amount: fin.product_total,
        delivery_service_id: null,
        delivery_service_name: '',
        pickup_at_store: false,
        delivery_price: '0.00',
        delivery_address: '',
        customer_phone: '',
        scheduled_at: '',
        payment_type: 'cash',
      },
    }
  }

  if (body.batch_id == null || body.batch_id === '') {
    return {
      error: 'Укажите batch_id, store_flower_id, retail_product_id или bouquet_id.',
    }
  }
  const batchId = Number.parseInt(String(body.batch_id), 10)
  if (!Number.isFinite(batchId)) {
    return {
      error: 'Укажите batch_id, store_flower_id, retail_product_id или bouquet_id.',
    }
  }
  const batch = db.batches.find((b) => b.id === batchId && b.user_id === shopUid)
  if (!batch) return { error: 'Партия не найдена.' }
  if (qty > batch.quantity) return { error: 'Недостаточно цветов на партии.' }
  if (rq > (batch.realization_quantity || 0)) return { error: 'С реализации больше, чем доступно.' }
  batch.quantity -= qty
  if (rq > 0) batch.realization_quantity = Math.max(0, (batch.realization_quantity || 0) - rq)
  const t = db.taxons.find((x) => x.id === batch.taxon_id)
  const name = t ? (t.name_ru || t.name) : 'Партия'
  const uc = parseMoney(batch.unit_cost) ?? 0
  const fin = saleFinancials(uc, qty, unitPrice, rq, batch.sale_terms_fixed_price)
  return {
    snapshot: {
      line_kind: 'batch',
      batch_id: batchId,
      store_flower_id: batch.store_flower_id,
      retail_product_id: null,
      bouquet_id: null,
      taxon_id: batch.taxon_id,
      product_name: name,
      quantity: qty,
      unit_price: fin.unit_price,
      unit_cost: fin.unit_cost,
      realization_quantity: rq,
      product_total_amount: fin.product_total,
      total_amount: fin.product_total,
      delivery_service_id: null,
      delivery_service_name: '',
      pickup_at_store: false,
      delivery_price: '0.00',
      delivery_address: '',
      customer_phone: '',
      scheduled_at: '',
      payment_type: 'cash',
    },
  }
}

function parseShared(db: DemoDb, shopUid: number, body: Record<string, unknown>) {
  const pickup = body.pickup_at_store === true || body.pickup_at_store === 'true'
  let serviceId: number | null = null
  let serviceName = PICKUP_NAME
  let deliveryPrice = 0
  let address = ''
  if (!pickup) {
    serviceId = Number.parseInt(String(body.delivery_service_id), 10)
    const svc = db.deliveryServices.find((s) => s.id === serviceId && s.user_id === shopUid)
    if (!svc) return { error: 'Сервис доставки не найден.' }
    serviceName = svc.name
    deliveryPrice = parseMoney((svc as { city_delivery_price?: string }).city_delivery_price ?? svc.price) ?? 0
    address = String(body.delivery_address || '').trim()
    if (!address) return { error: 'Укажите адрес доставки.' }
  }
  const phone = parsePhone(body.customer_phone)
  if (!phone) return { error: 'Укажите телефон клиента (11 цифр, с 7).' }
  const scheduledRaw = body.scheduled_at
  const scheduled_at =
    scheduledRaw != null && String(scheduledRaw).trim()
      ? String(scheduledRaw)
      : new Date().toISOString()
  const payment_type = typeof body.payment_type === 'string' ? body.payment_type : 'cash'
  return { pickup, serviceId, serviceName, deliveryPrice, address, phone, scheduled_at, payment_type }
}

export function serializeCustomerOrderCare(order: DemoCustomerOrder) {
  const d = order.scheduled_at.slice(0, 10)
  const t = order.scheduled_at.includes('T') ? order.scheduled_at.slice(11, 16) : '00:00'
  return {
    id: order.id,
    kind: 'customer_order' as const,
    status: order.status,
    delivery_service_name: order.delivery_service_name,
    pickup_at_store: order.pickup_at_store,
    delivery_price: order.delivery_price,
    delivery_address: order.delivery_address,
    customer_phone: order.customer_phone,
    scheduled_at: order.scheduled_at,
    scheduled_date: d,
    scheduled_time: t,
    line_kind: order.line_kind,
    batch_id: order.batch_id,
    store_flower_id: order.store_flower_id,
    retail_product_id: order.retail_product_id,
    product_name: order.product_name,
    quantity: order.quantity,
    unit_price: order.unit_price,
    product_total_amount: order.product_total_amount,
    total_amount: order.total_amount,
    care_kind: 'pending_handoff' as const,
  }
}

export function listCustomerOrdersCare(db: DemoDb, shopUid: number, todayIso: string) {
  return db.customerOrders
    .filter((o) => o.user_id === shopUid && o.status === 'scheduled')
    .filter((o) => o.scheduled_at.slice(0, 10) === todayIso)
    .map((o) => serializeCustomerOrderCare(o))
}

export function createCustomerOrders(
  db: DemoDb,
  shopUid: number,
  body: Record<string, unknown>,
  nextId: () => number,
): { error?: string; status?: number; orders?: DemoCustomerOrder[] } {
  const shared = parseShared(db, shopUid, body)
  if ('error' in shared) return { error: shared.error }
  const linesRaw = body.lines
  if (!Array.isArray(linesRaw) || linesRaw.length < 1) {
    return { error: 'Укажите хотя бы одну позицию в lines.' }
  }
  const orders: DemoCustomerOrder[] = []
  for (let i = 0; i < linesRaw.length; i++) {
    const lineBody = linesRaw[i] as Record<string, unknown>
    const reserved = reserveLine(db, shopUid, lineBody)
    if (reserved.error) return { error: reserved.error }
    const snap = reserved.snapshot!
    const delivery = i === 0 ? shared.deliveryPrice : 0
    const productTotal = parseMoney(snap.product_total_amount) ?? 0
    const total = moneyStr(productTotal + delivery)
    const order: DemoCustomerOrder = {
      id: nextId(),
      user_id: shopUid,
      status: 'scheduled',
      delivery_service_id: shared.pickup ? null : shared.serviceId,
      delivery_service_name: shared.serviceName,
      pickup_at_store: shared.pickup,
      delivery_price: moneyStr(delivery),
      delivery_address: shared.address,
      customer_phone: shared.phone,
      scheduled_at: shared.scheduled_at,
      payment_type: shared.payment_type,
      line_kind: snap.line_kind,
      batch_id: snap.batch_id,
      store_flower_id: snap.store_flower_id,
      retail_product_id: snap.retail_product_id,
      bouquet_id: snap.bouquet_id,
      taxon_id: snap.taxon_id,
      product_name: snap.product_name,
      quantity: snap.quantity,
      unit_price: snap.unit_price,
      unit_cost: snap.unit_cost,
      realization_quantity: snap.realization_quantity,
      product_total_amount: snap.product_total_amount,
      total_amount: total,
    }
    db.customerOrders.push(order)
    orders.push(order)
  }
  return { status: 201, orders }
}

export function completeCustomerOrderHandoff(
  db: DemoDb,
  shopUid: number,
  orderId: number,
  nextId: () => number,
): { error?: string; order?: DemoCustomerOrder } {
  const order = db.customerOrders.find((o) => o.id === orderId && o.user_id === shopUid)
  if (!order) return { error: 'Заказ не найден.' }
  if (order.status !== 'scheduled') return { error: 'Заказ уже передан курьеру.' }
  const saleErr = completeOrderHandoff(db, shopUid, order, nextId)
  if (saleErr.error) return saleErr
  order.status = 'completed'
  order.completed_at = new Date().toISOString()
  return { order }
}
