import { addCalendarDaysLocal, calendarDayFromDate, parseCalendarDay } from './calendarDay'
import { intakePurchasesForPeriod } from './intakePurchases'
import { manualDiscardCostForPeriod } from './stockDiscard'
import type { DemoDb, DemoExpense, DemoUser } from './types'
import { decAdd, moneyStr, parseMoney } from './money'

const PERIOD_CHOICES = [
  { value: 'monthly', label: 'Каждый месяц' },
  { value: 'weekly', label: 'Каждую неделю' },
  { value: 'quarterly', label: 'Каждый квартал' },
  { value: 'yearly', label: 'Раз в год' },
  { value: 'utilities', label: 'Коммуналка (по счётчикам)' },
] as const

function parseIsoDate(iso: string): Date {
  return parseCalendarDay(iso)
}

function isoDay(d: Date): string {
  return calendarDayFromDate(d)
}

export function parseReportPeriod(
  search: URLSearchParams,
  todayIso: string,
): { start_d: string; end_d: string; report_days: number } {
  const fromRaw = (search.get('from') || '').trim()
  const toRaw = (search.get('to') || '').trim()
  const maxDays = 365

  if (fromRaw && toRaw) {
    let start = fromRaw.slice(0, 10)
    let end = toRaw.slice(0, 10)
    if (start > end) [start, end] = [end, start]
    if (end > todayIso) end = todayIso
    if (start > todayIso) start = todayIso
    let span =
      Math.round((parseIsoDate(end).getTime() - parseIsoDate(start).getTime()) / 86_400_000) + 1
    if (span > maxDays) {
      start = addCalendarDaysLocal(end, -(maxDays - 1))
      span = maxDays
    }
    return { start_d: start, end_d: end, report_days: span }
  }

  let days = Number.parseInt(search.get('days') || '14', 10)
  if (!Number.isFinite(days)) days = 14
  days = Math.max(1, Math.min(days, maxDays))
  const end_d = todayIso
  const start_d = addCalendarDaysLocal(end_d, -(days - 1))
  return { start_d, end_d, report_days: days }
}

function daysInclusive(start_d: string, end_d: string): number {
  const a = parseIsoDate(start_d).getTime()
  const b = parseIsoDate(end_d).getTime()
  return Math.max(0, Math.round((b - a) / 86_400_000) + 1)
}

