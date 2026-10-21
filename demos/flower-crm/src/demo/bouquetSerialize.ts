import type { BouquetComponentRow, BouquetRow, BouquetStockUnit } from '../components/crm/stock/types'
import { resolveDemoPhotoUrl } from './demoArtCatalog'
import { basicShopPeriodicDue } from './basicWarehouse'
import {
  batchCareIntervals,
  careActionNeeded,
  type CareIntervalCacheEntry,
} from './careSchedule'
import { storeFlowerDisplay } from './serializeWarehouseShared'
import type {
  DemoBatch,
  DemoBouquet,
  DemoBouquetAssembly,
  DemoBouquetComponent,
  DemoDb,
  DemoUser,
} from './types'
import { usesMergedWarehouseCards } from './warehouseMode'

type CareCache = Map<string, CareIntervalCacheEntry>

function bouquetComponentsForBouquet(db: DemoDb, bouquetId: number, assemblyId: number | null): DemoBouquetComponent[] {
  return (db.bouquetComponents ?? []).filter(
    (c) => c.bouquet_id === bouquetId && (assemblyId == null ? c.assembly_id == null : c.assembly_id === assemblyId),
  )
}

function displayComponentsForBouquet(db: DemoDb, b: DemoBouquet, mode: string): DemoBouquetComponent[] {
  const direct = bouquetComponentsForBouquet(db, b.id, null)
  if (direct.length || usesMergedWarehouseCards(mode)) return direct
  const asm = (db.bouquetAssemblies ?? [])
    .filter((a) => a.bouquet_id === b.id && a.quantity > 0)
    .sort((a, x) => x.assembled_at.localeCompare(a.assembled_at) || x.id - a.id)[0]
  if (!asm) return direct
  return bouquetComponentsForBouquet(db, b.id, asm.id)
}

function batchById(db: DemoDb, batchId: number): DemoBatch | undefined {
  return db.batches.find((b) => b.id === batchId)
}

function componentDisplayName(db: DemoDb, comp: DemoBouquetComponent, batch: DemoBatch): string {
  if (comp.taxon_id != null) {
    const t = db.taxons.find((x) => x.id === comp.taxon_id)
    if (t) return (t.name_ru || t.name).trim() || t.name
  }
  if (comp.store_flower_id != null) {
    const sf = db.storeFlowers.find((s) => s.id === comp.store_flower_id)
    if (sf?.name_override.trim()) return sf.name_override.trim()
    if (sf) return storeFlowerDisplay(db, sf).display_name
  }
  const sf = batch.store_flower_id ? db.storeFlowers.find((s) => s.id === batch.store_flower_id) : null
  if (sf) return storeFlowerDisplay(db, sf).display_name
  return `Партия #${batch.id}`
}

function componentCareFlags(
  db: DemoDb,
  batch: DemoBatch,
  owner: DemoUser | undefined,
  mode: string,
  todayIso: string,
  cache: CareCache,
): Pick<BouquetComponentRow, 'intake_pending' | 'care_needs_trim' | 'care_needs_water' | 'last_trim_at' | 'last_water_change_at'> {
  const intervals = batchCareIntervals(db, batch, cache)
  const recv = batch.received_at
  let needs_trim = careActionNeeded(batch.last_trim_at, recv, intervals.trim, todayIso)
  let needs_water = careActionNeeded(batch.last_water_change_at, recv, intervals.water, todayIso)
  if (mode === 'basic' && owner) {
    const periodic = bouquetBasicPeriodicDue(
      { last_trim_at: batch.last_trim_at },
      owner,
      todayIso,
    )
    needs_trim = periodic
    needs_water = periodic
  }
  return {
    intake_pending: batch.intake_pending,
    care_needs_trim: needs_trim,
    care_needs_water: needs_water,
    last_trim_at: batch.last_trim_at,
    last_water_change_at: batch.last_water_change_at,
  }
}

function bouquetBasicPeriodicDue(
  bouquet: { last_trim_at: string | null },
  owner: DemoUser,
  todayIso: string,
): boolean {
  if (!basicShopPeriodicDue(owner, todayIso)) return false
  const gate = owner.basic_care_cycle_anchor_date ?? owner.basic_next_care_date
  if (!gate) return false
  const gateDay = gate.slice(0, 10)
  const lt = bouquet.last_trim_at
  if (!lt) return true
  return lt.slice(0, 10) < gateDay
}

function minIntervalDays(days: number[]): number | null {
  if (!days.length) return null
  return Math.min(...days)
}

function bouquetAdvancedCareNeeds(
  db: DemoDb,
  components: DemoBouquetComponent[],
  todayIso: string,
  cache: CareCache,
  last_trim_at: string | null,
  last_water_at: string | null,
): { trim: boolean; water: boolean } {
  if (!components.length) return { trim: false, water: false }
  const trimDays: number[] = []
  const waterDays: number[] = []
  let received: string | null = null
  for (const comp of components) {
    const batch = batchById(db, comp.batch_id)
    if (!batch) continue
    const intervals = batchCareIntervals(db, batch, cache)
    if (intervals.trim != null) trimDays.push(intervals.trim)
    if (intervals.water != null) waterDays.push(intervals.water)
    if (!received || batch.received_at < received) received = batch.received_at
  }
  const recv = received ?? todayIso
  return {
    trim: careActionNeeded(last_trim_at, recv, minIntervalDays(trimDays), todayIso),
    water: careActionNeeded(last_water_at, recv, minIntervalDays(waterDays), todayIso),
  }
}

