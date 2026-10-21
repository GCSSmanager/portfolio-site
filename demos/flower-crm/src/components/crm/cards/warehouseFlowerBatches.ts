import type { BatchRow } from '../stock/types'

function isoTs(iso: string | null | undefined): number {
  if (!iso) return Number.NEGATIVE_INFINITY
  const n = Date.parse(iso)
  return Number.isFinite(n) ? n : Number.NEGATIVE_INFINITY
}

export function batchCountLabelRu(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return `${n} партия`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${n} партии`
  return `${n} партий`
}

/** Продвинутый склад: партии с остатком, сгруппированные по store_flower_id (новые сверху). */
export function batchesByStoreFlowerId(batches: BatchRow[]): Map<number, BatchRow[]> {
  const map = new Map<number, BatchRow[]>()
  for (const row of batches) {
    if (row.line_kind === 'basic' || row.store_flower_id == null || row.quantity <= 0) continue
    const id = row.store_flower_id
    const list = map.get(id) ?? []
    list.push(row)
    map.set(id, list)
  }
  for (const [id, list] of map) {
    list.sort((a, b) => {
      const dr = isoTs(b.received_at) - isoTs(a.received_at)
      if (dr !== 0) return dr
      return b.id - a.id
    })
    map.set(id, list)
  }
  return map
}
