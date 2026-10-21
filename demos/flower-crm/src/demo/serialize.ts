import { parseNavMenuPrefs, resolveNavMenuFromPrefs } from '../auth/navMenuTypes'
import type { BatchesResponse, RetailProductRow } from '../components/crm/stock/types'
import { resolveDemoPhotoUrl } from './demoArtCatalog'
import { listCustomerOrdersCare } from './customerOrders'
import { expensePaymentTasksForUser } from './expensePeriod'
import { inventoryMeta } from './inventory'
import { basicShopPeriodicDue } from './basicWarehouse'
import { listBouquetCareUnitsForUser, serializeBouquetRow } from './bouquetSerialize'
import { listBatchesForShop } from './warehouseList'
import { homeSectionsForViewer, homeTaskGatesForViewer } from './homeTaskOps'
import { listSupplierDeliveriesCare } from './supplierDeliveries'
import type { DemoDb, DemoRetailProduct, DemoUser } from './types'

const RANK_LABEL_RU: Record<string, string> = {
  family: 'Семейство',
  genus: 'Род',
  species: 'Вид',
  cultivar: 'Сорт',
}

export function shopUserId(user: DemoUser): number {
  if (user.role === 'florist' && user.owner_id) return user.owner_id
  return user.id
}

export function findUser(db: DemoDb, id: number | null): DemoUser | null {
  if (id == null) return null
  return db.users.find((u) => u.id === id) ?? null
}

export function findUserByPhone(db: DemoDb, phone: string): DemoUser | null {
  return db.users.find((u) => u.phone === phone) ?? null
}

export function subscriptionActive(user: DemoUser): boolean {
  if (user.role === 'customer') return false
  if (!user.subscription_until) return true
  return user.subscription_until >= new Date().toISOString().slice(0, 10)
}

export function resolveNavMenu(owner: DemoUser, isOwner: boolean) {
  const prefs = parseNavMenuPrefs(owner.nav_menu_prefs)
  return resolveNavMenuFromPrefs(prefs, isOwner)
}

export function userPublic(db: DemoDb, user: DemoUser) {
  if (user.role === 'customer') {
    return {
      phone: user.phone,
      login: user.login,
      role: user.role,
      subscription_until: null,
      subscription_active: false,
      nav_menu: [],
      nav_menu_can_edit: false,
    }
  }
  const owner = findUser(db, shopUserId(user))
  const nav_menu = owner ? resolveNavMenu(owner, user.role === 'owner') : []
  return {
    phone: user.phone,
    login: user.login,
    role: user.role,
    subscription_until: user.subscription_until,
    subscription_active: subscriptionActive(user),
    nav_menu,
    nav_menu_can_edit: user.role === 'owner',
  }
}

export function serializeRetailProductRow(
  p: DemoRetailProduct,
  includeFinancials: boolean,
): RetailProductRow {
  return {
    id: p.id,
    kind: 'retail',
    name: p.name,
    photo_url: resolveDemoPhotoUrl('retail', p.id, p.photo_path),
    quantity: p.quantity,
    unit_cost: includeFinancials ? p.unit_cost : undefined,
    unit_price: p.unit_price,
    realization_quantity: p.realization_quantity,
    sale_terms_fixed_price: p.sale_terms_fixed_price,
    created_at: p.created_at,
  }
}