function bouquetCareNeeds(
  db: DemoDb,
  _b: DemoBouquet,
  owner: DemoUser | undefined,
  components: DemoBouquetComponent[],
  todayIso: string,
  cache: CareCache,
  last_trim_at: string | null,
  last_water_at: string | null,
): { trim: boolean; water: boolean } {
  const mode = owner?.warehouse_mode ?? 'basic'
  if (mode === 'basic' && owner) {
    const periodic = bouquetBasicPeriodicDue({ last_trim_at }, owner, todayIso)
    return { trim: periodic, water: periodic }
  }
  return bouquetAdvancedCareNeeds(db, components, todayIso, cache, last_trim_at, last_water_at)
}

function assemblyLabel(assembled_at: string): string {
  const d = new Date(assembled_at)
  if (Number.isNaN(d.getTime())) return assembled_at
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${dd}.${mm}.${yyyy} ${hh}:${min}`
}

function bouquetStockUnits(
  db: DemoDb,
  b: DemoBouquet,
  owner: DemoUser | undefined,
  todayIso: string,
  cache: CareCache,
): BouquetStockUnit[] {
  const mode = owner?.warehouse_mode ?? 'basic'
  if (usesMergedWarehouseCards(mode)) return []
  const assemblies = (db.bouquetAssemblies ?? [])
    .filter((a) => a.bouquet_id === b.id && a.quantity > 0)
    .sort((a, b) => b.assembled_at.localeCompare(a.assembled_at) || b.id - a.id)

  if (assemblies.length) {
    return assemblies.map((asm) => {
      const comps = bouquetComponentsForBouquet(db, b.id, asm.id)
      const needs = bouquetCareNeeds(
        db,
        b,
        owner,
        comps,
        todayIso,
        cache,
        asm.last_trim_at,
        asm.last_water_change_at,
      )
      return {
        assembly_id: asm.id,
        assembly_label: assemblyLabel(asm.assembled_at),
        quantity: asm.quantity,
        assembled_at: asm.assembled_at,
        last_trim_at: asm.last_trim_at,
        last_water_change_at: asm.last_water_change_at,
        care_needs_trim: needs.trim,
        care_needs_water: needs.water,
      }
    })
  }
  const qty = b.quantity
  if (qty <= 0) return []
  const comps = bouquetComponentsForBouquet(db, b.id, null)
  const needs = bouquetCareNeeds(
    db,
    b,
    owner,
    comps,
    todayIso,
    cache,
    b.last_trim_at,
    b.last_water_change_at,
  )
  return [
    {
      assembly_id: null,
      assembly_label: null,
      quantity: qty,
      assembled_at: b.assembled_at,
      last_trim_at: b.last_trim_at,
      last_water_change_at: b.last_water_change_at,
      care_needs_trim: needs.trim,
      care_needs_water: needs.water,
    },
  ]
}

export function serializeBouquetRow(
  db: DemoDb,
  b: DemoBouquet,
  owner: DemoUser | undefined,
  includeCost: boolean,
  todayIso: string,
): BouquetRow {
  const cache: CareCache = new Map()
  const mode = owner?.warehouse_mode ?? 'basic'
  const components = displayComponentsForBouquet(db, b, mode)
  const component_rows: BouquetComponentRow[] = []
  for (const comp of components) {
    const batch = batchById(db, comp.batch_id)
    if (!batch) continue
    const flags = componentCareFlags(db, batch, owner, mode, todayIso, cache)
    component_rows.push({
      batch_id: comp.batch_id,
      store_flower_id: comp.store_flower_id ?? batch.store_flower_id,
      taxon_id: comp.taxon_id ?? batch.taxon_id,
      display_name: componentDisplayName(db, comp, batch),
      quantity: comp.quantity,
      ...flags,
    })
  }

  let last_trim_at = b.last_trim_at
  let last_water_at = b.last_water_change_at
  let careComponents = components
  if (!usesMergedWarehouseCards(mode)) {
    const assemblies = (db.bouquetAssemblies ?? []).filter((a) => a.bouquet_id === b.id && a.quantity > 0)
    if (assemblies.length) {
      const asm = assemblies.reduce((best, a) => {
        const bt = best.last_trim_at ?? todayIso
        const at = a.last_trim_at ?? todayIso
        return at < bt ? a : best
      }, assemblies[0]!)
      careComponents = bouquetComponentsForBouquet(db, b.id, asm.id)
      last_trim_at = asm.last_trim_at
      last_water_at = asm.last_water_change_at
    }
  }

  const needs = bouquetCareNeeds(
    db,
    b,
    owner,
    careComponents,
    todayIso,
    cache,
    last_trim_at,
    last_water_at,
  )

  const recipe_lines = b.recipe_lines.map((ln) => {
    const sf = db.storeFlowers.find((s) => s.id === ln.store_flower_id)
    const meta = sf ? storeFlowerDisplay(db, sf) : { display_name: '—', taxon_id: null }
    return {
      store_flower_id: ln.store_flower_id,
      taxon_id: meta.taxon_id,
      display_name: meta.display_name,
      quantity: ln.quantity,
      photo_url: sf ? resolveDemoPhotoUrl('flower', sf.id, sf.photo_path) : null,
    }
  })
  const consumable_recipe_lines = b.consumable_recipe_lines.map((ln) => {
    const c = db.consumables.find((x) => x.id === ln.consumable_id)
    return {
      consumable_id: ln.consumable_id,
      display_name: c?.name ?? '—',
      unit_kind: c?.unit_kind ?? 'piece',
      unit_label: c?.unit_kind === 'meter' ? 'м' : 'шт',
      quantity: ln.quantity,
      photo_url: c ? resolveDemoPhotoUrl('consumable', c.id, c.photo_path) : null,
    }
  })

  const row: BouquetRow = {
    id: b.id,
    kind: 'bouquet',
    name: b.name,
    photo_url: resolveDemoPhotoUrl('bouquet', b.id, b.photo_path),
    quantity: b.quantity,
    unit_price: b.unit_price,
    assembled_at: b.assembled_at ?? new Date().toISOString(),
    intake_pending: b.intake_pending,
    care_needs_trim: needs.trim,
    care_needs_water: needs.water,
    last_trim_at,
    last_water_change_at: last_water_at,
    recipe_lines,
    consumable_recipe_lines,
    components: component_rows,
  }
  if (includeCost) row.unit_cost = '0.00'
  if (!usesMergedWarehouseCards(mode)) {
    row.stock_units = bouquetStockUnits(db, b, owner, todayIso, cache)
  }
  return row
}

export function listBouquetsForUser(
  db: DemoDb,
  shopUid: number,
  owner: DemoUser | undefined,
  includeCost: boolean,
  todayIso: string,
): BouquetRow[] {
  return db.bouquets
    .filter((b) => b.user_id === shopUid)
    .sort((a, b) => a.name.localeCompare(b.name, 'ru') || a.id - b.id)
    .map((b) => serializeBouquetRow(db, b, owner, includeCost, todayIso))
}

export function listBouquetCareUnitsForUser(
  db: DemoDb,
  shopUid: number,
  owner: DemoUser | undefined,
  includeCost: boolean,
  todayIso: string,
): BouquetRow[] {
  const mode = owner?.warehouse_mode ?? 'basic'
  const out: BouquetRow[] = []
  for (const bouquet of db.bouquets.filter((b) => b.user_id === shopUid).sort((a, b) => a.name.localeCompare(b.name, 'ru') || a.id - b.id)) {
    if (usesMergedWarehouseCards(mode)) {
      if (bouquet.quantity <= 0) continue
      const row = serializeBouquetRow(db, bouquet, owner, includeCost, todayIso)
      if (row.care_needs_trim || row.care_needs_water) out.push(row)
      continue
    }
    const assemblies = (db.bouquetAssemblies ?? [])
      .filter((a) => a.bouquet_id === bouquet.id && a.quantity > 0)
      .sort((a, b) => b.assembled_at.localeCompare(a.assembled_at) || b.id - a.id)
    if (assemblies.length) {
      for (const asm of assemblies) {
        const row = serializeBouquetCareUnit(db, bouquet, asm, owner, includeCost, todayIso)
        if (row.care_needs_trim || row.care_needs_water) out.push(row)
      }
      continue
    }
    if (bouquet.quantity <= 0) continue
    const row = serializeBouquetCareUnit(db, bouquet, null, owner, includeCost, todayIso)
    if (row.care_needs_trim || row.care_needs_water) out.push(row)
  }
  return out
}

function serializeBouquetCareUnit(
  db: DemoDb,
  bouquet: DemoBouquet,
  assembly: DemoBouquetAssembly | null,
  owner: DemoUser | undefined,
  includeCost: boolean,
  todayIso: string,
): BouquetRow {
  const base = serializeBouquetRow(db, bouquet, owner, includeCost, todayIso)
  if (assembly == null) return base
  const comps = bouquetComponentsForBouquet(db, bouquet.id, assembly.id)
  const cache: CareCache = new Map()
  const needs = bouquetCareNeeds(
    db,
    bouquet,
    owner,
    comps,
    todayIso,
    cache,
    assembly.last_trim_at,
    assembly.last_water_change_at,
  )
  return {
    ...base,
    quantity: assembly.quantity,
    assembled_at: assembly.assembled_at,
    last_trim_at: assembly.last_trim_at,
    last_water_change_at: assembly.last_water_change_at,
    care_needs_trim: needs.trim,
    care_needs_water: needs.water,
    assembly_id: assembly.id,
    assembly_label: assemblyLabel(assembly.assembled_at),
    intake_pending: false,
  }
}
