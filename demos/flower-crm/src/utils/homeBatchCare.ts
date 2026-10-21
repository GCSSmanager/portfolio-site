import type { BatchRow, BouquetRow } from '../components/crm/stock/types'

export function batchNeedsIntake(b: BatchRow): boolean {
  return Boolean(
    b.intake_pending ||
      (b.has_intake_batches && b.basic_batch_scope === 'intake_pending'),
  )
}

export function batchNeedsCareOnly(b: BatchRow): boolean {
  return !batchNeedsIntake(b) && Boolean(b.care_needs_trim || b.care_needs_water)
}

export function bouquetNeedsIntake(b: BouquetRow): boolean {
  return Boolean(b.intake_pending)
}

export function bouquetNeedsCareOnly(b: BouquetRow): boolean {
  return !bouquetNeedsIntake(b) && Boolean(b.care_needs_trim || b.care_needs_water)
}
