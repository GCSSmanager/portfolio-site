import { photoUrlFromPath } from './demoAssetUrl'
import { moneyStr, parseMoney } from './money'
import type { DemoDb, DemoSupplierDelivery, DemoSupplierDeliveryLine } from './types'

const RANK_LABEL_RU: Record<string, string> = {
  family: 'Семейство',
  genus: 'Род',
  species: 'Вид',
  cultivar: 'Сорт',
}

function lineDisplay(db: DemoDb, ln: DemoSupplierDeliveryLine) {
  if (ln.retail_product_id != null) {
    const p = db.retailProducts.find((x) => x.id === ln.retail_product_id)
    return {
      stock_kind: 'retail' as const,
      display_name: p?.name ?? '—',
      latin_name: null as string | null,
      rank_label: 'Товар',
      photo_url: photoUrlFromPath(p?.photo_path ?? null),
    }
  }
  const sf = ln.store_flower_id
    ? db.storeFlowers.find((s) => s.id === ln.store_flower_id)
    : null
  const tid = sf?.taxon_id ?? ln.taxon_id
  const t = tid ? db.taxons.find((x) => x.id === tid) : null
  return {
    stock_kind: 'flower' as const,
    display_name: t ? (t.name_ru || t.name) : '—',
    latin_name: t?.name ?? null,
    rank_label: t ? (RANK_LABEL_RU[t.rank] ?? t.rank) : '',
    photo_url: photoUrlFromPath(sf?.photo_path ?? null),
  }
}

export function serializeSupplierDeliveryCare(db: DemoDb, d: DemoSupplierDelivery, todayIso: string) {
  if (d.status !== 'pending') return null
  if (d.expected_arrival_date > todayIso) return null
  const supplier = db.suppliers.find((s) => s.id === d.supplier_id)
  const lines = db.supplierDeliveryLines
    .filter((ln) => ln.delivery_id === d.id)
    .map((ln) => {
      const meta = lineDisplay(db, ln)
      return {
        id: ln.id,
        store_flower_id: ln.store_flower_id,
        taxon_id: ln.taxon_id,
        display_name: meta.display_name,
        latin_name: meta.latin_name,
        rank_label: meta.rank_label,
        quantity: ln.quantity,
        unit_purchase_price: ln.unit_purchase_price,
        realization_quantity: ln.realization_quantity,
        sale_terms_fixed_price: ln.sale_terms_fixed_price,
        received_quantity: ln.received_quantity ?? undefined,
        defect_quantity: ln.defect_quantity > 0 ? ln.defect_quantity : undefined,
      }
    })
  return {
    id: d.id,
    kind: 'supplier_delivery' as const,
    supplier_id: d.supplier_id,
    supplier_name: supplier?.name ?? '—',
    expected_arrival_date: d.expected_arrival_date,
    lines,
    care_kind: 'pending_receive' as const,
  }
}

export function listSupplierDeliveriesCare(db: DemoDb, shopUid: number, todayIso: string) {
  const out: NonNullable<ReturnType<typeof serializeSupplierDeliveryCare>>[] = []
  for (const d of db.supplierDeliveries) {
    if (d.user_id !== shopUid) continue
    const row = serializeSupplierDeliveryCare(db, d, todayIso)
    if (row) out.push(row)
  }
  return out
}

export function createSupplierDelivery(
  db: DemoDb,
  shopUid: number,
  body: Record<string, unknown>,
  nextId: () => number,
): { error?: string; status?: number; payload?: unknown } {
  const supplierId = Number.parseInt(String(body.supplier_id), 10)
  if (!Number.isFinite(supplierId)) return { error: 'Укажите supplier_id.' }
  const supplier = db.suppliers.find((s) => s.id === supplierId && s.user_id === shopUid)
  if (!supplier) return { error: 'Поставщик не найден.', status: 404 }
  const dateRaw = String(body.expected_arrival_date || '').trim().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
    return { error: 'Укажите expected_arrival_date (YYYY-MM-DD).' }
  }
  const rawLines = body.lines
  if (!Array.isArray(rawLines) || rawLines.length < 1) {
    return {
      error:
        'Передайте непустой массив lines: [{store_flower_id, quantity, unit_purchase_price?}, …].',
    }
  }
  const deliveryId = nextId()
  db.supplierDeliveries.push({
    id: deliveryId,
    user_id: shopUid,
    supplier_id: supplierId,
    expected_arrival_date: dateRaw,
    status: 'pending',
  })
  for (let i = 0; i < rawLines.length; i++) {
    const row = rawLines[i] as Record<string, unknown>
    const qty = Number.parseInt(String(row.quantity), 10)
    if (!Number.isFinite(qty) || qty < 1) {
      return { error: `Строка ${i + 1}: quantity должно быть не меньше 1.` }
    }
    const rpId = row.retail_product_id != null ? Number.parseInt(String(row.retail_product_id), 10) : null
    if (rpId != null && Number.isFinite(rpId)) {
      const p = db.retailProducts.find((x) => x.id === rpId && x.user_id === shopUid)
      if (!p) return { error: `Строка ${i + 1}: товар не найден.`, status: 404 }
      const price = parseMoney(row.unit_purchase_price) ?? 0
      const rq = Number.parseInt(String(row.realization_quantity ?? 0), 10)
      db.supplierDeliveryLines.push({
        id: nextId(),
        delivery_id: deliveryId,
        store_flower_id: null,
        taxon_id: null,
        retail_product_id: rpId,
        quantity: qty,
        unit_purchase_price: moneyStr(price),
        realization_quantity: Number.isFinite(rq) && rq > 0 ? rq : 0,
        sale_terms_fixed_price:
          typeof row.sale_terms_fixed_price === 'string' ? row.sale_terms_fixed_price : null,
        received_quantity: null,
        defect_quantity: 0,
      })
      continue
    }
    const sfId =
      row.store_flower_id != null ? Number.parseInt(String(row.store_flower_id), 10) : null
    const sf = sfId
      ? db.storeFlowers.find((s) => s.id === sfId && s.user_id === shopUid)
      : null
    if (!sf) return { error: `Строка ${i + 1}: цветок магазина не найден.`, status: 404 }
    const offer = db.supplierOffers.find(
      (o) => o.supplier_id === supplierId && o.store_flower_id === sf.id,
    )
    const price = parseMoney(row.unit_purchase_price) ?? parseMoney(offer?.unit_purchase_price) ?? 0
    const rq = Number.parseInt(String(row.realization_quantity ?? 0), 10)
    db.supplierDeliveryLines.push({
      id: nextId(),
      delivery_id: deliveryId,
      store_flower_id: sf.id,
      taxon_id: sf.taxon_id,
      retail_product_id: null,
      quantity: qty,
      unit_purchase_price: moneyStr(price),
      realization_quantity: Number.isFinite(rq) && rq > 0 ? rq : 0,
      sale_terms_fixed_price:
        typeof row.sale_terms_fixed_price === 'string' ? row.sale_terms_fixed_price : null,
      received_quantity: null,
      defect_quantity: 0,
    })
  }
  return {
    status: 201,
    payload: { id: deliveryId, supplier_id: supplierId, expected_arrival_date: dateRaw },
  }
}

