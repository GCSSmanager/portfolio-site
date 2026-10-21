import type { BatchRow } from './types'

/** Стабильный ключ строки склада (партия или сегмент базового режима) — не совпадает с числовым id партии. */
export function stockActionKey(row: BatchRow): string {
  if (row.line_kind !== 'basic') return `batch:${row.id}`
  const scope = row.basic_batch_scope ?? ''
  return `basic:${row.basic_care_id ?? row.id}:${scope}`
}
