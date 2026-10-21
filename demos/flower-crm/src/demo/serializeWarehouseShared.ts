import type { BatchRow } from '../components/crm/stock/types'
import { resolveDemoPhotoUrl } from './demoArtCatalog'
import { basicPeriodicNeedClearedOnly } from './basicWarehouse'
import { varietyCareNeedsOnClearedBatches } from './careSchedule'
import type { DemoDb, DemoStoreFlower, DemoTaxon } from './types'

const RANK_LABEL_RU: Record<string, string> = {
  family: 'Семейство',
  genus: 'Род',
  species: 'Вид',
  cultivar: 'Сорт',
}

export function taxonDisplay(taxons: DemoTaxon[], id: number | null): {
  display_name: string
  latin_name: string | null
  rank: string
  rank_label: string
} {
  const t = taxons.find((x) => x.id === id)
  if (!t) {
    return { display_name: '—', latin_name: null, rank: '', rank_label: '' }
  }
  const display = (t.name_ru || t.name).trim() || t.name
  return {
    display_name: display,
    latin_name: t.name,
    rank: t.rank,
    rank_label: RANK_LABEL_RU[t.rank] ?? t.rank,
  }
}

export function storeFlowerDisplay(db: DemoDb, sf: DemoStoreFlower) {
  if (sf.name_override.trim()) {
    return {
      display_name: sf.name_override.trim(),
      latin_name: null,
      rank: '',
      rank_label: '',
      taxon_id: sf.taxon_id,
    }
  }
  const meta = taxonDisplay(db.taxons, sf.taxon_id)
  return { ...meta, taxon_id: sf.taxon_id }
}

export function priceForStoreFlower(db: DemoDb, shopUid: number, storeFlowerId: number): string | null {
  const p = db.prices.find((x) => x.user_id === shopUid && x.store_flower_id === storeFlowerId)
  return p?.unit_price ?? null
}

export function basicRowsForShop(
  db: DemoDb,
  shopUid: number,
  includeFinancials: boolean,
  todayIso: string,
): BatchRow[] {
  const owner = db.users.find((u) => u.id === shopUid)
  const interval = owner?.basic_care_interval_days ?? 3
  const warehouseMode = owner?.warehouse_mode ?? 'basic'
  const rows: BatchRow[] = []

  for (const care of db.basicCare.filter((c) => c.user_id === shopUid)) {
    const sf = db.storeFlowers.find((s) => s.id === care.store_flower_id)
    if (!sf) continue
    const batches = db.batches.filter((b) => b.store_flower_id === sf.id && b.quantity > 0)
    if (!batches.length) continue

    const meta = storeFlowerDisplay(db, sf)
    const unitPrice = priceForStoreFlower(db, shopUid, sf.id)
    const totalQty = batches.reduce((s, b) => s + b.quantity, 0)
    const realizationQty = batches.reduce((s, b) => s + (b.realization_quantity || 0), 0)
    const avgCost =
      totalQty > 0
        ? (
            batches.reduce((s, b) => s + parseFloat(b.unit_cost) * b.quantity, 0) / totalQty
          ).toFixed(2)
        : '0.00'

    const intakeBatches = batches.filter((b) => b.intake_pending)
    const clearedBatches = batches.filter((b) => !b.intake_pending)
    const hasIntake = intakeBatches.length > 0

    const clearedForCare = (scope: 'cleared' | 'intake_pending' | null) => {
      if (scope === 'intake_pending') return [] as typeof batches
      if (scope === 'cleared') return batches.filter((b) => !b.intake_pending)
      return batches.filter((b) => !b.intake_pending)
    }

    const mkRow = (
      scope: 'cleared' | 'intake_pending' | null,
      qty: number,
      intakePending: boolean,
    ): BatchRow => {
      const rowId = scope === 'intake_pending' ? care.id * 2 + 1 : care.id
      const recv = batches.reduce<string | null>((min, b) => {
        if (!min || b.received_at < min) return b.received_at
        return min
      }, null)
      let fixed: string | null = null
      if (realizationQty > 0) {
        const withFixed = batches.find((b) => b.sale_terms_fixed_price)
        fixed = withFixed?.sale_terms_fixed_price ?? null
      }
      const row: BatchRow = {
        line_kind: 'basic',
        id: rowId,
        basic_care_id: care.id,
        store_flower_id: sf.id,
        taxon_id: meta.taxon_id,
        display_name: meta.display_name,
        latin_name: meta.latin_name,
        rank: meta.rank,
        rank_label: meta.rank_label,
        photo_url: resolveDemoPhotoUrl('flower', sf.id, sf.photo_path),
        quantity: qty,
        received_at: recv,
        last_trim_at: care.last_trim_at,
        last_water_change_at: care.last_water_change_at,
        care_needs_trim: false,
        care_needs_water: false,
        intake_pending: intakePending,
        has_intake_batches: hasIntake,
        unit_price: unitPrice,
        basic_care_interval_days: interval,
        realization_quantity: realizationQty,
      }
      if (scope) row.basic_batch_scope = scope
      if (includeFinancials) row.unit_cost = avgCost
      if (realizationQty > 0 && fixed) row.sale_terms_fixed_price = fixed
      if (scope !== 'intake_pending') {
        if (warehouseMode === 'basic' && owner) {
          const periodic = basicPeriodicNeedClearedOnly(owner, clearedForCare(scope), todayIso)
          row.care_needs_trim = periodic
          row.care_needs_water = periodic
        } else if (warehouseMode === 'variety') {
          const needs = varietyCareNeedsOnClearedBatches(
            db,
            clearedForCare(scope),
            sf.taxon_id,
            todayIso,
          )
          row.care_needs_trim = needs.trim
          row.care_needs_water = needs.water
        }
      }
      return row
    }

    if (hasIntake && clearedBatches.length) {
      rows.push(mkRow('intake_pending', intakeBatches.reduce((s, b) => s + b.quantity, 0), true))
      rows.push(mkRow('cleared', clearedBatches.reduce((s, b) => s + b.quantity, 0), false))
    } else if (hasIntake) {
      rows.push(mkRow('intake_pending', totalQty, true))
    } else {
      rows.push(mkRow(null, totalQty, false))
    }
  }

  rows.sort(
    (a, b) =>
      (a.display_name || '').localeCompare(b.display_name || '', 'ru') ||
      (a.basic_batch_scope === 'intake_pending' ? 1 : 0) - (b.basic_batch_scope === 'intake_pending' ? 1 : 0),
  )
  return rows
}
