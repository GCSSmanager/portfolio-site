export type StockCrmSurface = 'warehouse' | 'home'

export type BatchRow = {
  id: number
  /** Базовый режим склада: объединённая строка по виду цветка. */
  line_kind?: 'basic'
  basic_care_id?: number
  store_flower_id?: number | null
  taxon_id?: number | null
  display_name: string
  latin_name?: string | null
  rank: string
  rank_label: string
  quantity: number
  received_at: string | null
  last_trim_at: string | null
  last_water_change_at: string | null
  care_needs_trim?: boolean
  care_needs_water?: boolean
  intake_pending?: boolean
  /** Факт: на партиях сегмента ещё intake_pending (для «Дела» даже если intake_pending в JSON скрыт suppress). */
  has_intake_batches?: boolean
  unit_price?: string | null
  unit_cost?: string | null
  /** Количество на реализации (остаток по партии / сегменту) */
  realization_quantity?: number
  /** Фиксированная цена реализации с поставки/прихода */
  sale_terms_fixed_price?: string | null
  photo_url?: string | null
  /** Интервал ухода (дней), только базовый режим */
  basic_care_interval_days?: number
  /** Базовый режим: две строки списка по одному виду — только для PATCH basic-care */
  basic_batch_scope?: 'cleared' | 'intake_pending'
}

export type CustomerOrderCareRow = {
  id: number
  kind: 'customer_order'
  status: string
  delivery_service_name: string
  pickup_at_store?: boolean
  delivery_price: string
  delivery_address: string
  customer_phone: string
  scheduled_at: string
  scheduled_date: string
  scheduled_time: string
  line_kind: string
  batch_id?: number | null
  store_flower_id?: number | null
  retail_product_id?: number | null
  product_name: string
  quantity: number
  unit_price: string
  product_total_amount: string
  total_amount: string
  care_kind: 'pending_handoff'
}

export type SupplierDeliveryCareRow = {
  id: number
  kind: 'supplier_delivery'
  supplier_id: number
  supplier_name: string
  expected_arrival_date: string
  lines: Array<{
    id: number
    store_flower_id?: number | null
    taxon_id?: number | null
    display_name: string
    latin_name?: string | null
    rank_label?: string
    quantity: number
    unit_purchase_price: string
    realization_quantity?: number
    sale_terms_fixed_price?: string | null
    received_quantity?: number
    defect_quantity?: number
  }>
  care_kind: 'pending_receive'
}

export type BouquetComponentRow = {
  batch_id: number
  store_flower_id?: number | null
  taxon_id?: number | null
  display_name: string
  quantity: number
  intake_pending?: boolean
  care_needs_trim?: boolean
  care_needs_water?: boolean
  last_trim_at?: string | null
  last_water_change_at?: string | null
}

export type BouquetRecipeLineRow = {
  store_flower_id: number
  taxon_id?: number | null
  display_name: string
  quantity: number
  photo_url?: string | null
}

export type BouquetConsumableRecipeLineRow = {
  consumable_id: number
  display_name: string
  unit_kind: ConsumableUnitKind
  unit_label: string
  /** См или шт на один букет (строка с API). */
  quantity: string
  photo_url?: string | null
}

export type ConsumableUnitKind = 'meter' | 'piece'

/** Продвинутый склад: одна партия сборки букета. */
export type BouquetStockUnit = {
  assembly_id: number | null
  assembly_label: string | null
  quantity: number
  assembled_at: string | null
  last_trim_at: string | null
  last_water_change_at: string | null
  care_needs_trim?: boolean
  care_needs_water?: boolean
}

export type BouquetRow = {
  id: number
  kind: 'bouquet'
  name: string
  photo_url?: string | null
  quantity: number
  unit_cost?: string | null
  unit_price: string | null
  /** Для продажи: сколько букетов можно списать с реализации (не показывать на складе). */
  realization_quantity?: number
  assembled_at: string
  intake_pending?: boolean
  care_needs_trim?: boolean
  care_needs_water?: boolean
  last_trim_at?: string | null
  last_water_change_at?: string | null
  recipe_lines: BouquetRecipeLineRow[]
  consumable_recipe_lines: BouquetConsumableRecipeLineRow[]
  components: BouquetComponentRow[]
  assembly_id?: number | null
  assembly_label?: string | null
  /** Продвинутый режим: партии на складе (сборки). */
  stock_units?: BouquetStockUnit[]
}

export type ConsumableRow = {
  id: number
  kind: 'consumable'
  name: string
  photo_url?: string | null
  unit_kind: ConsumableUnitKind
  meters_balance: string
  rolls_count: number
  unit_label: string
  unit_cost_per_meter?: string | null
  unit_cost_label?: string | null
}