export function serializeStockList(db: DemoDb, sessionUser: DemoUser): BatchesResponse {
  const shopUid = shopUserId(sessionUser)
  const owner = findUser(db, shopUid)!
  const invMeta = inventoryMeta(db, owner)
  const includeFinancials = sessionUser.role === 'owner'
  const todayIso = db.demoDay
  const batches = listBatchesForShop(db, shopUid, includeFinancials, todayIso)
  const taskGates = homeTaskGatesForViewer(db, sessionUser)
  const homeSections = homeSectionsForViewer(db, sessionUser)
  const invDue = taskGates.inventory ? invMeta.inventory_periodic_due : false

  return {
    batches,
    warehouse_mode: owner.warehouse_mode,
    basic_care_interval_days: owner.basic_care_interval_days,
    basic_shop_periodic_due: basicShopPeriodicDue(owner, todayIso),
    basic_next_care_date: owner.basic_next_care_date,
    inventory_periodic_due: invDue,
    inventory_interval_days: invMeta.inventory_interval_days,
    last_inventory_completed_at: invMeta.last_inventory_completed_at,
    retail_products: db.retailProducts
      .filter((p) => p.user_id === shopUid)
      .map((p) => serializeRetailProductRow(p, includeFinancials)),
    consumables: db.consumables
      .filter((c) => c.user_id === shopUid)
      .map((c) => ({
        id: c.id,
        kind: 'consumable' as const,
        name: c.name,
        photo_url: resolveDemoPhotoUrl('consumable', c.id, c.photo_path),
        unit_kind: c.unit_kind,
        meters_balance: c.meters_balance,
        rolls_count: c.rolls_count,
        unit_label: c.unit_kind === 'meter' ? 'м' : 'шт',
        unit_cost_per_meter: includeFinancials ? c.unit_cost_per_meter : undefined,
        unit_cost_label: includeFinancials ? (c.unit_kind === 'meter' ? '₽/м' : '₽/шт') : undefined,
      })),
    bouquets: db.bouquets
      .filter((b) => b.user_id === shopUid)
      .map((b) => serializeBouquetRow(db, b, owner, includeFinancials, todayIso)),
    bouquet_care_units: listBouquetCareUnitsForUser(
      db,
      shopUid,
      owner,
      includeFinancials,
      todayIso,
    ),
    supplier_deliveries_care: taskGates.supplier_deliveries
      ? listSupplierDeliveriesCare(db, shopUid, db.demoDay)
      : [],
    customer_orders_care: taskGates.customer_orders
      ? listCustomerOrdersCare(db, shopUid, db.demoDay)
      : [],
    expense_payment_tasks: taskGates.expense_payments
      ? expensePaymentTasksForUser(db, shopUid, db.demoDay)
      : [],
    home_task_gates: taskGates,
    home_sections: homeSections,
  }
}

const SYSTEM_LABELS: Record<string, { label: string; description: string }> = {
  supplier_deliveries: {
    label: 'Поставки',
    description: 'Принять поставку от поставщика и внести цветы на склад.',
  },
  customer_orders: {
    label: 'Заказы',
    description: 'Заказы с датой выдачи или доставки.',
  },
  flower_care: {
    label: 'Уход за цветами',
    description: 'Подрезка, полив и приёмка партий.',
  },
  inventory: {
    label: 'Инвентаризация',
    description: 'Сверка остатков с фактом на полках.',
  },
  expense_payments: {
    label: 'Оплата регулярных расходов',
    description: 'Аренда, коммуналка и другие статьи.',
  },
  missing_sale_price: {
    label: 'Указать цену продажи',
    description: 'Партии и товары без витринной цены.',
  },
}