export function receiveSupplierDelivery(
  db: DemoDb,
  shopUid: number,
  deliveryId: number,
  body: Record<string, unknown>,
  nextId: () => number,
): { error?: string } {
  const d = db.supplierDeliveries.find((x) => x.id === deliveryId && x.user_id === shopUid)
  if (!d) return { error: 'Поставка не найдена.' }
  if (d.status !== 'pending') return { error: 'Поставка уже принята.' }
  const lines = db.supplierDeliveryLines.filter((ln) => ln.delivery_id === deliveryId)
  const rawLines = body.lines
  const now = new Date().toISOString()
  const receipts: Array<{ line: DemoSupplierDeliveryLine; received: number; defect: number }> = []

  if (rawLines == null) {
    for (const ln of lines) receipts.push({ line: ln, received: ln.quantity, defect: 0 })
  } else {
    if (!Array.isArray(rawLines) || rawLines.length !== lines.length) {
      return { error: 'Укажите количества для каждой строки поставки.' }
    }
    const byId = new Map(lines.map((ln) => [ln.id, ln]))
    for (let i = 0; i < rawLines.length; i++) {
      const row = rawLines[i] as Record<string, unknown>
      const lineId = Number.parseInt(String(row.line_id), 10)
      const ln = byId.get(lineId)
      if (!ln) return { error: `Строка ${i + 1}: позиция поставки не найдена.` }
      const received = Number.parseInt(String(row.received ?? row.received_quantity ?? -1), 10)
      const defect = Number.parseInt(String(row.defect ?? row.defect_quantity ?? 0), 10)
      if (!Number.isFinite(received) || received < 0 || defect < 0 || defect > received) {
        return { error: `Строка ${i + 1}: некорректные received/defect.` }
      }
      receipts.push({ line: ln, received, defect })
    }
  }

  for (const { line: ln, received, defect } of receipts) {
    ln.received_quantity = received
    ln.defect_quantity = defect
    const good = Math.max(0, received - defect)
    if (good <= 0) continue
    if (ln.retail_product_id != null) {
      const p = db.retailProducts.find((x) => x.id === ln.retail_product_id && x.user_id === shopUid)
      if (p) {
        p.quantity += good
        if (ln.realization_quantity > 0) {
          p.realization_quantity = (p.realization_quantity || 0) + ln.realization_quantity
        }
        p.unit_cost = ln.unit_purchase_price
      }
      continue
    }
    const sfId = ln.store_flower_id
    if (!sfId) continue
    db.batches.push({
      id: nextId(),
      user_id: shopUid,
      store_flower_id: sfId,
      taxon_id: ln.taxon_id ?? 0,
      quantity: good,
      received_at: now,
      last_trim_at: null,
      last_water_change_at: null,
      intake_pending: true,
      unit_cost: ln.unit_purchase_price,
      realization_quantity: ln.realization_quantity,
      sale_terms_fixed_price: ln.sale_terms_fixed_price,
    })
    let care = db.basicCare.find((c) => c.store_flower_id === sfId)
    if (!care) {
      care = {
        id: nextId(),
        user_id: shopUid,
        store_flower_id: sfId,
        intake_pending: true,
        last_trim_at: null,
        last_water_change_at: null,
      }
      db.basicCare.push(care)
    } else care.intake_pending = true
  }
  d.status = 'received'
  return {}
}
