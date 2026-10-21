import { formatWhenCompact, lastCareIso } from '../stock/formatWhenCompact'

export type WarehouseStockCareMetaProps = {
  warehouseMode?: string
  received_at?: string | null
  assembled_at?: string | null
  last_trim_at: string | null
  last_water_change_at: string | null
  /** Букет: первая строка «Сборка» вместо «Приход». */
  kind?: 'flower' | 'bouquet'
}

type CareMetaLine = { key: string; label: string; iso: string | null }

export function warehouseStockCareMetaLines({
  warehouseMode,
  last_trim_at,
  last_water_change_at,
}: WarehouseStockCareMetaProps): CareMetaLine[] {
  const merged = warehouseMode === 'basic' || warehouseMode === 'variety'
  if (merged) {
    return [
      {
        key: 'last-care',
        label: 'Последний уход',
        iso: lastCareIso(last_trim_at, last_water_change_at),
      },
    ]
  }
  // Продвинутый: даты по партиям в раскрытии, в сводной строке не дублируем.
  return []
}

export function WarehouseStockCareMeta(props: WarehouseStockCareMetaProps) {
  const lines = warehouseStockCareMetaLines(props)
  if (lines.length === 0) return null
  return (
    <p className="warehouse-stock-row__care warehouse-stock-row__care--meta">
      {lines.map((line, i) => (
        <span key={line.key}>
          {i > 0 ? <span className="warehouse-stock-row__care-sep"> · </span> : null}
          {line.label} · {line.iso ? formatWhenCompact(line.iso) : '—'}
        </span>
      ))}
    </p>
  )
}