export type RetailProductRow = {
  id: number
  kind: 'retail'
  name: string
  photo_url?: string | null
  quantity: number
  unit_cost?: string | null
  unit_price: string | null
  realization_quantity?: number
  sale_terms_fixed_price?: string | null
  created_at: string
}

export type ExpensePaymentTaskRow = {
  expense_id: number
  name: string
  amount_rub: string
  variable_amount?: boolean
  due_day: number
  due_date: string
  period: string
  period_label: string
}

export type BatchesResponse = {
  batches: BatchRow[]
  warehouse_mode?: string
  basic_care_interval_days?: number
  /** Базовый режим: сегодня пора общему уходу по календарю магазина */
  basic_shop_periodic_due?: boolean
  basic_next_care_date?: string | null
  retail_products?: RetailProductRow[]
  consumables?: ConsumableRow[]
  bouquets?: BouquetRow[]
  bouquet_care_units?: BouquetRow[]
  supplier_deliveries_care?: SupplierDeliveryCareRow[]
  customer_orders_care?: CustomerOrderCareRow[]
  expense_payment_tasks?: ExpensePaymentTaskRow[]
  inventory_periodic_due?: boolean
  inventory_interval_days?: number
  last_inventory_completed_at?: string | null
  home_task_gates?: HomeTaskGates
  home_sections?: HomeSectionView[]
}

export type HomeSectionRow = {
  id: number
  section_key: string
  name: string
  is_builtin: boolean
  sort_order: number
}

/** Ленты задач в разделе — назначение с бэкенда (ShopHomeSystemTask.section_id). */
export type HomeSectionFeeds = {
  supplier_deliveries?: boolean
  intake?: boolean
  flower_care?: boolean
  customer_orders?: boolean
  inventory?: boolean
  expense_payments?: boolean
  missing_sale_price?: boolean
}

export type HomeSectionView = HomeSectionRow & {
  feeds: HomeSectionFeeds
  custom_tasks: HomeCustomTaskRow[]
}

export type HomeTaskGates = {
  supplier_deliveries?: boolean
  customer_orders?: boolean
  flower_care?: boolean
  inventory?: boolean
  expense_payments?: boolean
  missing_sale_price?: boolean
}

export type HomeCustomTaskRow = {
  id: number
  name: string
  section_id: number | null
  enabled: boolean
  visibility: string
  assignee_id: number | null
  schedule_kind: string
  period: string
  due_date: string | null
  completed_at?: string | null
  note: string
  schedule_label: string
  sort_order: number
}

export type SaleLineKey =
  | `batch:${number}`
  | `sf:${number}`
  | `retail:${number}`
  | `bouquet:${number}`
  | 'custom_bouquet'

export type HomeMoreItem =
  | { kind: 'custom'; task: HomeCustomTaskRow }
  | { kind: 'batch'; row: BatchRow }
  | { kind: 'retail'; row: RetailProductRow }
  | { kind: 'expense'; task: ExpensePaymentTaskRow }
  | { kind: 'inventory' }

export type HomeSalesDayApi = {
  date: string
  total_quantity: number
  total_amount: string
  total_cost: string
  total_supplier_payout?: string
  total_profit: string
  sales_count: number
}

export type HomeSalesRangeTotals = {
  total_quantity: number
  total_amount: string
  total_cost: string
  total_supplier_payout?: string
  total_profit: string
  sales_count: number
}

export type HomeMergedItem =
  | { kind: 'batch'; row: BatchRow }
  | { kind: 'bouquet'; row: BouquetRow }
  | { kind: 'delivery'; row: SupplierDeliveryCareRow }

/** Ключ раздела на главной (встроенный или custom_N). */
export type HomeTaskSectionKey = string

export type WarehouseSectionKey = 'deliveries' | 'flowers' | 'bouquets' | 'retail' | 'consumables'

/** Цель быстрого открытия модалки «Списание» со строки «Цветы» на складе. */
export type FlowerStockDiscardTarget =
  | {
      kind: 'aggregate'
      storeFlowerId: number
      label: string
      maxQty: number
      maxRealizationQty?: number
    }
  | { kind: 'batch'; batchId: number }

export type CollapsibleCardsVariant =
  | 'delivery'
  | 'care'
  | 'orders'
  | 'more'
  | 'batches'
  | 'bouquets'
  | 'retail'

export type BatchPatchAction =
  | 'trim_now'
  | 'water_now'
  | 'intake_done'
  | 'discard_batch'

