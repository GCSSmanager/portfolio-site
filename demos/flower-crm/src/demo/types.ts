export type FloristRole = 'owner' | 'florist' | 'customer'

export type WarehouseMode = 'basic' | 'variety' | 'advanced'

export type DemoUser = {
  id: number
  login: string
  phone: string
  password: string
  role: FloristRole
  staff_name: string
  shop_name: string
  owner_id: number | null
  subscription_until: string | null
  warehouse_mode: WarehouseMode
  basic_care_interval_days: number
  basic_next_care_date: string
  basic_care_cycle_anchor_date: string | null
  last_inventory_completed_at: string | null
  inventory_interval_days: number
  acquiring_rate_pct: string
  sbp_commission_rate_pct: string
  tax_rate_pct: string
  nav_menu_prefs: Array<{ id: string; visible: boolean }>
}

export type DemoTaxon = {
  id: number
  name: string
  name_ru: string
  rank: string
  parent_id: number | null
}

export type DemoCareRule = {
  key: string
  kind: string
  integer_value: number | null
  decimal_value: string | null
  text_value: string
  structured_value: unknown
}

export type DemoStoreFlower = {
  id: number
  user_id: number
  taxon_id: number | null
  name_override: string
  photo_path: string | null
  notes: string
  care_rules: DemoCareRule[]
}

export type DemoRetailIntake = {
  id: number
  user_id: number
  retail_product_id: number
  product_name: string
  quantity: number
  unit_cost: string
  amount_rub: string
  purchased_at: string
}

export type DemoConsumableIntake = {
  id: number
  user_id: number
  consumable_id: number
  amount_rub: string
  rolls_count: number
  quantity_added: string
  purchased_at: string
}

export type DemoBatch = {
  id: number
  user_id: number
  store_flower_id: number
  taxon_id: number
  quantity: number
  received_at: string
  last_trim_at: string | null
  last_water_change_at: string | null
  intake_pending: boolean
  unit_cost: string
  realization_quantity: number
  sale_terms_fixed_price: string | null
}

export type DemoBasicCare = {
  id: number
  user_id: number
  store_flower_id: number
  intake_pending: boolean
  last_trim_at: string | null
  last_water_change_at: string | null
}

export type DemoPrice = {
  id: number
  user_id: number
  store_flower_id: number
  taxon_id: number
  unit_price: string
}

export type DemoFlowerSale = {
  id: number
  user_id: number
  batch_id: number | null
  taxon_id: number
  store_flower_id: number
  display_name: string
  quantity: number
  unit_price: string
  unit_cost: string
  total_amount: string
  realization_quantity: number
  supplier_payout: string
  shop_profit: string
  payment_type: string
  sold_at: string
  line_kind: 'flower' | 'retail' | 'bouquet' | 'custom_bouquet'
  bouquet_name?: string | null
  retail_product_id?: number | null
}

export type DemoRetailProduct = {
  id: number
  user_id: number
  name: string
  quantity: number
  unit_cost: string
  unit_price: string
  photo_path: string | null
  created_at: string
  realization_quantity: number
  sale_terms_fixed_price: string | null
}

export type DemoConsumable = {
  id: number
  user_id: number
  name: string
  unit_kind: 'meter' | 'piece'
  meters_balance: string
  rolls_count: number
  unit_cost_per_meter: string | null
  photo_path: string | null
}

export type DemoBouquetRecipeLine = {
  store_flower_id: number
  quantity: number
}

export type DemoBouquet = {
  id: number
  user_id: number
  name: string
  unit_price: string | null
  quantity: number
  assembled_at: string | null
  last_trim_at: string | null
  last_water_change_at: string | null
  intake_pending: boolean
  photo_path: string | null
  recipe_lines: DemoBouquetRecipeLine[]
  consumable_recipe_lines: Array<{ consumable_id: number; quantity: string }>
}

export type DemoBouquetAssembly = {
  id: number
  bouquet_id: number
  user_id: number
  quantity: number
  assembled_at: string
  last_trim_at: string | null
  last_water_change_at: string | null
}

export type DemoBouquetComponent = {
  id: number
  bouquet_id: number
  assembly_id: number | null
  batch_id: number
  store_flower_id: number | null
  taxon_id: number | null
  quantity: number
}

export type DemoSupplier = {
  id: number
  user_id: number
  name: string
  legal_name: string
  legal_info: string
  address: string
  contacts: string
  notes: string
}

export type DemoSupplierOffer = {
  id: number
  supplier_id: number
  store_flower_id: number
  taxon_id: number
  unit_purchase_price: string
}

