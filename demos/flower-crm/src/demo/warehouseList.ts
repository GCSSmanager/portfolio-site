import type { BatchRow } from '../components/crm/stock/types'
import { resolveDemoPhotoUrl } from './demoArtCatalog'
import { batchCareIntervals, careActionNeeded } from './careSchedule'
import type { DemoBatch, DemoDb } from './types'
import {
  basicRowsForShop,
  priceForStoreFlower,
  storeFlowerDisplay,
  taxonDisplay,
} from './serializeWarehouseShared'

export function listBatchesForShop(
  db: DemoDb,
  shopUid: number,
  includeFinancials: boolean,
  todayIso: string,
): BatchRow[] {
  const owner = db.users.find((u) => u.id === shopUid)
  if (owner?.warehouse_mode === 'advanced') {
    return advancedBatchRows(db, shopUid, includeFinancials, todayIso)
  }
  const merged = basicRowsForShop(db, shopUid, includeFinancials, todayIso)
  return appendUnmergedBatchRows(db, shopUid, merged, includeFinancials, todayIso)
}

/** Партии без строки BasicWarehouseCare или без store_flower (хвост списка, как в prod). */
function appendUnmergedBatchRows(
  db: DemoDb,
  shopUid: number,
  rows: BatchRow[],
  includeFinancials: boolean,
  todayIso: string,
): BatchRow[] {
  const coveredSf = new Set(
    db.basicCare.filter((c) => c.user_id === shopUid).map((c) => c.store_flower_id),
  )
  const cache = new Map<string, ReturnType<typeof batchCareIntervals>>()
  const tail: BatchRow[] = []
  for (const b of db.batches.filter((x) => x.user_id === shopUid && x.quantity > 0)) {
    if (b.store_flower_id != null && coveredSf.has(b.store_flower_id)) continue
    tail.push(serializeAdvancedBatchRow(db, shopUid, b, includeFinancials, todayIso, cache))
  }
  tail.sort((a, b) => b.received_at!.localeCompare(a.received_at!) || b.id - a.id)
  return [...rows, ...tail]
}

function advancedBatchRows(
  db: DemoDb,
  shopUid: number,
  includeFinancials: boolean,
  todayIso: string,
): BatchRow[] {
  const cache = new Map<string, ReturnType<typeof batchCareIntervals>>()
  const rows = db.batches
    .filter((b) => b.user_id === shopUid && b.quantity > 0)
    .sort((a, b) => b.received_at.localeCompare(a.received_at) || b.id - a.id)

  return rows.map((b) => serializeAdvancedBatchRow(db, shopUid, b, includeFinancials, todayIso, cache))
}

function serializeAdvancedBatchRow(
  db: DemoDb,
  shopUid: number,
  batch: DemoBatch,
  includeFinancials: boolean,
  todayIso: string,
  cache: Map<string, ReturnType<typeof batchCareIntervals>>,
): BatchRow {
  const sf = batch.store_flower_id
    ? db.storeFlowers.find((s) => s.id === batch.store_flower_id)
    : null
  let display_name = '—'
  let latin_name: string | null = null
  let rank = ''
  let rank_label = ''
  let taxon_id: number | null = batch.taxon_id
  let photo_url: string | null = null
  let store_flower_id: number | null = batch.store_flower_id

  if (sf) {
    const meta = storeFlowerDisplay(db, sf)
    display_name = meta.display_name
    latin_name = meta.latin_name
    rank = meta.rank
    rank_label = meta.rank_label
    taxon_id = meta.taxon_id
    photo_url = resolveDemoPhotoUrl('flower', sf.id, sf.photo_path)
    store_flower_id = sf.id
  } else if (batch.taxon_id != null) {
    const meta = taxonDisplay(db.taxons, batch.taxon_id)
    display_name = meta.display_name
    latin_name = meta.latin_name
    rank = meta.rank
    rank_label = meta.rank_label
    taxon_id = batch.taxon_id
    const linked = db.storeFlowers.find((s) => s.user_id === shopUid && s.taxon_id === batch.taxon_id)
    if (linked) store_flower_id = linked.id
  }

  const intervals = batchCareIntervals(db, batch, cache)
  const recv = batch.received_at
  const care_needs_trim = careActionNeeded(batch.last_trim_at, recv, intervals.trim, todayIso)
  const care_needs_water = careActionNeeded(batch.last_water_change_at, recv, intervals.water, todayIso)
  const unit_price =
    store_flower_id != null ? priceForStoreFlower(db, shopUid, store_flower_id) : null

  const row: BatchRow = {
    id: batch.id,
    store_flower_id,
    taxon_id,
    display_name,
    latin_name,
    rank,
    rank_label,
    photo_url,
    quantity: batch.quantity,
    received_at: batch.received_at,
    last_trim_at: batch.last_trim_at,
    last_water_change_at: batch.last_water_change_at,
    care_needs_trim,
    care_needs_water,
    intake_pending: batch.intake_pending,
    unit_price,
    realization_quantity: batch.realization_quantity || 0,
  }
  if (includeFinancials) row.unit_cost = batch.unit_cost
  if (batch.realization_quantity > 0 && batch.sale_terms_fixed_price) {
    row.sale_terms_fixed_price = batch.sale_terms_fixed_price
  }
  return row
}
