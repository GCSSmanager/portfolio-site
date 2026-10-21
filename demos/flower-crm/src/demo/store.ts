import { advanceBasicShopCalendarIfDue } from './basicWarehouse'
import { ensureBouquetAssembliesForAdvanced } from './bouquetAssemblies'
import { applyCanonicalDemoPhotos } from './demoArtCatalog'
import { buildTaxons, createSeedDb, mergeMissingDemoCatalog, type DemoDb } from './seed'

const DB_KEY = 'flower-demo.db'

function isoDay(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Чтобы стартовый приход не попадал в «закупки» 90‑дневной статистики. */
function ageDemoStockBatchesOutsideStatsWindow(db: DemoDb) {
  const today = db.demoDay
  const windowStart = addCalendarDays(today, -89)
  const agedDay = addCalendarDays(today, -120)
  for (const b of db.batches) {
    const d = b.received_at.slice(0, 10)
    if (d >= windowStart) {
      b.received_at = `${agedDay}T10:00:00.000Z`
    }
  }
}

function addCalendarDays(iso: string, delta: number): string {
  const d = new Date(`${iso}T12:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + delta)
  return isoDay(d)
}

function shiftIsoDateTime(value: string, deltaDays: number): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  d.setUTCDate(d.getUTCDate() + deltaDays)
  return d.toISOString()
}

function migrateDemoArtPhotoPaths(db: DemoDb) {
  const bump = (path: string | null | undefined): string | null | undefined => {
    if (path == null || !path.includes('demo-art/') || !path.endsWith('.svg')) return path
    return `${path.slice(0, -4)}.webp`
  }
  let changed = false
  for (const sf of db.storeFlowers) {
    const next = bump(sf.photo_path)
    if (next !== sf.photo_path) {
      sf.photo_path = next ?? null
      changed = true
    }
  }
  for (const b of db.bouquets) {
    const next = bump(b.photo_path)
    if (next !== b.photo_path) {
      b.photo_path = next ?? null
      changed = true
    }
  }
  for (const r of db.retailProducts) {
    const next = bump(r.photo_path)
    if (next !== r.photo_path) {
      r.photo_path = next ?? null
      changed = true
    }
  }
  for (const c of db.consumables) {
    const next = bump(c.photo_path)
    if (next !== c.photo_path) {
      c.photo_path = next ?? null
      changed = true
    }
  }
  if (changed) saveDb(db)
}

/** Сдвигаем сид на «сегодня», если якорь demoDay устарел. */
function alignDemoDay(db: DemoDb) {
  const target = isoDay(new Date())
  const from = db.demoDay
  if (!from || from === target) return

  const fromMs = Date.parse(`${from}T12:00:00.000Z`)
  const toMs = Date.parse(`${target}T12:00:00.000Z`)
  const delta = Math.round((toMs - fromMs) / 86_400_000)
  if (!delta) return

  db.demoDay = target
  for (const b of db.batches) {
    b.received_at = shiftIsoDateTime(b.received_at, delta)
    if (b.last_trim_at) b.last_trim_at = shiftIsoDateTime(b.last_trim_at, delta)
    if (b.last_water_change_at) b.last_water_change_at = shiftIsoDateTime(b.last_water_change_at, delta)
  }
  for (const c of db.basicCare) {
    if (c.last_trim_at) c.last_trim_at = shiftIsoDateTime(c.last_trim_at, delta)
    if (c.last_water_change_at) c.last_water_change_at = shiftIsoDateTime(c.last_water_change_at, delta)
  }
  for (const s of db.sales) {
    s.sold_at = shiftIsoDateTime(s.sold_at, delta)
  }
  for (const u of db.users) {
    if (u.role === 'owner') {
      u.basic_next_care_date = addCalendarDays(u.basic_next_care_date, delta)
    }
  }
  for (const t of db.customTasks) {
    if (t.due_date) t.due_date = shiftIsoDateTime(t.due_date, delta)
  }
  for (const o of db.customerOrders) {
    o.scheduled_at = shiftIsoDateTime(o.scheduled_at, delta)
    if (o.completed_at) o.completed_at = shiftIsoDateTime(o.completed_at, delta)
  }
  saveDb(db)
}

/** Данные живут в localStorage — переживают закрытие вкладки на этом устройстве. */
export function loadDb(): DemoDb {
  const raw = localStorage.getItem(DB_KEY)
  if (raw) {
    try {
      const db = JSON.parse(raw) as DemoDb
      if (!db.expensePayments) db.expensePayments = []
      if (!db.inventories) db.inventories = []
      if (!db.supplierDeliveries) db.supplierDeliveries = []
      if (!db.supplierDeliveryLines) db.supplierDeliveryLines = []
      if (!db.customerOrders) db.customerOrders = []
      if (!db.retailIntakes) db.retailIntakes = []
      if (!db.consumableIntakes) db.consumableIntakes = []
      if (!db.stockDiscards) db.stockDiscards = []
      if (!Array.isArray(db.homeSections)) db.homeSections = []
      if (!Array.isArray(db.systemTasks)) db.systemTasks = []
      if (!Array.isArray(db.customTasks)) db.customTasks = []
      if (!Array.isArray(db.prices)) db.prices = []
      if (!Array.isArray(db.bouquetAssemblies)) db.bouquetAssemblies = []
      if (!Array.isArray(db.bouquetComponents)) db.bouquetComponents = []
      if (!Array.isArray(db.taxons) || db.taxons.length === 0) db.taxons = buildTaxons()
      mergeMissingDemoCatalog(db)
      ageDemoStockBatchesOutsideStatsWindow(db)
      const photosDirty = applyCanonicalDemoPhotos(db)
      for (const sf of db.storeFlowers) {
        if (sf.notes == null) sf.notes = ''
        if (!sf.care_rules) sf.care_rules = []
      }
      migrateDemoArtPhotoPaths(db)
      alignDemoDay(db)
      let calendarDirty = false
      for (const u of db.users) {
        if (u.role === 'owner' && advanceBasicShopCalendarIfDue(db, u.id)) calendarDirty = true
      }
      const assembliesDirty = ensureBouquetAssembliesForAdvanced(db)
      if (photosDirty || calendarDirty || assembliesDirty) saveDb(db)
      return db
    } catch {
      /* reset */
    }
  }
  const fresh = createSeedDb()
  saveDb(fresh)
  return fresh
}

export function saveDb(db: DemoDb) {
  localStorage.setItem(DB_KEY, JSON.stringify(db))
}

export function resetDb() {
  localStorage.removeItem(DB_KEY)
  return loadDb()
}

export function allocId(db: DemoDb): number {
  const id = db.nextNumericId
  db.nextNumericId += 1
  return id
}

export function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`
}