function monthRange(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

function allocateRegular(amount: number, periodCode: string, start_d: string, end_d: string): number {
  const days = daysInclusive(start_d, end_d)
  if (days <= 0) return 0
  const code = periodCode || 'monthly'
  if (code === 'monthly' || code === 'utilities') {
    let sum = 0
    const start = parseIsoDate(start_d)
    const end = parseIsoDate(end_d)
    let y = start.getUTCFullYear()
    let m = start.getUTCMonth() + 1
    while (true) {
      const dim = monthRange(y, m)
      const monthStart = `${y}-${String(m).padStart(2, '0')}-01`
      const monthEnd = `${y}-${String(m).padStart(2, '0')}-${String(dim).padStart(2, '0')}`
      const lo = monthStart < start_d ? start_d : monthStart
      const hi = monthEnd > end_d ? end_d : monthEnd
      if (lo <= hi) {
        const ov =
          Math.round((parseIsoDate(hi).getTime() - parseIsoDate(lo).getTime()) / 86_400_000) + 1
        sum += amount * (ov / dim)
      }
      if (y === end.getUTCFullYear() && m === end.getUTCMonth() + 1) break
      m += 1
      if (m > 12) {
        m = 1
        y += 1
      }
    }
    return Math.round(sum * 100) / 100
  }
  if (code === 'weekly') return Math.round(((amount * days) / 7) * 100) / 100
  if (code === 'yearly') return Math.round(((amount * days) / 365.25) * 100) / 100
  if (code === 'quarterly') {
    let total = 0
    const seen = new Set<string>()
    let cursor = start_d
    while (cursor <= end_d) {
      const [qStart, qEnd] = periodBounds('quarterly', cursor)
      const dt = parseIsoDate(cursor)
      const q = Math.floor(dt.getUTCMonth() / 3)
      const key = `${dt.getUTCFullYear()}-Q${q}`
      if (!seen.has(key)) {
        seen.add(key)
        const lo = qStart < start_d ? start_d : qStart
        const hi = qEnd > end_d ? end_d : qEnd
        const qDays =
          Math.round((parseIsoDate(qEnd).getTime() - parseIsoDate(qStart).getTime()) / 86_400_000) +
          1
        const ov =
          Math.round((parseIsoDate(hi).getTime() - parseIsoDate(lo).getTime()) / 86_400_000) + 1
        total += amount * (ov / qDays)
      }
      const next = parseIsoDate(qEnd)
      next.setUTCDate(next.getUTCDate() + 1)
      cursor = isoDay(next)
    }
    return Math.round(total * 100) / 100
  }
  return allocateRegular(amount, 'monthly', start_d, end_d)
}

function periodBounds(periodCode: string, refIso: string): [string, string] {
  const ref = parseIsoDate(refIso)
  const y = ref.getFullYear()
  const m = ref.getMonth() + 1
  const code = periodCode || 'monthly'
  if (code === 'weekly') {
    const day = ref.getDay()
    const mondayOffset = day === 0 ? -6 : 1 - day
    const start = new Date(ref)
    start.setDate(start.getDate() + mondayOffset)
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    return [isoDay(start), isoDay(end)]
  }
  if (code === 'quarterly') {
    const q = Math.floor((m - 1) / 3)
    const m0 = q * 3 + 1
    const start = `${y}-${String(m0).padStart(2, '0')}-01`
    let end: string
    if (m0 === 10) end = `${y}-12-31`
    else {
      const endM = m0 + 3
      const dim = monthRange(y, endM)
      end = `${y}-${String(endM).padStart(2, '0')}-${String(dim).padStart(2, '0')}`
    }
    return [start, end]
  }
  if (code === 'yearly') return [`${y}-01-01`, `${y}-12-31`]
  const dim = monthRange(y, m)
  return [`${y}-${String(m).padStart(2, '0')}-01`, `${y}-${String(m).padStart(2, '0')}-${String(dim).padStart(2, '0')}`]
}

function dueDateForPeriod(dueDay: number, periodCode: string, refIso: string): string {
  const code = periodCode || 'monthly'
  const [start, end] = periodBounds(code, refIso)
  if (code === 'weekly') {
    const target = Math.max(1, Math.min(7, dueDay))
    const startDt = parseIsoDate(start)
    const startWd = startDt.getDay() === 0 ? 7 : startDt.getDay()
    let offset = target - startWd
    if (offset < 0) offset += 7
    const due = new Date(startDt)
    due.setDate(due.getDate() + offset)
    const dueIso = isoDay(due)
    return dueIso > end ? end : dueIso
  }
  const startDt = parseIsoDate(start)
  const y = startDt.getFullYear()
  const m = startDt.getMonth() + 1
  const dim = monthRange(y, m)
  const day = Math.max(1, Math.min(28, dueDay))
  let due = `${y}-${String(m).padStart(2, '0')}-${String(Math.min(day, dim)).padStart(2, '0')}`
  if (due < start) due = start
  if (due > end) due = end
  return due
}

function hasPaymentInPeriod(db: DemoDb, expenseId: number, start_d: string, end_d: string): boolean {
  return db.expensePayments.some(
    (p) => p.expense_id === expenseId && p.paid_at.slice(0, 10) >= start_d && p.paid_at.slice(0, 10) <= end_d,
  )
}

const PERIOD_LABELS: Record<string, string> = {
  monthly: 'Каждый месяц',
  weekly: 'Каждую неделю',
  quarterly: 'Каждый квартал',
  yearly: 'Раз в год',
  utilities: 'Коммуналка (по счётчикам)',
}

function isRegularPaymentDue(db: DemoDb, expense: DemoExpense, todayIso: string): boolean {
  const [start, end] = periodBounds(expense.period || 'monthly', todayIso)
  const due = dueDateForPeriod(expense.due_day || 1, expense.period || 'monthly', todayIso)
  const paid = hasPaymentInPeriod(db, expense.id, start, end)
  return expense.category === 'regular' && todayIso === due && !paid
}

export function expensePaymentTasksForUser(db: DemoDb, shopUid: number, todayIso: string) {
  const out: Array<{
    expense_id: number
    name: string
    amount_rub: string
    variable_amount: boolean
    due_day: number
    due_date: string
    period: string
    period_label: string
  }> = []
  for (const e of db.expenses.filter((x) => x.user_id === shopUid && x.category === 'regular')) {
    if (!isRegularPaymentDue(db, e, todayIso)) continue
    const periodCode = e.period || 'monthly'
    const due = dueDateForPeriod(e.due_day || 1, periodCode, todayIso)
    const variable = periodCode === 'utilities'
    out.push({
      expense_id: e.id,
      name: e.name,
      amount_rub: variable ? '' : moneyStr(e.amount_rub),
      variable_amount: variable,
      due_day: e.due_day || 1,
      due_date: due,
      period: periodCode,
      period_label: PERIOD_LABELS[periodCode] ?? periodCode,
    })
  }
  return out
}

export function completedOrdersDeliveryTotal(
  db: DemoDb,
  shopUid: number,
  start_d: string,
  end_d: string,
): number {
  let total = 0
  for (const o of db.customerOrders) {
    if (o.user_id !== shopUid || o.status !== 'completed') continue
    const completed = (o.completed_at ?? o.scheduled_at).slice(0, 10)
    if (completed < start_d || completed > end_d) continue
    total = decAdd(total, parseFloat(o.delivery_price || '0'))
  }
  return total
}

export function completedOrdersDeliveryByDay(
  db: DemoDb,
  shopUid: number,
  start_d: string,
  end_d: string,
): Map<string, number> {
  const map = new Map<string, number>()
  for (const o of db.customerOrders) {
    if (o.user_id !== shopUid || o.status !== 'completed') continue
    const d = (o.completed_at ?? o.scheduled_at).slice(0, 10)
    if (d < start_d || d > end_d) continue
    const amt = parseFloat(o.delivery_price || '0')
    map.set(d, decAdd(map.get(d) ?? 0, amt))
  }
  return map
}

function allocateUtilitiesPayments(
  db: DemoDb,
  expenseId: number,
  start_d: string,
  end_d: string,
): number {
  let total = 0
  for (const p of db.expensePayments) {
    if (p.expense_id !== expenseId) continue
    if (p.paid_at >= start_d && p.paid_at <= end_d) total = decAdd(total, parseFloat(p.amount_rub))
  }
  return total
}

function salesTotals(db: DemoDb, shopUid: number, start_d: string, end_d: string) {
  let revenue = 0
  let cost = 0
  let supplier = 0
  let profit = 0
  let sales_count = 0
  const byPayment: Record<string, number> = {}
  for (const s of db.sales) {
    if (s.user_id !== shopUid) continue
    const d = s.sold_at.slice(0, 10)
    if (d < start_d || d > end_d) continue
    revenue = decAdd(revenue, parseFloat(s.total_amount))
    cost = decAdd(cost, parseFloat(s.unit_cost) * s.quantity)
    supplier = decAdd(supplier, parseFloat(s.supplier_payout))
    profit = decAdd(profit, parseFloat(s.shop_profit))
    sales_count += 1
    const pt = s.payment_type || 'card'
    byPayment[pt] = decAdd(byPayment[pt] ?? 0, parseFloat(s.total_amount))
  }
  return { revenue, cost, supplier, profit, sales_count, byPayment }
}

function paymentFees(user: DemoUser, byPayment: Record<string, number>) {
  const acqPct = parseFloat(user.acquiring_rate_pct || '1.80')
  const sbpPct = parseFloat(user.sbp_commission_rate_pct || '0.70')
  const taxPct = parseFloat(user.tax_rate_pct || '6.00')
  const card = decAdd(byPayment.card ?? 0, byPayment.transfer ?? 0)
  const sbp = byPayment.sbp ?? 0
  const cash = byPayment.cash ?? 0
  const acquiring = Math.round(((card * acqPct) / 100) * 100) / 100
  const sbp_fee = Math.round(((sbp * sbpPct) / 100) * 100) / 100
  const taxable = decAdd(decAdd(card, sbp), cash)
  const tax = Math.round(((taxable * taxPct) / 100) * 100) / 100
  return { acquiring, sbp_fee, tax }
}

function inventoryCostsInPeriod(
  db: DemoDb,
  shopUid: number,
  start_d: string,
  end_d: string,
): { waste: number; loss: number } {
  let waste = 0
  let loss = 0
  for (const inv of db.inventories) {
    if (inv.user_id !== shopUid) continue
    const completed = inv.completed_at.slice(0, 10)
    if (completed < start_d || completed > end_d) continue
    for (const ln of inv.lines) {
      const uc = unitCostForLine(db, ln)
      const w = ln.waste_quantity
      if (w > 0) waste = decAdd(waste, uc * w)
      const system = ln.system_quantity
      const counted = ln.counted_quantity
      if (system > counted) loss = decAdd(loss, uc * (system - counted))
    }
  }
  return { waste: Math.round(waste * 100) / 100, loss: Math.round(loss * 100) / 100 }
}

function unitCostForLine(
  db: DemoDb,
  ln: DemoDb['inventories'][number]['lines'][number],
): number {
  if (ln.flower_batch_id) {
    const b = db.batches.find((x) => x.id === ln.flower_batch_id)
    if (b) return parseFloat(b.unit_cost)
  }
  if (ln.store_flower_id) {
    const batches = db.batches.filter((b) => b.store_flower_id === ln.store_flower_id && b.quantity > 0)
    if (batches.length) {
      let q = 0
      let t = 0
      for (const b of batches) {
        q += b.quantity
        t += parseFloat(b.unit_cost) * b.quantity
      }
      return q ? Math.round((t / q) * 100) / 100 : 0
    }
  }
  if (ln.retail_product_id) {
    const p = db.retailProducts.find((x) => x.id === ln.retail_product_id)
    if (p) return parseFloat(p.unit_cost)
  }
  if (ln.bouquet_id) {
    const b = db.bouquets.find((x) => x.id === ln.bouquet_id)
    if (b?.unit_price) return parseFloat(b.unit_price) * 0.5
  }
  return 0
}

function serializePayment(p: DemoDb['expensePayments'][number]) {
  return { id: p.id, paid_at: p.paid_at, amount_rub: moneyStr(p.amount_rub) }
}

function serializeExpenseRow(
  db: DemoDb,
  e: DemoExpense,
  todayIso: string,
  start_d: string,
  end_d: string,
) {
  const period_code = e.period || 'monthly'
  const row: Record<string, unknown> = {
    id: e.id,
    category: e.category,
    name: e.name,
    amount_rub: moneyStr(e.amount_rub),
    period: period_code,
    expense_date: e.expense_date,
    sort_order: e.sort_order,
  }
  if (e.category === 'regular') {
    const variable = period_code === 'utilities'
    row.variable_amount = variable
    row.due_day = e.due_day ?? 1
    const [pStart, pEnd] = periodBounds(period_code, todayIso)
    const due = dueDateForPeriod(e.due_day ?? 1, period_code, todayIso)
    const paid = hasPaymentInPeriod(db, e.id, pStart, pEnd)
    row.due_date = due
    row.paid_in_period = paid
    row.can_record_payment = todayIso === due && !paid
    row.payment_due = row.can_record_payment
    const allocated =
      period_code === 'utilities'
        ? allocateUtilitiesPayments(db, e.id, start_d, end_d)
        : allocateRegular(parseFloat(e.amount_rub), period_code, start_d, end_d)
    row.allocated_rub = moneyStr(allocated)
    const pays = db.expensePayments
      .filter((p) => p.expense_id === e.id)
      .sort((a, b) => b.paid_at.localeCompare(a.paid_at) || b.id - a.id)
      .slice(0, 20)
    row.payments = pays.map(serializePayment)
  }
  return row
}

export function buildExpensesPayload(
  db: DemoDb,
  shopUid: number,
  user: DemoUser,
  search: URLSearchParams,
  floristRestricted: boolean,
) {
  const todayIso = db.demoDay
  const { start_d, end_d, report_days } = parseReportPeriod(search, todayIso)

  if (floristRestricted) {
    const additional = db.expenses
      .filter(
        (e) =>
          e.user_id === shopUid &&
          e.category === 'additional' &&
          e.expense_date &&
          e.expense_date >= start_d &&
          e.expense_date <= end_d,
      )
      .map((e) => serializeExpenseRow(db, e, todayIso, start_d, end_d))
    const addSum = additional.reduce((a, e) => a + parseFloat(String(e.amount_rub)), 0)
    return {
      report_days,
      period: { from: start_d, to: end_d },
      rates: {
        acquiring_pct: moneyStr(user.acquiring_rate_pct),
        sbp_commission_pct: moneyStr(user.sbp_commission_rate_pct),
        tax_pct: moneyStr(user.tax_rate_pct),
      },
      period_choices: [...PERIOD_CHOICES],
      sales: { revenue: '0.00', cost: '0.00', profit: '0.00', sales_count: 0 },
      computed: {
        acquiring: '0.00',
        sbp_fee: '0.00',
        tax: '0.00',
        mandatory_total: '0.00',
        purchase_total: '0.00',
        purchase_flowers_total: '0.00',
        purchase_retail_total: '0.00',
        purchase_consumables_total: '0.00',
        supplier_payout_total: '0.00',
        delivery_total: '0.00',
        waste_cost_total: '0.00',
        inventory_waste_total: '0.00',
        manual_discard_total: '0.00',
        inventory_loss_total: '0.00',
        goods_total: '0.00',
      },
      expenses: additional,
      summary: {
        regular: '0.00',
        mandatory: '0.00',
        goods: '0.00',
        additional: moneyStr(addSum),
        total: moneyStr(addSum),
        independent: '0.00',
        purchase: '0.00',
      },
    }
  }

  const st = salesTotals(db, shopUid, start_d, end_d)
  const deliveryTotal = completedOrdersDeliveryTotal(db, shopUid, start_d, end_d)
  const intake = intakePurchasesForPeriod(db, shopUid, start_d, end_d)
  const fees = paymentFees(user, st.byPayment)
  const inv = inventoryCostsInPeriod(db, shopUid, start_d, end_d)
  const invWaste = inv.waste
  const manualDiscard = manualDiscardCostForPeriod(db, shopUid, start_d, end_d)
  const waste = decAdd(invWaste, manualDiscard)
  const invLoss = inv.loss

  let regularAlloc = 0
  const regRows = db.expenses
    .filter((e) => e.user_id === shopUid && e.category === 'regular')
    .sort((a, b) => a.sort_order - b.sort_order)
  for (const e of regRows) {
    const code = e.period || 'monthly'
    if (code === 'utilities') regularAlloc = decAdd(regularAlloc, allocateUtilitiesPayments(db, e.id, start_d, end_d))
    else regularAlloc = decAdd(regularAlloc, allocateRegular(parseFloat(e.amount_rub), code, start_d, end_d))
  }

  const addRows = db.expenses.filter(
    (e) =>
      e.user_id === shopUid &&
      e.category === 'additional' &&
      e.expense_date &&
      e.expense_date >= start_d &&
      e.expense_date <= end_d,
  )
  const additional = addRows.reduce((a, e) => decAdd(a, parseFloat(e.amount_rub)), 0)

  const mandatory = decAdd(decAdd(fees.acquiring, fees.sbp_fee), fees.tax)
  const purchase = intake.purchase
  const goods = decAdd(
    decAdd(
      decAdd(decAdd(decAdd(purchase, st.cost), st.supplier), deliveryTotal),
      waste,
    ),
    invLoss,
  )
  const total = decAdd(decAdd(decAdd(regularAlloc, mandatory), goods), additional)

  const expenses = [
    ...regRows.map((e) => serializeExpenseRow(db, e, todayIso, start_d, end_d)),
    ...addRows.map((e) => serializeExpenseRow(db, e, todayIso, start_d, end_d)),
  ]

  return {
    report_days,
    period: { from: start_d, to: end_d },
    rates: {
      acquiring_pct: moneyStr(user.acquiring_rate_pct),
      sbp_commission_pct: moneyStr(user.sbp_commission_rate_pct),
      tax_pct: moneyStr(user.tax_rate_pct),
    },
    period_choices: [...PERIOD_CHOICES],
    sales: {
      revenue: moneyStr(st.revenue),
      cost: moneyStr(st.cost),
      profit: moneyStr(st.profit),
      sales_count: st.sales_count,
    },
    computed: {
      acquiring: moneyStr(fees.acquiring),
      sbp_fee: moneyStr(fees.sbp_fee),
      tax: moneyStr(fees.tax),
      mandatory_total: moneyStr(mandatory),
      purchase_total: moneyStr(purchase),
      purchase_flowers_total: moneyStr(intake.purchase_flowers),
      purchase_retail_total: moneyStr(intake.purchase_retail),
      purchase_consumables_total: moneyStr(intake.purchase_consumables),
      supplier_payout_total: moneyStr(st.supplier),
      delivery_total: moneyStr(deliveryTotal),
      waste_cost_total: moneyStr(waste),
      inventory_waste_total: moneyStr(invWaste),
      manual_discard_total: moneyStr(manualDiscard),
      inventory_loss_total: moneyStr(invLoss),
      goods_total: moneyStr(goods),
    },
    expenses,
    summary: {
      regular: moneyStr(regularAlloc),
      mandatory: moneyStr(mandatory),
      goods: moneyStr(goods),
      additional: moneyStr(additional),
      total: moneyStr(total),
      independent: moneyStr(mandatory),
      purchase: moneyStr(purchase),
    },
  }
}

export function createExpense(
  db: DemoDb,
  shopUid: number,
  body: Record<string, unknown>,
  floristRestricted: boolean,
  newId: number,
): { error?: string; expense?: DemoExpense } {
  const cat = body.category
  if (cat !== 'regular' && cat !== 'additional') {
    return { error: 'Добавлять можно только регулярные и дополнительные статьи.' }
  }
  if (floristRestricted && cat !== 'additional') {
    return { error: 'Флорист может добавлять только дополнительные расходы.' }
  }
  const name = String(body.name || '').trim()
  if (!name) return { error: 'Укажите название.' }
  const period = String(body.period || 'monthly').trim()
  const allowed = new Set(PERIOD_CHOICES.map((c) => c.value))
  if (cat === 'regular' && !allowed.has(period as (typeof PERIOD_CHOICES)[number]['value'])) {
    return { error: 'Выберите период из списка.' }
  }
  const utilities = cat === 'regular' && period === 'utilities'
  let amt = parseMoney(body.amount_rub)
  if (utilities) {
    if (amt == null || amt < 0) return { error: 'Сумма не может быть отрицательной.' }
    if (amt == null) amt = 0
  } else if (amt == null || amt <= 0) {
    return { error: 'Укажите сумму больше нуля.' }
  }
  const last = db.expenses.filter((e) => e.user_id === shopUid && e.category === cat).sort((a, b) => b.sort_order - a.sort_order)[0]
  const sort_order = last ? last.sort_order + 1 : 0
  let due_day: number | null = null
  if (cat === 'regular') {
    const raw = body.due_day
    due_day = raw == null || raw === '' ? 1 : Number.parseInt(String(raw), 10)
    if (!Number.isFinite(due_day)) return { error: 'Укажите день оплаты числом.' }
    if (period === 'weekly' && (due_day < 1 || due_day > 7)) {
      return { error: 'Для недельного периода: день недели от 1 (пн) до 7 (вс).' }
    }
    if (period !== 'weekly' && (due_day < 1 || due_day > 28)) {
      return { error: 'День оплаты: от 1 до 28.' }
    }
  }
  const expense: DemoExpense = {
    id: newId,
    user_id: shopUid,
    category: cat,
    name: name.slice(0, 200),
    amount_rub: moneyStr(utilities ? amt ?? 0 : amt!),
    period: cat === 'regular' ? period : '',
    due_day,
    expense_date: cat === 'additional' ? db.demoDay : null,
    sort_order,
  }
  db.expenses.push(expense)
  return { expense }
}

export function patchExpense(
  db: DemoDb,
  shopUid: number,
  expenseId: number,
  body: Record<string, unknown>,
  floristRestricted: boolean,
): { error?: string } {
  const e = db.expenses.find((x) => x.id === expenseId && x.user_id === shopUid)
  if (!e) return { error: 'Строка не найдена.' }
  if (floristRestricted && e.category !== 'additional') return { error: 'Строка не найдена.' }
  if (e.category !== 'regular' && e.category !== 'additional') {
    return { error: 'Эту строку нельзя менять.' }
  }
  if ('name' in body) {
    const name = String(body.name || '').trim()
    if (!name) return { error: 'Название не может быть пустым.' }
    e.name = name.slice(0, 200)
  }
  if ('amount_rub' in body) {
    const period_code = e.period || 'monthly'
    const utilities = e.category === 'regular' && period_code === 'utilities'
    const amt = parseMoney(body.amount_rub)
    if (utilities) {
      if (amt == null || amt < 0) return { error: 'Сумма не может быть отрицательной.' }
      e.amount_rub = moneyStr(amt ?? 0)
    } else if (amt == null || amt <= 0) {
      return { error: 'Сумма должна быть больше нуля.' }
    } else {
      e.amount_rub = moneyStr(amt)
    }
  }
  if ('period' in body && e.category === 'regular') {
    const period = String(body.period || '').trim()
    const allowed = new Set(PERIOD_CHOICES.map((c) => c.value))
    if (!allowed.has(period as (typeof PERIOD_CHOICES)[number]['value'])) {
      return { error: 'Выберите период из списка.' }
    }
    e.period = period
    if (period === 'utilities') e.amount_rub = '0.00'
  }
  if ('due_day' in body && e.category === 'regular') {
    const period_code = e.period || 'monthly'
    let due_day = Number.parseInt(String(body.due_day), 10)
    if (!Number.isFinite(due_day)) return { error: 'Укажите день оплаты числом.' }
    if (period_code === 'weekly' && (due_day < 1 || due_day > 7)) {
      return { error: 'Для недельного периода: день недели от 1 (пн) до 7 (вс).' }
    }
    if (period_code !== 'weekly' && (due_day < 1 || due_day > 28)) {
      return { error: 'День оплаты: от 1 до 28.' }
    }
    e.due_day = due_day
  }
  return {}
}

export function recordExpensePayment(
  db: DemoDb,
  shopUid: number,
  expenseId: number,
  body: Record<string, unknown>,
  newId: number,
): { error?: string } {
  const e = db.expenses.find(
    (x) => x.id === expenseId && x.user_id === shopUid && x.category === 'regular',
  )
  if (!e) return { error: 'Регулярная статья не найдена.' }
  const todayIso = db.demoDay
  let paid_at = todayIso
  if (body.paid_at) {
    const raw = String(body.paid_at).trim().slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return { error: 'Некорректная дата оплаты.' }
    paid_at = raw
  }
  const period_code = e.period || 'monthly'
  const [start, end] = periodBounds(period_code, todayIso)
  if (hasPaymentInPeriod(db, expenseId, start, end)) {
    return { error: 'В этом периоде оплата уже внесена.' }
  }
  const due = dueDateForPeriod(e.due_day ?? 1, period_code, todayIso)
  if (paid_at !== due) {
    const [d, m, y] = due.split('-').reverse()
    return { error: `Оплату можно внести только в день платежа (${d}.${m}.${y}).` }
  }
  const utilities = period_code === 'utilities'
  let amt = parseMoney(body.amount_rub)
  if (utilities) {
    if (amt == null || amt <= 0) return { error: 'Укажите сумму по счётчику.' }
  } else {
    if (amt == null || amt <= 0) amt = parseFloat(e.amount_rub)
    if (amt <= 0) return { error: 'Сумма должна быть больше нуля.' }
  }
  db.expensePayments.push({
    id: newId,
    expense_id: expenseId,
    paid_at,
    amount_rub: moneyStr(amt!),
  })
  return {}
}
