import { DEMO_ACCOUNTS } from './accounts'
import { CANONICAL_STORE_FLOWER_PHOTOS } from './demoArtCatalog'
import type {
  DemoBatch,
  DemoBasicCare,
  DemoBouquet,
  DemoConsumable,
  DemoDb,
  DemoExpense,
  DemoFlowerSale,
  DemoRetailProduct,
  DemoStoreFlower,
  DemoTaxon,
  DemoUser,
} from './types'

export type { DemoDb } from './types'

function isoDay(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function atDaysAgo(days: number, hour: number, minute: number): string {
  const d = new Date()
  d.setHours(hour, minute, 0, 0)
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

function atDaysAgoHours(days: number, hours: number): string {
  const d = new Date()
  d.setHours(d.getHours() - days * 24 - hours)
  return d.toISOString()
}

const RANK = {
  FAMILY: 'family',
  GENUS: 'genus',
  SPECIES: 'species',
  CULTIVAR: 'cultivar',
} as const

function mergeRowsById<T extends { id: number }>(target: T[], source: T[]) {
  for (const row of source) {
    if (!target.some((x) => x.id === row.id)) target.push(row)
  }
}

/** Новые позиции из сида, если в localStorage их ещё нет. */
export function mergeMissingDemoCatalog(db: DemoDb) {
  const fresh = createSeedDb()
  mergeRowsById(db.taxons, fresh.taxons)
  mergeRowsById(db.storeFlowers, fresh.storeFlowers)
  mergeRowsById(db.batches, fresh.batches)
  mergeRowsById(db.basicCare, fresh.basicCare)
  mergeRowsById(db.prices, fresh.prices)
  mergeRowsById(db.retailProducts, fresh.retailProducts)
  mergeRowsById(db.bouquets, fresh.bouquets)
  mergeRowsById(db.consumables, fresh.consumables)
  mergeRowsById(db.supplierOffers, fresh.supplierOffers)
  db.sales = fresh.sales
  db.expenses = fresh.expenses
  if (!db.homeSections.length) db.homeSections = fresh.homeSections
  for (const row of fresh.systemTasks) {
    if (!db.systemTasks.some((t) => t.user_id === row.user_id && t.task_key === row.task_key)) {
      db.systemTasks.push({ ...row })
    }
  }
}

export function buildTaxons(): DemoTaxon[] {
  const rows: DemoTaxon[] = [
    { id: 1, name: 'Rosaceae', name_ru: 'Розовые', rank: RANK.FAMILY, parent_id: null },
    { id: 2, name: 'Rosa', name_ru: 'Роза', rank: RANK.GENUS, parent_id: 1 },
    { id: 3, name: 'Rosa × hybrida', name_ru: 'Роза садовая', rank: RANK.SPECIES, parent_id: 2 },
    { id: 10, name: 'Explorer', name_ru: 'Explorer', rank: RANK.CULTIVAR, parent_id: 3 },
    { id: 11, name: 'Red Naomi', name_ru: 'Red Naomi', rank: RANK.CULTIVAR, parent_id: 3 },
    { id: 12, name: 'Freedom', name_ru: 'Freedom', rank: RANK.CULTIVAR, parent_id: 3 },
    { id: 45, name: 'White O’Hara', name_ru: 'White O’Hara', rank: RANK.CULTIVAR, parent_id: 3 },
    { id: 46, name: 'Mondial', name_ru: 'Mondial', rank: RANK.CULTIVAR, parent_id: 3 },
    { id: 20, name: 'Asteraceae', name_ru: 'Астровые', rank: RANK.FAMILY, parent_id: null },
    { id: 21, name: 'Chrysanthemum', name_ru: 'Хризантема', rank: RANK.GENUS, parent_id: 20 },
    {
      id: 22,
      name: 'Chrysanthemum × morifolium',
      name_ru: 'Хризантема садовая',
      rank: RANK.SPECIES,
      parent_id: 21,
    },
    { id: 23, name: 'Altai', name_ru: 'Altai', rank: RANK.CULTIVAR, parent_id: 22 },
    { id: 30, name: 'Asparagaceae', name_ru: 'Спаржевые', rank: RANK.FAMILY, parent_id: null },
    { id: 31, name: 'Asparagus', name_ru: 'Аспарагус', rank: RANK.GENUS, parent_id: 30 },
    {
      id: 32,
      name: 'Asparagus densiflorus',
      name_ru: 'Аспарагус густоцветковый',
      rank: RANK.SPECIES,
      parent_id: 31,
    },
    { id: 33, name: 'Sprengeri', name_ru: 'Sprengeri', rank: RANK.CULTIVAR, parent_id: 32 },
    { id: 40, name: 'Asteraceae G', name_ru: 'Астровые', rank: RANK.FAMILY, parent_id: null },
    { id: 41, name: 'Gerbera', name_ru: 'Гербера', rank: RANK.GENUS, parent_id: 40 },
    { id: 42, name: 'Gerbera jamesonii', name_ru: 'Гербера Джamesona', rank: RANK.SPECIES, parent_id: 41 },
    { id: 43, name: 'Kimsey', name_ru: 'Kimsey', rank: RANK.CULTIVAR, parent_id: 42 },
    { id: 44, name: 'Belgravia', name_ru: 'Belgravia', rank: RANK.CULTIVAR, parent_id: 42 },
  ]
  return rows
}

type FlowerSpec = {
  taxonId: number
  sfId: number
  batchId: number
  careId: number
  qty: number
  recvDays: number
  trimDays: number | null
  waterDays: number | null
  unitPrice: string
  unitCost: string
  realizationQty: number
  fixedPrice: string | null
}

/** Стартовый склад «старше» окна статистики — иначе весь приход попадает в закупки за 90 дн. */
const DEMO_STOCK_RECEIVED_DAYS_AGO = 120

function buildFlowerStock(ownerId: number, specs: FlowerSpec[]): {
  storeFlowers: DemoStoreFlower[]
  batches: DemoBatch[]
  basicCare: DemoBasicCare[]
  prices: DemoDb['prices']
} {
  const storeFlowers: DemoStoreFlower[] = specs.map((s) => ({
    id: s.sfId,
    user_id: ownerId,
    taxon_id: s.taxonId,
    name_override: '',
    notes: '',
    care_rules: [],
    photo_path: CANONICAL_STORE_FLOWER_PHOTOS[s.sfId] ?? null,
  }))

  const batches: DemoBatch[] = specs.map((s) => {
    const intakePending = s.trimDays === null && s.waterDays === null
    return {
      id: s.batchId,
      user_id: ownerId,
      store_flower_id: s.sfId,
      taxon_id: s.taxonId,
      quantity: s.qty,
      received_at: atDaysAgo(s.recvDays ?? DEMO_STOCK_RECEIVED_DAYS_AGO, 10, 0),
      last_trim_at: s.trimDays == null ? null : atDaysAgo(s.trimDays, 14, 0),
      last_water_change_at: s.waterDays == null ? null : atDaysAgo(s.waterDays, 15, 0),
      intake_pending: intakePending,
      unit_cost: s.unitCost,
      realization_quantity: s.realizationQty,
      sale_terms_fixed_price: s.fixedPrice,
    }
  })

  const basicCare: DemoBasicCare[] = specs.map((s) => {
    const batch = batches.find((b) => b.store_flower_id === s.sfId)!
    return {
      id: s.careId,
      user_id: ownerId,
      store_flower_id: s.sfId,
      intake_pending: batch.intake_pending,
      last_trim_at: batch.last_trim_at,
      last_water_change_at: batch.last_water_change_at,
    }
  })

  const prices = specs.map((s, i) => ({
    id: 2001 + i,
    user_id: ownerId,
    store_flower_id: s.sfId,
    taxon_id: s.taxonId,
    unit_price: s.unitPrice,
  }))

  return { storeFlowers, batches, basicCare, prices }
}

function buildSales(ownerId: number, specs: FlowerSpec[]): DemoFlowerSale[] {
  const taxonName: Record<number, string> = {
    10: 'Explorer',
    11: 'Red Naomi',
    12: 'Freedom',
    45: 'White O’Hara',
    46: 'Mondial',
    23: 'Altai',
    33: 'Sprengeri',
    43: 'Kimsey',
    44: 'Belgravia',
  }
  const retailLines = [
    { id: 5001, unit_price: '120.00', unit_cost: '35.00', name: 'Открытка «С днём рождения»' },
    { id: 5002, unit_price: '220.00', unit_cost: '85.00', name: 'Подарочный пакет средний' },
    { id: 5003, unit_price: '890.00', unit_cost: '420.00', name: 'Ваза стеклянная 25 см' },
    { id: 5004, unit_price: '490.00', unit_cost: '180.00', name: 'Свеча ароматическая «Лаванда»' },
    { id: 5005, unit_price: '650.00', unit_cost: '320.00', name: 'Тишью для упаковки' },
    { id: 5006, unit_price: '780.00', unit_cost: '390.00', name: 'Коробка подарочная жёсткая' },
  ]
  const bouquetLines = [
    { id: 4001, unit_price: '3200.00', unit_cost: '1850.00', name: 'Красные розы с зеленью' },
    { id: 4003, unit_price: '2900.00', unit_cost: '1650.00', name: 'Нежный Explorer' },
    { id: 4002, unit_price: '3600.00', unit_cost: '2100.00', name: 'Полевой микс' },
    { id: 4004, unit_price: '4100.00', unit_cost: '2350.00', name: 'Солнечный микс' },
    { id: 4005, unit_price: '3800.00', unit_cost: '2200.00', name: 'Белая классика' },
    { id: 4006, unit_price: '3400.00', unit_cost: '1950.00', name: 'Герберы микс' },
  ]
  const sales: DemoFlowerSale[] = []
  let saleId = 3001
  const payTypes = ['card', 'sbp', 'cash', 'transfer'] as const
  const slotHm: [number, number][] = [
    [10, 15],
    [12, 40],
    [15, 5],
    [17, 30],
    [19, 10],
  ]

  for (let dayIndex = 0; dayIndex < 90; dayIndex++) {
    const daysAgo = 89 - dayIndex
    const weekday = new Date(atDaysAgo(daysAgo, 12, 0)).getDay()
    const baseCount = weekday === 0 || weekday === 6 ? 4 : 6
    const checksToday = baseCount
    for (let slot = 0; slot < checksToday; slot++) {
      const roll = (dayIndex * 5 + slot * 3) % 12
      const [h, m] = slotHm[(dayIndex + slot) % slotHm.length]!
      const payment_type = payTypes[(dayIndex + slot) % payTypes.length]!

      if (roll <= 6) {
        const spec = specs[(dayIndex + slot) % specs.length]!
        const qty = 8 + ((dayIndex + slot * 2) % 10)
        const unitPrice = spec.unitPrice
        const unitCost = spec.unitCost
        const total = (parseFloat(unitPrice) * qty).toFixed(2)
        const costTotal = (parseFloat(unitCost) * qty).toFixed(2)
        const profit = (parseFloat(total) - parseFloat(costTotal)).toFixed(2)
        sales.push({
          id: saleId++,
          user_id: ownerId,
          batch_id: spec.batchId,
          taxon_id: spec.taxonId,
          store_flower_id: spec.sfId,
          display_name: taxonName[spec.taxonId] ?? 'Цветы',
          quantity: qty,
          unit_price: unitPrice,
          unit_cost: unitCost,
          total_amount: total,
          realization_quantity: 0,
          supplier_payout: '0.00',
          shop_profit: profit,
          payment_type,
          sold_at: atDaysAgo(daysAgo, h, m),
          line_kind: 'flower',
        })
        continue
      }

      if (roll <= 9) {
        const line = retailLines[(dayIndex + slot) % retailLines.length]!
        const qty = 1 + ((dayIndex + slot) % 3)
        const total = (parseFloat(line.unit_price) * qty).toFixed(2)
        const costTotal = (parseFloat(line.unit_cost) * qty).toFixed(2)
        const profit = (parseFloat(total) - parseFloat(costTotal)).toFixed(2)
        sales.push({
          id: saleId++,
          user_id: ownerId,
          batch_id: null,
          taxon_id: 0,
          store_flower_id: 0,
          display_name: line.name,
          quantity: qty,
          unit_price: line.unit_price,
          unit_cost: line.unit_cost,
          total_amount: total,
          realization_quantity: 0,
          supplier_payout: '0.00',
          shop_profit: profit,
          payment_type,
          sold_at: atDaysAgo(daysAgo, h, m),
          line_kind: 'retail',
          retail_product_id: line.id,
        })
        continue
      }

      const line = bouquetLines[(dayIndex + slot) % bouquetLines.length]!
      const qty = 1
      const total = line.unit_price
      const costTotal = line.unit_cost
      const profit = (parseFloat(total) - parseFloat(costTotal)).toFixed(2)
      sales.push({
        id: saleId++,
        user_id: ownerId,
        batch_id: null,
        taxon_id: 0,
        store_flower_id: 0,
        display_name: line.name,
        quantity: qty,
        unit_price: line.unit_price,
        unit_cost: line.unit_cost,
        total_amount: total,
        realization_quantity: 0,
        supplier_payout: '0.00',
        shop_profit: profit,
        payment_type,
        sold_at: atDaysAgo(daysAgo, h, m),
        line_kind: 'bouquet',
        bouquet_name: line.name,
      })
    }
  }
  return sales
}

function buildUsers(): DemoUser[] {
  const today = isoDay()
  const ownerAccount = DEMO_ACCOUNTS.find((a) => a.role === 'owner')!
  const floristAccount = DEMO_ACCOUNTS.find((a) => a.role === 'florist')!
  const customerAccount = DEMO_ACCOUNTS.find((a) => a.role === 'customer')!

  const navDefault = [
    { id: 'home', visible: true },
    { id: 'warehouse', visible: true },
    { id: 'statistics', visible: true },
    { id: 'catalog', visible: false },
    { id: 'prices', visible: false },
    { id: 'suppliers', visible: false },
    { id: 'delivery-services', visible: false },
    { id: 'staff', visible: false },
    { id: 'tasks', visible: false },
    { id: 'inventory', visible: false },
    { id: 'settings', visible: false },
    { id: 'sales', visible: false },
    { id: 'expenses', visible: false },
  ]

  return [
    {
      id: 1,
      login: 'roza_shop',
      phone: ownerAccount.phone,
      password: ownerAccount.password,
      role: 'owner',
      staff_name: '',
      shop_name: 'Роза Шоп',
      owner_id: null,
      subscription_until: null,
      warehouse_mode: 'basic',
      basic_care_interval_days: 3,
      basic_next_care_date: today,
      basic_care_cycle_anchor_date: today,
      last_inventory_completed_at: atDaysAgo(20, 9, 0),
      inventory_interval_days: 14,
      acquiring_rate_pct: '2.20',
      sbp_commission_rate_pct: '0.70',
      tax_rate_pct: '6.00',
      nav_menu_prefs: navDefault,
    },
    {
      id: 2,
      login: 'florist_anna',
      phone: floristAccount.phone,
      password: floristAccount.password,
      role: 'florist',
      staff_name: 'Анна',
      shop_name: '',
      owner_id: 1,
      subscription_until: null,
      warehouse_mode: 'basic',
      basic_care_interval_days: 3,
      basic_next_care_date: today,
      basic_care_cycle_anchor_date: null,
      last_inventory_completed_at: null,
      inventory_interval_days: 14,
      acquiring_rate_pct: '2.20',
      sbp_commission_rate_pct: '0.70',
      tax_rate_pct: '6.00',
      nav_menu_prefs: [],
    },
    {
      id: 3,
      login: 'u_customer',
      phone: customerAccount.phone,
      password: customerAccount.password,
      role: 'customer',
      staff_name: '',
      shop_name: '',
      owner_id: null,
      subscription_until: null,
      warehouse_mode: 'basic',
      basic_care_interval_days: 3,
      basic_next_care_date: today,
      basic_care_cycle_anchor_date: null,
      last_inventory_completed_at: null,
      inventory_interval_days: 14,
      acquiring_rate_pct: '0.00',
      sbp_commission_rate_pct: '0.00',
      tax_rate_pct: '0.00',
      nav_menu_prefs: [],
    },
  ]
}

function buildBouquets(ownerId: number): DemoBouquet[] {
  const now = new Date().toISOString()
  return [
    {
      id: 4001,
      user_id: ownerId,
      name: 'Красные розы с зеленью',
      unit_price: '3200.00',
      quantity: 2,
      assembled_at: atDaysAgo(2, 12, 0),
      last_trim_at: atDaysAgo(10, 8, 0),
      last_water_change_at: atDaysAgo(10, 8, 0),
      intake_pending: false,
      photo_path: 'demo-art/bouquet-red.webp',
      recipe_lines: [
        { store_flower_id: 102, quantity: 5 },
        { store_flower_id: 105, quantity: 3 },
      ],
      consumable_recipe_lines: [],
    },
    {
      id: 4002,
      user_id: ownerId,
      name: 'Полевой микс',
      unit_price: '3600.00',
      quantity: 4,
      assembled_at: atDaysAgo(3, 11, 0),
      last_trim_at: atDaysAgo(9, 8, 0),
      last_water_change_at: atDaysAgo(9, 8, 0),
      intake_pending: false,
      photo_path: 'demo-art/bouquet-field-mix.webp',
      recipe_lines: [
        { store_flower_id: 103, quantity: 7 },
        { store_flower_id: 105, quantity: 2 },
      ],
      consumable_recipe_lines: [],
    },
    {
      id: 4003,
      user_id: ownerId,
      name: 'Нежный Explorer',
      unit_price: '2900.00',
      quantity: 5,
      assembled_at: atDaysAgo(1, 15, 0),
      last_trim_at: atDaysAgo(8, 10, 0),
      last_water_change_at: atDaysAgo(8, 10, 0),
      intake_pending: false,
      photo_path: 'demo-art/bouquet-classic.webp',
      recipe_lines: [{ store_flower_id: 101, quantity: 4 }],
      consumable_recipe_lines: [],
    },
    {
      id: 4004,
      user_id: ownerId,
      name: 'Солнечный микс',
      unit_price: '4100.00',
      quantity: 3,
      assembled_at: atDaysAgo(2, 14, 0),
      last_trim_at: atDaysAgo(7, 9, 0),
      last_water_change_at: atDaysAgo(7, 9, 0),
      intake_pending: false,
      photo_path: 'demo-art/bouquet-sunny-mix.webp',
      recipe_lines: [
        { store_flower_id: 106, quantity: 5 },
        { store_flower_id: 107, quantity: 2 },
      ],
      consumable_recipe_lines: [],
    },
    {
      id: 4005,
      user_id: ownerId,
      name: 'Белая классика',
      unit_price: '3800.00',
      quantity: 4,
      assembled_at: atDaysAgo(1, 11, 0),
      last_trim_at: atDaysAgo(6, 9, 0),
      last_water_change_at: atDaysAgo(6, 9, 0),
      intake_pending: false,
      photo_path: 'demo-art/bouquet-white-classic.webp',
      recipe_lines: [
        { store_flower_id: 108, quantity: 6 },
        { store_flower_id: 105, quantity: 2 },
      ],
      consumable_recipe_lines: [],
    },
    {
      id: 4006,
      user_id: ownerId,
      name: 'Герберы микс',
      unit_price: '3400.00',
      quantity: 3,
      assembled_at: atDaysAgo(2, 16, 0),
      last_trim_at: atDaysAgo(5, 10, 0),
      last_water_change_at: atDaysAgo(5, 10, 0),
      intake_pending: false,
      photo_path: 'demo-art/bouquet-gerbera-mix.webp',
      recipe_lines: [
        { store_flower_id: 106, quantity: 4 },
        { store_flower_id: 107, quantity: 4 },
      ],
      consumable_recipe_lines: [],
    },
  ].map((b) => ({ ...b, assembled_at: b.assembled_at ?? now }))
}

function buildRetail(ownerId: number): DemoRetailProduct[] {
  return [
    {
      id: 5001,
      user_id: ownerId,
      name: 'Открытка «С днём рождения»',
      quantity: 48,
      unit_cost: '35.00',
      unit_price: '120.00',
      photo_path: 'demo-art/retail-card.webp',
      created_at: atDaysAgo(30, 9, 0),
      realization_quantity: 0,
      sale_terms_fixed_price: null,
    },
    {
      id: 5002,
      user_id: ownerId,
      name: 'Подарочный пакет средний',
      quantity: 32,
      unit_cost: '85.00',
      unit_price: '220.00',
      photo_path: 'demo-art/retail-bag.webp',
      created_at: atDaysAgo(25, 9, 0),
      realization_quantity: 0,
      sale_terms_fixed_price: null,
    },
    {
      id: 5003,
      user_id: ownerId,
      name: 'Ваза стеклянная 25 см',
      quantity: 18,
      unit_cost: '420.00',
      unit_price: '890.00',
      photo_path: 'demo-art/retail-vase.webp',
      created_at: atDaysAgo(20, 9, 0),
      realization_quantity: 0,
      sale_terms_fixed_price: null,
    },
    {
      id: 5004,
      user_id: ownerId,
      name: 'Свеча ароматическая «Лаванда»',
      quantity: 20,
      unit_cost: '180.00',
      unit_price: '490.00',
      photo_path: 'demo-art/retail-candle.webp',
      created_at: atDaysAgo(18, 9, 0),
      realization_quantity: 0,
      sale_terms_fixed_price: null,
    },
    {
      id: 5005,
      user_id: ownerId,
      name: 'Тишью для упаковки',
      quantity: 12,
      unit_cost: '320.00',
      unit_price: '650.00',
      photo_path: 'demo-art/retail-tissue.webp',
      created_at: atDaysAgo(15, 9, 0),
      realization_quantity: 0,
      sale_terms_fixed_price: null,
    },
    {
      id: 5006,
      user_id: ownerId,
      name: 'Коробка подарочная жёсткая',
      quantity: 14,
      unit_cost: '390.00',
      unit_price: '780.00',
      photo_path: 'demo-art/retail-box.webp',
      created_at: atDaysAgo(12, 9, 0),
      realization_quantity: 0,
      sale_terms_fixed_price: null,
    },
  ]
}

function buildConsumables(ownerId: number): DemoConsumable[] {
  return [
    {
      id: 6001,
      user_id: ownerId,
      name: 'Лента атласная 4 см',
      unit_kind: 'meter',
      meters_balance: '200.00',
      rolls_count: 2,
      unit_cost_per_meter: '12.00',
      photo_path: 'demo-art/consumable-ribbon.webp',
    },
    {
      id: 6002,
      user_id: ownerId,
      name: 'Крафт-бумага 70 см',
      unit_kind: 'meter',
      meters_balance: '100.00',
      rolls_count: 2,
      unit_cost_per_meter: '24.00',
      photo_path: 'demo-art/consumable-kraft.webp',
    },
    {
      id: 6003,
      user_id: ownerId,
      name: 'Оазис кирпич',
      unit_kind: 'piece',
      meters_balance: '6.00',
      rolls_count: 3,
      unit_cost_per_meter: '100.00',
      photo_path: 'demo-art/consumable-oasis.webp',
    },
  ]
}

function buildExpenses(ownerId: number): DemoExpense[] {
  const today = isoDay()
  const addDays = (n: number) => {
    const d = new Date(`${today}T12:00:00.000Z`)
    d.setUTCDate(d.getUTCDate() - n)
    return isoDay(d)
  }
  const rows: DemoExpense[] = [
    {
      id: 7001,
      user_id: ownerId,
      category: 'regular',
      name: 'Аренда помещения',
      amount_rub: '22000.00',
      period: 'monthly',
      due_day: 5,
      expense_date: null,
      sort_order: 0,
    },
    {
      id: 7002,
      user_id: ownerId,
      category: 'regular',
      name: 'Коммунальные платежи',
      amount_rub: '0.00',
      period: 'utilities',
      due_day: 15,
      expense_date: null,
      sort_order: 1,
    },
  ]
  const additional: Array<[string, string, number]> = [
    ['Поездки на такси', '3400.00', 1],
    ['Хозтовары', '2100.00', 5],
    ['Прочее', '800.00', 0],
    ['Курьер разово', '1200.00', 2],
    ['Упаковка разовая', '1850.00', 3],
    ['Реклама в соцсетях', '5000.00', 6],
  ]
  additional.forEach(([name, amount, daysAgo], i) => {
    rows.push({
      id: 7100 + i,
      user_id: ownerId,
      category: 'additional',
      name,
      amount_rub: amount,
      period: '',
      due_day: null,
      expense_date: addDays(daysAgo),
      sort_order: 10 + i,
    })
  })
  return rows
}

export function createSeedDb(): DemoDb {
  const ownerId = 1
  const demoDay = isoDay()
  const flowerSpecs: FlowerSpec[] = [
    {
      taxonId: 10,
      sfId: 101,
      batchId: 1001,
      careId: 501,
      qty: 55,
      recvDays: DEMO_STOCK_RECEIVED_DAYS_AGO,
      trimDays: null,
      waterDays: null,
      unitPrice: '185.00',
      unitCost: '98.30',
      realizationQty: 20,
      fixedPrice: '70.00',
    },
    {
      taxonId: 11,
      sfId: 102,
      batchId: 1002,
      careId: 502,
      qty: 70,
      recvDays: DEMO_STOCK_RECEIVED_DAYS_AGO,
      trimDays: 1,
      waterDays: null,
      unitPrice: '145.00',
      unitCost: '77.40',
      realizationQty: 25,
      fixedPrice: '74.00',
    },
    {
      taxonId: 12,
      sfId: 103,
      batchId: 1003,
      careId: 503,
      qty: 50,
      recvDays: DEMO_STOCK_RECEIVED_DAYS_AGO,
      trimDays: 0,
      waterDays: 0,
      unitPrice: '175.00',
      unitCost: '93.10',
      realizationQty: 15,
      fixedPrice: '65.00',
    },
    {
      taxonId: 23,
      sfId: 104,
      batchId: 1004,
      careId: 504,
      qty: 90,
      recvDays: DEMO_STOCK_RECEIVED_DAYS_AGO,
      trimDays: 3,
      waterDays: 3,
      unitPrice: '72.00',
      unitCost: '40.50',
      realizationQty: 30,
      fixedPrice: '89.00',
    },
    {
      taxonId: 33,
      sfId: 105,
      batchId: 1005,
      careId: 505,
      qty: 40,
      recvDays: DEMO_STOCK_RECEIVED_DAYS_AGO,
      trimDays: 2,
      waterDays: null,
      unitPrice: '28.00',
      unitCost: '16.60',
      realizationQty: 0,
      fixedPrice: null,
    },
    {
      taxonId: 43,
      sfId: 106,
      batchId: 1006,
      careId: 506,
      qty: 35,
      recvDays: DEMO_STOCK_RECEIVED_DAYS_AGO,
      trimDays: null,
      waterDays: 0,
      unitPrice: '78.00',
      unitCost: '42.70',
      realizationQty: 0,
      fixedPrice: null,
    },
    {
      taxonId: 44,
      sfId: 107,
      batchId: 1007,
      careId: 507,
      qty: 30,
      recvDays: DEMO_STOCK_RECEIVED_DAYS_AGO,
      trimDays: 0,
      waterDays: 0,
      unitPrice: '82.00',
      unitCost: '45.20',
      realizationQty: 0,
      fixedPrice: null,
    },
    {
      taxonId: 45,
      sfId: 108,
      batchId: 1008,
      careId: 508,
      qty: 48,
      recvDays: DEMO_STOCK_RECEIVED_DAYS_AGO,
      trimDays: 1,
      waterDays: 1,
      unitPrice: '198.00',
      unitCost: '105.00',
      realizationQty: 10,
      fixedPrice: '72.00',
    },
    {
      taxonId: 46,
      sfId: 109,
      batchId: 1009,
      careId: 509,
      qty: 42,
      recvDays: DEMO_STOCK_RECEIVED_DAYS_AGO,
      trimDays: null,
      waterDays: null,
      unitPrice: '192.00',
      unitCost: '101.50',
      realizationQty: 8,
      fixedPrice: '68.00',
    },
  ]

  const stock = buildFlowerStock(ownerId, flowerSpecs)
  const sales = buildSales(ownerId, flowerSpecs)

  const sections = [
    { id: 801, user_id: ownerId, section_key: 'deliveries', name: 'Поставки', is_builtin: true, sort_order: 0 },
    { id: 802, user_id: ownerId, section_key: 'flower_care', name: 'Уход за цветами', is_builtin: true, sort_order: 1 },
    { id: 803, user_id: ownerId, section_key: 'orders', name: 'Заказы', is_builtin: true, sort_order: 2 },
    { id: 804, user_id: ownerId, section_key: 'more', name: 'Ещё', is_builtin: true, sort_order: 3 },
  ]

  const systemTasks = [
    { key: 'supplier_deliveries', section_id: 801, visibility: 'owner' },
    { key: 'customer_orders', section_id: 803, visibility: 'all' },
    { key: 'flower_care', section_id: 802, visibility: 'all' },
    { key: 'inventory', section_id: 804, visibility: 'owner' },
    { key: 'expense_payments', section_id: 804, visibility: 'owner' },
    { key: 'missing_sale_price', section_id: 804, visibility: 'owner' },
  ].map((t, i) => ({
    id: 9001 + i,
    user_id: ownerId,
    task_key: t.key,
    enabled: true,
    visibility: t.visibility,
    assignee_id: null,
    section_id: t.section_id,
  }))

  return {
    demoDay,
    nextNumericId: 10_000,
    users: buildUsers(),
    taxons: buildTaxons(),
    storeFlowers: stock.storeFlowers,
    batches: stock.batches,
    basicCare: stock.basicCare,
    prices: stock.prices,
    sales,
    retailProducts: buildRetail(ownerId),
    consumables: buildConsumables(ownerId),
    bouquets: buildBouquets(ownerId),
    bouquetAssemblies: [],
    bouquetComponents: [],
    suppliers: [
      {
        id: 8001,
        user_id: ownerId,
        name: 'ООО «Голландия Цветы»',
        legal_name: 'ООО "Голландия Цветы"',
        legal_info: 'ИНН 7707123456 · КПП 770701001',
        address: 'г. Москва, Садовническая наб., д. 7',
        contacts: 'opt@holland-flowers.example',
        notes: 'Поставки NL 2 раза в неделю.',
      },
      {
        id: 8002,
        user_id: ownerId,
        name: 'ИП Васильев «Роза Парк»',
        legal_name: 'ИП Васильев Сергей Петрович',
        legal_info: 'ИНН 500123456789',
        address: 'Московская обл., п. Новоивановское',
        contacts: '+7 (977) 555-12-34',
        notes: 'Розы и хризантемы с юга.',
      },
    ],
    supplierOffers: [
      { id: 8101, supplier_id: 8001, store_flower_id: 101, taxon_id: 10, unit_purchase_price: '118.00' },
      { id: 8102, supplier_id: 8001, store_flower_id: 103, taxon_id: 12, unit_purchase_price: '112.50' },
      { id: 8103, supplier_id: 8001, store_flower_id: 102, taxon_id: 11, unit_purchase_price: '98.00' },
      { id: 8104, supplier_id: 8001, store_flower_id: 104, taxon_id: 23, unit_purchase_price: '58.00' },
      { id: 8105, supplier_id: 8002, store_flower_id: 104, taxon_id: 23, unit_purchase_price: '52.00' },
      { id: 8106, supplier_id: 8002, store_flower_id: 106, taxon_id: 43, unit_purchase_price: '48.00' },
      { id: 8107, supplier_id: 8002, store_flower_id: 107, taxon_id: 44, unit_purchase_price: '50.00' },
      { id: 8108, supplier_id: 8002, store_flower_id: 105, taxon_id: 33, unit_purchase_price: '22.00' },
      { id: 8109, supplier_id: 8001, store_flower_id: 108, taxon_id: 45, unit_purchase_price: '108.00' },
      { id: 8110, supplier_id: 8001, store_flower_id: 109, taxon_id: 46, unit_purchase_price: '104.00' },
    ],
    expenses: buildExpenses(ownerId),
    expensePayments: [],
    inventories: [],
    homeSections: sections,
    systemTasks,
    customTasks: [
      {
        id: 9101,
        user_id: ownerId,
        name: 'Проверить витрину',
        section_id: 804,
        enabled: true,
        visibility: 'all',
        assignee_id: null,
        schedule_kind: 'once',
        period: '',
        due_date: atDaysAgoHours(0, 2),
        completed_at: null,
        note: '',
        sort_order: 0,
      },
    ],
    deliveryServices: [
      {
        id: 8201,
        user_id: ownerId,
        name: 'Яндекс Доставка',
        price: '450.00',
        notes: 'По городу до 2 часов',
      },
      {
        id: 8202,
        user_id: ownerId,
        name: 'Самовывоз',
        price: '0.00',
        notes: '',
      },
    ],
    supplierDeliveries: [
      {
        id: 8301,
        user_id: ownerId,
        supplier_id: 8001,
        expected_arrival_date: demoDay,
        status: 'pending',
      },
    ],
    supplierDeliveryLines: [
      {
        id: 8302,
        delivery_id: 8301,
        store_flower_id: 101,
        taxon_id: 10,
        retail_product_id: null,
        quantity: 30,
        unit_purchase_price: '118.00',
        realization_quantity: 0,
        sale_terms_fixed_price: null,
        received_quantity: null,
        defect_quantity: 0,
      },
    ],
    customerOrders: [],
    retailIntakes: [],
    consumableIntakes: [],
    stockDiscards: [],
  }
}

export function nearestOpenDay(): string {
  return isoDay(new Date())
}
