import type { BatchRow } from '../stock/types'

export type WarehouseFlowerLine = {
  mergeKey: string
  store_flower_id: number | null
  taxon_id: number | null
  display_name: string
  latin_name: string | null
  rank_label: string
  photo_url: string | null
  quantity: number
  received_at: string | null
  last_trim_at: string | null
  last_water_change_at: string | null
  has_intake_pending: boolean
  realization_quantity: number
}

function isoTs(iso: string | null | undefined): number {
  if (!iso) return Number.NEGATIVE_INFINITY
  const n = Date.parse(iso)
  return Number.isFinite(n) ? n : Number.NEGATIVE_INFINITY
}

export function laterIso(a: string | null, b: string | null): string | null {
  if (isoTs(a) >= isoTs(b)) return a ?? b
  return b ?? a
}

/** Одна строка склада на вид цветка (basic-сегменты и партии с тем же store_flower_id суммируются). */
export function buildWarehouseFlowerLines(batches: BatchRow[]): WarehouseFlowerLine[] {
  const map = new Map<string, WarehouseFlowerLine>()
  for (const row of batches) {
    if (row.quantity <= 0) continue
    const mergeKey =
      row.store_flower_id != null ? `sf:${row.store_flower_id}` : `batch:${row.id}`
    const nextSlice: Omit<WarehouseFlowerLine, 'mergeKey'> = {
      store_flower_id: row.store_flower_id ?? null,
      taxon_id: row.taxon_id ?? null,
      display_name: row.display_name,
      latin_name: row.latin_name ?? null,
      rank_label: row.rank_label,
      photo_url: row.photo_url ?? null,
      quantity: row.quantity,
      received_at: row.received_at,
      last_trim_at: row.last_trim_at,
      last_water_change_at: row.last_water_change_at,
      has_intake_pending: Boolean(row.intake_pending),
      realization_quantity: row.realization_quantity ?? 0,
    }
    const hit = map.get(mergeKey)
    if (!hit) {
      map.set(mergeKey, { mergeKey, ...nextSlice })
      continue
    }
    hit.quantity += row.quantity
    hit.received_at = laterIso(hit.received_at, row.received_at)
    hit.last_trim_at = laterIso(hit.last_trim_at, row.last_trim_at)
    hit.last_water_change_at = laterIso(hit.last_water_change_at, row.last_water_change_at)
    hit.has_intake_pending = hit.has_intake_pending || Boolean(row.intake_pending)
    hit.realization_quantity += row.realization_quantity ?? 0
    if (!hit.photo_url && row.photo_url) hit.photo_url = row.photo_url
  }
  return [...map.values()].sort((a, b) =>
    a.display_name.localeCompare(b.display_name, 'ru', { sensitivity: 'base' }),
  )
}
