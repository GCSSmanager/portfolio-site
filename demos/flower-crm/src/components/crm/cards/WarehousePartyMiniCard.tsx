import type { BatchRow, BouquetRow, BouquetStockUnit } from '../stock/types'
import { formatWhenCompact } from '../stock/formatWhenCompact'

export type WarehousePartyMiniCardProps = {
  /** Заголовок: #партия или дата сборки. */
  title: string
  quantity: number
  /** Цветы: приход; букеты: сборка. */
  arrivalLabel: 'Приход' | 'Сборка'
  arrivalAt: string | null
  lastWaterAt: string | null
  lastTrimAt: string | null
  intakePending?: boolean
}

/** Партии сборки для раскрытия (API stock_units или запасной вариант по строке букета). */
export function resolveBouquetStockUnits(row: BouquetRow): BouquetStockUnit[] {
  if (row.stock_units?.length) return row.stock_units
  if (row.quantity <= 0) return []
  return [
    {
      assembly_id: row.assembly_id ?? null,
      assembly_label: row.assembly_label ?? null,
      quantity: row.quantity,
      assembled_at: row.assembled_at ?? null,
      last_trim_at: row.last_trim_at ?? null,
      last_water_change_at: row.last_water_change_at ?? null,
    },
  ]
}

export function batchPartyMiniProps(row: BatchRow): WarehousePartyMiniCardProps {
  return {
    title: `#${row.id}`,
    quantity: row.quantity,
    arrivalLabel: 'Приход',
    arrivalAt: row.received_at,
    lastWaterAt: row.last_water_change_at,
    lastTrimAt: row.last_trim_at,
    intakePending: Boolean(row.intake_pending),
  }
}

export function bouquetUnitPartyMiniProps(unit: BouquetStockUnit): WarehousePartyMiniCardProps {
  return {
    title: unit.assembly_label ?? (unit.assembled_at ? formatPartyTitleFromIso(unit.assembled_at) : 'Партия'),
    quantity: unit.quantity,
    arrivalLabel: 'Сборка',
    arrivalAt: unit.assembled_at,
    lastWaterAt: unit.last_water_change_at,
    lastTrimAt: unit.last_trim_at,
    intakePending: false,
  }
}

function formatPartyTitleFromIso(iso: string): string {
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return 'Партия'
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function WarehousePartyMiniCard({
  title,
  quantity,
  arrivalLabel,
  arrivalAt,
  lastWaterAt,
  lastTrimAt,
  intakePending = false,
}: WarehousePartyMiniCardProps) {
  return (
    <article className="warehouse-party-mini">
      <div className="warehouse-party-mini__head">
        <span className="warehouse-party-mini__title">{title}</span>
        <span className="warehouse-party-mini__qty">
          <strong>{quantity}</strong> шт
        </span>
        {intakePending ? <span className="warehouse-party-mini__badge">Приёмка</span> : null}
      </div>
      <div className="warehouse-party-mini__dates">
        <span className="warehouse-party-mini__date">
          <span className="warehouse-party-mini__date-lab">{arrivalLabel}</span>
          <span className="warehouse-party-mini__date-val">
            {arrivalAt ? formatWhenCompact(arrivalAt) : '—'}
          </span>
        </span>
        <span className="warehouse-party-mini__date">
          <span className="warehouse-party-mini__date-lab">Вода</span>
          <span className="warehouse-party-mini__date-val">
            {lastWaterAt ? formatWhenCompact(lastWaterAt) : '—'}
          </span>
        </span>
        <span className="warehouse-party-mini__date">
          <span className="warehouse-party-mini__date-lab">Подрезка</span>
          <span className="warehouse-party-mini__date-val">
            {lastTrimAt ? formatWhenCompact(lastTrimAt) : '—'}
          </span>
        </span>
      </div>
    </article>
  )
}