export type DemoExpense = {
  id: number
  user_id: number
  category: 'regular' | 'additional'
  name: string
  amount_rub: string
  period: string
  due_day: number | null
  expense_date: string | null
  sort_order: number
}

export type DemoExpensePayment = {
  id: number
  expense_id: number
  paid_at: string
  amount_rub: string
}

export type DemoInventoryLine = {
  id: number
  inventory_id: number
  stock_kind: string
  store_flower_id: number | null
  flower_batch_id: number | null
  retail_product_id: number | null
  bouquet_id: number | null
  display_name: string
  system_quantity: number
  counted_quantity: number
  waste_quantity: number
}

export type DemoInventory = {
  id: number
  user_id: number
  completed_at: string
  lines: DemoInventoryLine[]
}

export type DemoHomeSection = {
  id: number
  user_id: number
  section_key: string
  name: string
  is_builtin: boolean
  sort_order: number
}

export type DemoSystemTask = {
  id: number
  user_id: number
  task_key: string
  enabled: boolean
  visibility: string
  assignee_id: number | null
  section_id: number | null
}

export type DemoCustomTask = {
  id: number
  user_id: number
  name: string
  section_id: number | null
  enabled: boolean
  visibility: string
  assignee_id: number | null
  schedule_kind: string
  period: string
  due_date: string | null
  completed_at: string | null
  note: string
  sort_order: number
}

export type DemoDeliveryService = {
  id: number
  user_id: number
  name: string
  price: string
  notes: string
}

export type DemoSupplierDeliveryLine = {
  id: number
  delivery_id: number
  store_flower_id: number | null
  taxon_id: number | null
  retail_product_id: number | null
  quantity: number
  unit_purchase_price: string
  realization_quantity: number
  sale_terms_fixed_price: string | null
  received_quantity: number | null
  defect_quantity: number
}

export type DemoSupplierDelivery = {
  id: number
  user_id: number
  supplier_id: number
  expected_arrival_date: string
  status: 'pending' | 'received'
}

export type DemoCustomerOrder = {
  id: number
  user_id: number
  status: 'scheduled' | 'completed'
  delivery_service_id: number | null
  delivery_service_name: string
  pickup_at_store: boolean
  delivery_price: string
  delivery_address: string
  customer_phone: string
  scheduled_at: string
  payment_type: string
  line_kind: 'batch' | 'store_flower' | 'retail' | 'bouquet'
  batch_id: number | null
  store_flower_id: number | null
  retail_product_id: number | null
  bouquet_id: number | null
  taxon_id: number | null
  product_name: string
  quantity: number
  unit_price: string
  unit_cost: string
  realization_quantity: number
  product_total_amount: string
  total_amount: string
  completed_at?: string | null
}

export type DemoStockDiscard = {
  id: number
  user_id: number
  discarded_at: string
  kind: 'store_flower' | 'flower_batch' | 'retail' | 'bouquet' | 'consumable'
  quantity: number
  unit_cost: string
  total_cost: string
  display_name: string
  store_flower_id: number | null
  flower_batch_id: number | null
  retail_product_id: number | null
  bouquet_id: number | null
  consumable_id: number | null
  discard_meters: string | null
}

export type DemoDb = {
  demoDay: string
  nextNumericId: number
  users: DemoUser[]
  taxons: DemoTaxon[]
  storeFlowers: DemoStoreFlower[]
  batches: DemoBatch[]
  basicCare: DemoBasicCare[]
  prices: DemoPrice[]
  sales: DemoFlowerSale[]
  retailProducts: DemoRetailProduct[]
  consumables: DemoConsumable[]
  bouquets: DemoBouquet[]
  bouquetAssemblies: DemoBouquetAssembly[]
  bouquetComponents: DemoBouquetComponent[]
  suppliers: DemoSupplier[]
  supplierOffers: DemoSupplierOffer[]
  expenses: DemoExpense[]
  expensePayments: DemoExpensePayment[]
  inventories: DemoInventory[]
  homeSections: DemoHomeSection[]
  systemTasks: DemoSystemTask[]
  customTasks: DemoCustomTask[]
  deliveryServices: DemoDeliveryService[]
  supplierDeliveries: DemoSupplierDelivery[]
  supplierDeliveryLines: DemoSupplierDeliveryLine[]
  customerOrders: DemoCustomerOrder[]
  retailIntakes: DemoRetailIntake[]
  consumableIntakes: DemoConsumableIntake[]
  stockDiscards: DemoStockDiscard[]
}
