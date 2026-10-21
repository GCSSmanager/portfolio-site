import type { DemoBatch, DemoCareRule, DemoDb } from './types'

export type CareIntervalCacheEntry = {
  trim: number | null
  water: number | null
  vase_life: [number, number] | null
}

const DEFAULT_CUT_DAYS = 2
const DEFAULT_WATER_DAYS = 2

function intervalDaysValue(rule: DemoCareRule | null | undefined): number | null {
  if (!rule || rule.kind !== 'integer' || rule.integer_value == null) return null
  const n = Number(rule.integer_value)
  if (!Number.isFinite(n)) return null
  return Math.max(1, Math.trunc(n))
}

function structuredIntervalPair(rule: DemoCareRule | null | undefined): [number, number] | null {
  if (!rule || rule.kind !== 'structured' || !Array.isArray(rule.structured_value)) return null
  const v = rule.structured_value
  if (v.length !== 2) return null
  const a = Number(v[0])
  const b = Number(v[1])
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null
  return [Math.min(a, b), Math.max(a, b)]
}

function ruleFromStoreFlower(db: DemoDb, storeFlowerId: number, key: string): DemoCareRule | null {
  const sf = db.storeFlowers.find((s) => s.id === storeFlowerId)
  if (!sf) return null
  const own = sf.care_rules?.find((r) => r.key === key)
  if (own) return own
  if (sf.taxon_id != null) {
    return defaultCatalogRule(key)
  }
  return defaultCatalogRule(key)
}

function defaultCatalogRule(key: string): DemoCareRule | null {
  if (key === 'cut_interval_days') {
    return { key, kind: 'integer', integer_value: DEFAULT_CUT_DAYS, decimal_value: null, text_value: '', structured_value: null }
  }
  if (key === 'water_change_interval_days') {
    return {
      key,
      kind: 'integer',
      integer_value: DEFAULT_WATER_DAYS,
      decimal_value: null,
      text_value: '',
      structured_value: null,
    }
  }
  if (key === 'vase_life_days') {
    return { key, kind: 'structured', integer_value: null, decimal_value: null, text_value: '', structured_value: [5, 8] }
  }
  return null
}

export function careIntervalCacheEntryForStoreFlower(db: DemoDb, storeFlowerId: number): CareIntervalCacheEntry {
  return {
    trim: intervalDaysValue(ruleFromStoreFlower(db, storeFlowerId, 'cut_interval_days')),
    water: intervalDaysValue(ruleFromStoreFlower(db, storeFlowerId, 'water_change_interval_days')),
    vase_life: structuredIntervalPair(ruleFromStoreFlower(db, storeFlowerId, 'vase_life_days')),
  }
}

export function careIntervalCacheEntry(db: DemoDb, taxonId: number): CareIntervalCacheEntry {
  const sf = db.storeFlowers.find((s) => s.taxon_id === taxonId)
  if (sf) return careIntervalCacheEntryForStoreFlower(db, sf.id)
  return {
    trim: DEFAULT_CUT_DAYS,
    water: DEFAULT_WATER_DAYS,
    vase_life: [5, 8],
  }
}

export function batchCareIntervals(
  db: DemoDb,
  batch: DemoBatch,
  cache: Map<string, CareIntervalCacheEntry>,
): CareIntervalCacheEntry {
  let key: string
  if (batch.store_flower_id) key = `sf:${batch.store_flower_id}`
  else if (batch.taxon_id != null) key = `taxon:${batch.taxon_id}`
  else key = `none:0`
  if (key.startsWith('none:')) return { trim: null, water: null, vase_life: null }
  let entry = cache.get(key)
  if (!entry) {
    entry =
      key.startsWith('sf:')
        ? careIntervalCacheEntryForStoreFlower(db, batch.store_flower_id)
        : careIntervalCacheEntry(db, batch.taxon_id!)
    cache.set(key, entry)
  }
  return entry
}

function calendarDaysBetween(fromIso: string, toDayIso: string): number {
  const from = fromIso.slice(0, 10)
  const to = toDayIso.slice(0, 10)
  const a = Date.parse(`${from}T12:00:00.000Z`)
  const b = Date.parse(`${to}T12:00:00.000Z`)
  return Math.round((b - a) / 86_400_000)
}

/** Пора ли действовать (как FlowerFlow care_action_needed). */
export function careActionNeeded(
  lastEvent: string | null | undefined,
  received: string,
  intervalDays: number | null | undefined,
  todayIso: string,
): boolean {
  if (intervalDays == null || intervalDays <= 0) return false
  const anchor = lastEvent ?? received
  if (!anchor) return false
  return calendarDaysBetween(anchor, todayIso) >= intervalDays
}

export function careIntervalForTaxon(db: DemoDb, taxonId: number | null): {
  trim: number | null
  water: number | null
} {
  if (taxonId == null) return { trim: DEFAULT_CUT_DAYS, water: DEFAULT_WATER_DAYS }
  const e = careIntervalCacheEntry(db, taxonId)
  return { trim: e.trim, water: e.water }
}

export function varietyCareNeedsOnClearedBatches(
  db: DemoDb,
  clearedBatches: DemoBatch[],
  taxonId: number | null,
  todayIso: string,
): { trim: boolean; water: boolean } {
  if (!clearedBatches.length) return { trim: false, water: false }
  let trim = false
  let water = false
  for (const b of clearedBatches) {
    const tid = taxonId ?? b.taxon_id
    const intervals = careIntervalForTaxon(db, tid)
    if (careActionNeeded(b.last_trim_at, b.received_at, intervals.trim, todayIso)) trim = true
    if (careActionNeeded(b.last_water_change_at, b.received_at, intervals.water, todayIso)) water = true
  }
  return { trim, water }
}