function staffOutForShop(db: DemoDb, shopUid: number) {
  return db.users
    .filter((u) => u.role === 'florist' && u.owner_id === shopUid)
    .map((u) => ({
      id: u.id,
      name: (u.staff_name || u.login || '').trim() || `#${u.id}`,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
}

/** Как `visibility_choices_for_config` на Django: без пункта «florist», зато имена флористов. */
function visibilityChoicesForConfig(staff: { id: number; name: string }[]) {
  const choices = [
    { value: 'all', label: 'Все' },
    { value: 'all_florists', label: 'Все флористы' },
    { value: 'owner', label: 'Владелец' },
  ]
  for (const s of staff) {
    choices.push({ value: `florist:${s.id}`, label: s.name })
  }
  return choices
}

export function ownerHomeTasksPayload(db: DemoDb, shopUid: number) {
  const staff = staffOutForShop(db, shopUid)
  const sections = db.homeSections
    .filter((s) => s.user_id === shopUid)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((s) => ({
      id: s.id,
      section_key: s.section_key,
      name: s.name,
      is_builtin: s.is_builtin,
      sort_order: s.sort_order,
    }))

  const systemRows = db.systemTasks.filter((t) => t.user_id === shopUid)
  const mapSystem = (t: (typeof systemRows)[number]) => ({
    task_key: t.task_key,
    label: SYSTEM_LABELS[t.task_key]?.label ?? t.task_key,
    description: SYSTEM_LABELS[t.task_key]?.description ?? '',
    section_id: t.section_id,
    enabled: t.enabled,
    visibility: t.visibility,
    assignee_id: t.assignee_id,
  })

  const enabled_system_tasks = systemRows.filter((t) => t.enabled).map(mapSystem)
  const disabled_system_tasks = systemRows.filter((t) => !t.enabled).map(mapSystem)

  const customAll = db.customTasks.filter((t) => t.user_id === shopUid)
  const mapCustom = (t: (typeof customAll)[number]) => ({
    id: t.id,
    name: t.name,
    section_id: t.section_id,
    enabled: t.enabled,
    visibility: t.visibility,
    assignee_id: t.assignee_id,
    schedule_kind: t.schedule_kind,
    period: t.period,
    due_date: t.due_date,
    note: t.note,
    schedule_label: t.schedule_kind === 'periodic' ? 'Периодически' : 'Разово',
  })

  return {
    sections,
    visibility_choices: visibilityChoicesForConfig(staff),
    staff,
    schedule_kind_choices: [
      { value: 'once', label: 'Разово' },
      { value: 'periodic', label: 'Периодически' },
    ],
    period_choices: [
      { value: 'daily', label: 'Ежедневно' },
      { value: 'weekly', label: 'Еженедельно' },
      { value: 'monthly', label: 'Ежемесячно' },
    ],
    enabled_system_tasks,
    disabled_system_tasks,
    enabled_custom_tasks: customAll.filter((t) => t.enabled).map(mapCustom),
    disabled_custom_tasks: customAll.filter((t) => !t.enabled).map(mapCustom),
  }
}

export function taxonTreePayload(db: DemoDb) {
  const byId = new Map<number, Record<string, unknown>>()
  for (const t of db.taxons) {
    byId.set(t.id, {
      id: t.id,
      name: t.name,
      name_ru: t.name_ru,
      display_name: (t.name_ru || t.name).trim() || t.name,
      rank: t.rank,
      rank_label: RANK_LABEL_RU[t.rank] ?? t.rank,
      children: [] as Record<string, unknown>[],
    })
  }
  const roots: Record<string, unknown>[] = []
  for (const t of db.taxons) {
    const node = byId.get(t.id)!
    if (t.parent_id == null) roots.push(node)
    else {
      const parent = byId.get(t.parent_id)
      if (parent) (parent.children as Record<string, unknown>[]).push(node)
    }
  }
  return { taxons: roots }
}

export function salesStatsDay(db: DemoDb, shopUid: number) {
  const day = db.demoDay
  const rows = db.sales.filter(
    (s) => s.user_id === shopUid && s.sold_at.slice(0, 10) === day,
  )
  let totalQty = 0
  let totalAmount = 0
  let totalCost = 0
  let totalProfit = 0
  for (const s of rows) {
    totalQty += s.quantity
    totalAmount += parseFloat(s.total_amount)
    totalCost += parseFloat(s.unit_cost) * s.quantity
    totalProfit += parseFloat(s.shop_profit)
  }
  return {
    date: day,
    total_quantity: totalQty,
    total_amount: totalAmount.toFixed(2),
    total_cost: totalCost.toFixed(2),
    total_supplier_payout: '0.00',
    total_profit: totalProfit.toFixed(2),
    sales_count: rows.length,
  }
}
