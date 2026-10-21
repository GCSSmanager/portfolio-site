import { completedOrdersDeliveryTotal, parseReportPeriod } from './expensePeriod'
import { moneyStr, parseMoney } from './money'
import type { DemoDb, DemoFlowerSale } from './types'

const PAYMENT_LABEL: Record<string, string> = {
  card: 'Карта',
  sbp: 'СБП',
  cash: 'Наличные',
  transfer: 'Перевод',
}

const KIND_LABEL: Record<DemoFlowerSale['line_kind'], string> = {
  flower: 'Цветы',
  retail: 'Товар',
  bouquet: 'Букет',
  custom_bouquet: 'Букет на заказ',
}

function paymentLabel(code: string): string {
  return PAYMENT_LABEL[code] ?? code
}

function saleInPeriod(s: DemoFlowerSale, start_d: string, end_d: string): boolean {
  const day = s.sold_at.slice(0, 10)
  return day >= start_d && day <= end_d
}

function toHistoryRow(s: DemoFlowerSale, includeFinancials: boolean) {
  const rq = Math.max(0, s.realization_quantity ?? 0)
  const kind = s.line_kind
  const displayName =
    kind === 'bouquet' || kind === 'custom_bouquet'
      ? (s.bouquet_name ?? s.display_name)
      : s.display_name
  const row: Record<string, unknown> = {
    id: s.id,
    kind,
    kind_label: KIND_LABEL[kind] ?? kind,
    sold_at: s.sold_at,
    display_name: displayName,
    quantity: s.quantity,
    unit_price: moneyStr(s.unit_price),
    total_amount: moneyStr(s.total_amount),
    payment_type: s.payment_type,
    payment_label: paymentLabel(s.payment_type),
    realization_quantity: rq,
    has_realization: rq > 0,
    has_delivery: false,
  }
  if (kind === 'flower') {
    row.batch_id = s.batch_id
    row.store_flower_id = s.store_flower_id
  }
  if (kind === 'retail' && s.retail_product_id != null) {
    row.retail_product_id = s.retail_product_id
  }
  if (kind === 'bouquet' || kind === 'custom_bouquet') {
    row.is_custom_bouquet = kind === 'custom_bouquet'
  }
  if (includeFinancials) {
    row.unit_cost = moneyStr(s.unit_cost)
    row.shop_profit = moneyStr(s.shop_profit)
    row.supplier_payout = moneyStr(s.supplier_payout)
  }
  return row
}

/** История продаж за период — форма как `list_sales_history` на Django. */
export function listSalesHistory(
  db: DemoDb,
  shopUid: number,
  search: URLSearchParams,
  includeFinancials: boolean,
) {
  const { start_d, end_d, report_days } = parseReportPeriod(search, db.demoDay)
  const history = db.sales
    .filter((s) => s.user_id === shopUid && saleInPeriod(s, start_d, end_d))
    .map((s) => toHistoryRow(s, includeFinancials))
    .sort((a, b) => String(b.sold_at).localeCompare(String(a.sold_at)))

  let totalAmount = 0
  let totalQuantity = 0
  for (const row of history) {
    totalAmount += parseMoney(row.total_amount) ?? 0
    totalQuantity += Number(row.quantity) || 0
  }

  const deliveryAmount = completedOrdersDeliveryTotal(db, shopUid, start_d, end_d)

  return {
    report_days,
    period: { from: start_d, to: end_d },
    history,
    totals: {
      sales_count: history.length,
      total_quantity: totalQuantity,
      total_amount: moneyStr(totalAmount),
      delivery_count: history.filter((r) => r.has_delivery).length,
      delivery_amount: moneyStr(deliveryAmount),
    },
  }
}
