import {
  buildExpensesPayload,
  completedOrdersDeliveryByDay,
  completedOrdersDeliveryTotal,
  parseReportPeriod,
} from './expensePeriod'
import { moneyStr, parseMoney } from './money'
import type { DemoDb, DemoFlowerSale, DemoUser } from './types'

function eachDayIso(start: string, end: string): string[] {
  const out: string[] = []
  const cur = new Date(`${start}T12:00:00.000Z`)
  const endDt = new Date(`${end}T12:00:00.000Z`)
  while (cur <= endDt) {
    out.push(cur.toISOString().slice(0, 10))
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return out
}

function num(raw: unknown): number {
  return parseMoney(raw) ?? 0
}

function marginPurchaseCost(unitCost: string, qty: number, rq: number): number {
  const uc = num(unitCost)
  const effective = Math.max(0, qty - Math.min(Math.max(0, rq), qty))
  return uc * effective
}

type LineAgg = {
  kind: string
  taxon_id?: number
  retail_product_id?: number
  bouquet_id?: number
  display_name: string
  latin_name: string
  qty: number
  rev: number
  cost: number
  supplier: number
  profit: number
}

function saleLineKey(s: DemoFlowerSale): string {
  if (s.line_kind === 'retail' && s.retail_product_id) return `retail:${s.retail_product_id}`
  if (s.line_kind === 'bouquet' || s.line_kind === 'custom_bouquet') {
    return `bouquet:${s.bouquet_name ?? s.display_name}`
  }
  return `taxon:${s.taxon_id}`
}

function seedLineAgg(db: DemoDb, s: DemoFlowerSale): LineAgg {
  const qty = s.quantity
  const rev = num(s.total_amount)
  const cost = marginPurchaseCost(s.unit_cost, qty, s.realization_quantity ?? 0)
  const supplier = num(s.supplier_payout ?? '0')
  const profit = num(s.shop_profit ?? '0')
  if (s.line_kind === 'retail' && s.retail_product_id) {
    const p = db.retailProducts.find((x) => x.id === s.retail_product_id)
    return {
      kind: 'retail',
      retail_product_id: s.retail_product_id,
      display_name: p?.name ?? s.display_name,
      latin_name: '',
      qty,
      rev,
      cost,
      supplier,
      profit,
    }
  }
  if (s.line_kind === 'bouquet' || s.line_kind === 'custom_bouquet') {
    return {
      kind: s.line_kind,
      display_name: s.bouquet_name ?? s.display_name,
      latin_name: '',
      qty,
      rev,
      cost,
      supplier,
      profit,
    }
  }
  const t = db.taxons.find((x) => x.id === s.taxon_id)
  const display = t ? (t.name_ru || t.name).trim() || t.name : s.display_name
  return {
    kind: 'flower',
    taxon_id: s.taxon_id,
    display_name: display,
    latin_name: t?.name ?? '',
    qty,
    rev,
    cost,
    supplier,
    profit,
  }
}

function serializeTaxonRow(a: LineAgg) {
  return {
    kind: a.kind as 'flower' | 'retail' | 'bouquet' | 'custom_bouquet',
    taxon_id: a.taxon_id,
    retail_product_id: a.retail_product_id,
    bouquet_id: undefined,
    display_name: a.display_name,
    latin_name: a.latin_name,
    quantity: a.qty,
    total_amount: moneyStr(a.rev),
    total_cost: moneyStr(a.cost),
    total_supplier_payout: moneyStr(a.supplier),
    total_profit: moneyStr(a.profit),
  }
}

export function buildSalesStatsRange(db: DemoDb, shopUid: number, user: DemoUser, search: URLSearchParams) {
  const { start_d, end_d, report_days } = parseReportPeriod(search, db.demoDay)
  const sales = db.sales.filter(
    (s) =>
      s.user_id === shopUid &&
      s.sold_at.slice(0, 10) >= start_d &&
      s.sold_at.slice(0, 10) <= end_d,
  )

  const deliveryByDay = completedOrdersDeliveryByDay(db, shopUid, start_d, end_d)
  const dayMaps = new Map<
    string,
    { qty: number; rev: number; cost: number; supplier: number; profit: number; n: number; delivery: number }
  >()
  const lineMap = new Map<string, LineAgg>()

  let periodQty = 0
  let periodRev = 0
  let periodCost = 0
  let periodSupplier = 0
  let periodProfit = 0
  let periodN = 0

  for (const s of sales) {
    const d = s.sold_at.slice(0, 10)
    const qty = s.quantity
    const rev = num(s.total_amount)
    const cost = marginPurchaseCost(s.unit_cost, qty, s.realization_quantity ?? 0)
    const supplier = num(s.supplier_payout ?? '0')
    const profit = num(s.shop_profit ?? '0')

    if (!dayMaps.has(d)) {
      dayMaps.set(d, { qty: 0, rev: 0, cost: 0, supplier: 0, profit: 0, n: 0, delivery: 0 })
    }
    const dm = dayMaps.get(d)!
    dm.qty += qty
    dm.rev += rev
    dm.cost += cost
    dm.supplier += supplier
    dm.profit += profit
    dm.n += 1

    periodQty += qty
    periodRev += rev
    periodCost += cost
    periodSupplier += supplier
    periodProfit += profit
    periodN += 1

    const key = saleLineKey(s)
    const seed = seedLineAgg(db, s)
    const cur = lineMap.get(key)
    if (!cur) lineMap.set(key, { ...seed })
    else {
      cur.qty += seed.qty
      cur.rev += seed.rev
      cur.cost += seed.cost
      cur.supplier += seed.supplier
      cur.profit += seed.profit
    }
  }

  for (const [date, delivery] of deliveryByDay) {
    if (!dayMaps.has(date)) {
      dayMaps.set(date, { qty: 0, rev: 0, cost: 0, supplier: 0, profit: 0, n: 0, delivery: 0 })
    }
    dayMaps.get(date)!.delivery += delivery
    periodRev += delivery
  }

  const periodDelivery = completedOrdersDeliveryTotal(db, shopUid, start_d, end_d)

  const by_day = eachDayIso(start_d, end_d).map((date) => {
    const dm = dayMaps.get(date)
    return {
      date,
      total_quantity: dm?.qty ?? 0,
      total_amount: moneyStr(dm?.rev ?? 0),
      total_cost: moneyStr(dm?.cost ?? 0),
      total_supplier_payout: moneyStr(dm?.supplier ?? 0),
      total_profit: moneyStr(dm?.profit ?? 0),
      total_delivery_amount: moneyStr(dm?.delivery ?? 0),
      sales_count: dm?.n ?? 0,
    }
  })

  const lines = [...lineMap.values()]
  const by_flowers = lines.filter((l) => l.kind === 'flower').map(serializeTaxonRow)
  const by_retail = lines.filter((l) => l.kind === 'retail').map(serializeTaxonRow)
  const by_bouquets = lines
    .filter((l) => l.kind === 'bouquet' || l.kind === 'custom_bouquet')
    .map(serializeTaxonRow)

  const expParams = new URLSearchParams({ from: start_d, to: end_d })
  const expApi = buildExpensesPayload(db, shopUid, user, expParams, false)
  const totalExpenses = num(expApi.summary.total)
  // Как backend stats_net_profit: выручка за период − расходы (не shop_profit − расходы).
  const netAfter = periodRev - totalExpenses

  const expenses = {
    total: moneyStr(totalExpenses),
    net_profit: moneyStr(netAfter),
    summary: expApi.summary,
    breakdown: {
      regular: expApi.summary.regular,
      mandatory: expApi.summary.mandatory,
      additional: expApi.summary.additional,
      goods: expApi.summary.goods,
      purchase: expApi.computed.purchase_total,
      purchase_flowers: expApi.computed.purchase_flowers_total,
      purchase_retail: expApi.computed.purchase_retail_total,
      purchase_consumables: expApi.computed.purchase_consumables_total,
      supplier_payout: expApi.computed.supplier_payout_total,
      delivery: expApi.computed.delivery_total,
      waste: expApi.computed.waste_cost_total,
      inventory_waste: expApi.computed.inventory_waste_total,
      manual_discard: expApi.computed.manual_discard_total,
      inventory_loss: expApi.computed.inventory_loss_total,
      acquiring: expApi.computed.acquiring,
      sbp_fee: expApi.computed.sbp_fee,
      tax: expApi.computed.tax,
    },
    sales_in_period: {
      revenue: expApi.sales.revenue,
      cost: expApi.sales.cost,
      profit: expApi.sales.profit,
      sales_count: expApi.sales.sales_count,
    },
  }

  return {
    days: report_days,
    from: start_d,
    to: end_d,
    by_day,
    totals: {
      total_quantity: periodQty,
      total_amount: moneyStr(periodRev),
      sales_revenue: moneyStr(periodRev),
      total_delivery_amount: moneyStr(periodDelivery),
      total_cost: moneyStr(periodCost),
      total_supplier_payout: moneyStr(periodSupplier),
      total_expenses: moneyStr(totalExpenses),
      total_profit: moneyStr(periodProfit),
      net_profit_after_expenses: moneyStr(netAfter),
      sales_count: periodN,
    },
    expenses,
    by_flowers,
    by_retail,
    by_bouquets,
  }
}
