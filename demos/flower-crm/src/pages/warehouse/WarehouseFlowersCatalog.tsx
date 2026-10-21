import { useCallback, useEffect, useMemo, useState } from 'react'
import { WarehouseFlowerStockRow } from '../../components/crm/cards/WarehouseFlowerStockRow'
import { batchesByStoreFlowerId } from '../../components/crm/cards/warehouseFlowerBatches'
import type { FlowerStockDiscardTarget } from '../../components/crm'
import type { BatchRow } from '../../components/crm/stock/types'
import type { WarehouseFlowerLine } from '../../components/crm/cards/warehouseFlowerStock'
import { apiFetch } from '../../api/apiFetch'
import { useAuth } from '../../auth/AuthContext'
import type { CatalogNavState } from '../../utils/catalogNav'
import { mediaUrl } from '../../utils/mediaUrl'
import { isUpstreamErrorStatus } from '../../utils/networkError'
import { CrmButton } from '../../components/ui/CrmButton'
import { CrmPageStatus } from '../../components/ui/CrmPageStatus'
import { CrmPageToolbar } from '../../components/ui/CrmPageToolbar'
import { CatalogRowEditButton } from './CatalogRowEditButton'
import '../flowersCatalog.css'
import '../warehouse.css'
import './stock/modal-shell-taxons.css'
import '../storeFlowersPage.css'
import './warehouseFlowersCatalog.css'

export type StoreFlowerRow = {
  id: number
  name: string
  display_name: string
  photo_url: string | null
  notes: string | null
  taxon_id: number | null
  catalog_linked: boolean
  latin_name: string | null
  catalog_taxon: {
    id: number
    display_name: string
    latin_name: string
    rank_label: string
  } | null
  unit_price?: string | null
}

function storeFlowerToStockLine(f: StoreFlowerRow, stock: WarehouseFlowerLine | undefined): WarehouseFlowerLine {
  const fromFlower = f.photo_url ? mediaUrl(f.photo_url) : null
  const photo = fromFlower ?? stock?.photo_url ?? null
  return {
    mergeKey: `catalog:${f.id}`,
    store_flower_id: f.id,
    taxon_id: f.taxon_id,
    display_name: f.display_name,
    latin_name: f.catalog_linked && f.catalog_taxon ? f.catalog_taxon.latin_name : f.latin_name,
    rank_label: f.catalog_taxon?.rank_label ?? '',
    photo_url: photo,
    quantity: stock?.quantity ?? 0,
    received_at: stock?.received_at ?? null,
    last_trim_at: stock?.last_trim_at ?? null,
    last_water_change_at: stock?.last_water_change_at ?? null,
    has_intake_pending: stock?.has_intake_pending ?? false,
    realization_quantity: stock?.realization_quantity ?? 0,
  }
}

function storeFlowerDetailHint(f: StoreFlowerRow): string {
  const bits: string[] = []
  if (f.catalog_linked && f.catalog_taxon) {
    bits.push(`Каталог: ${f.catalog_taxon.display_name}`)
  } else {
    bits.push('Свой уход')
  }
  if (f.notes?.trim()) bits.push(f.notes.trim())
  return bits.join(' · ')
}

type Props = {
  stockLines: WarehouseFlowerLine[]
  /** Партии в остатке (для раскрытия в продвинутом режиме). */
  stockBatches?: BatchRow[]
  warehouseMode?: string
  catalogFlowerNav: CatalogNavState
  /** Подсказка про кнопку «Приход» в шапке */
  showIntakeHint?: boolean
  /** Владелец: открыть модалку списания с суммой по цветку / партии-сироте. */
  onOpenFlowerStockDiscard?: (target: FlowerStockDiscardTarget) => void
  /** Владелец: редактирование / добавление карточки цветка (модалка в StockCrm). */
  onOpenFlowerEdit?: (flower: StoreFlowerRow) => void
  onOpenFlowerAdd?: () => void
  /** Увеличивается после сохранения карточки — перезагрузить список. */
  reloadToken?: number
}

/** Цветы магазина на складе: строки как у остальных позиций, остаток и уход. */
export function WarehouseFlowersCatalog({
  stockLines,
  stockBatches = [],
  warehouseMode,
  catalogFlowerNav,
  onOpenFlowerStockDiscard,
  onOpenFlowerEdit,
  onOpenFlowerAdd,
  reloadToken = 0,
}: Props) {
  const { isOwner } = useAuth()
  const [flowers, setFlowers] = useState<StoreFlowerRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const stockBySfId = useMemo(() => {
    const m = new Map<number, WarehouseFlowerLine>()
    for (const line of stockLines) {
      if (line.store_flower_id != null) {
        m.set(line.store_flower_id, line)
      }
    }
    return m
  }, [stockLines])

  const orphanStockLines = useMemo(() => {
    if (flowers == null) {
      return stockLines.filter((line) => line.store_flower_id == null)
    }
    const ids = new Set(flowers.map((f) => f.id))
    return stockLines.filter(
      (line) => line.store_flower_id == null || !ids.has(line.store_flower_id),
    )
  }, [stockLines, flowers])

  const applyFlowers = useCallback((rows: StoreFlowerRow[]) => {
    setFlowers(rows)
    setError(null)
  }, [])

  const load = useCallback(() => {
    return apiFetch('/api/me/flowers/')
      .then((res) => {
        if (res.status === 401) throw new Error('Сессия недействительна.')
        if (!res.ok && isUpstreamErrorStatus(res.status)) return null
        if (!res.ok) throw new Error(`Ошибка ${res.status}`)
        return res.json() as Promise<{ flowers: StoreFlowerRow[] }>
      })
      .then((data) => {
        if (data) applyFlowers(data.flowers)
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Не удалось загрузить')
      })
  }, [applyFlowers])

  useEffect(() => {
    void load()
  }, [load, reloadToken])

  const canEditFlower = isOwner && onOpenFlowerEdit != null
  const canAddFlower = isOwner && onOpenFlowerAdd != null

  const sortedFlowers = useMemo(() => {
    if (!flowers?.length) return []
    return [...flowers].sort((a, b) =>
      a.display_name.localeCompare(b.display_name, 'ru', { sensitivity: 'base' }),
    )
  }, [flowers])

  const batchesByFlower = useMemo(
    () => batchesByStoreFlowerId(stockBatches),
    [stockBatches],
  )

  const advancedBatchesUi = warehouseMode === 'advanced'

  return (
    <div className="warehouse-flowers-catalog">
      <CrmPageToolbar
        layout="toolbar"
        density="section"
        actions={
          canAddFlower ? (
            <CrmButton variant="accent" onClick={onOpenFlowerAdd}>
              + Цветок
            </CrmButton>
          ) : null
        }
      />

      <CrmPageStatus error={error} loading={flowers === null && !error} variant="banner" />

      {flowers && flowers.length === 0 && orphanStockLines.length === 0 ? (
        <p className="store-flowers__muted">
          Пока нет цветов.
          {canAddFlower ? (
            <>
              {' '}
              <CrmButton variant="link" onClick={onOpenFlowerAdd}>
                Добавить первый
              </CrmButton>
            </>
          ) : (
            ' Владелец магазина может добавить позиции здесь.'
          )}
        </p>
      ) : null}

      {sortedFlowers.length > 0 ? (
        <ul className="warehouse-stock-list">
          {sortedFlowers.map((f) => {
            const stock = stockBySfId.get(f.id)
            const line = storeFlowerToStockLine(f, stock)
            return (
              <WarehouseFlowerStockRow
                key={f.id}
                line={line}
                warehouseMode={warehouseMode}
                flowerBatches={advancedBatchesUi ? batchesByFlower.get(f.id) : undefined}
                catalogFlowerNav={catalogFlowerNav}
                detailHint={storeFlowerDetailHint(f)}
                ownerActions={
                  canEditFlower ? <CatalogRowEditButton onClick={() => onOpenFlowerEdit(f)} /> : undefined
                }
                showStockDiscard={
                  Boolean(isOwner && line.quantity > 0 && onOpenFlowerStockDiscard)
                }
                onStockDiscard={
                  onOpenFlowerStockDiscard && line.quantity > 0
                    ? () =>
                        onOpenFlowerStockDiscard({
                          kind: 'aggregate',
                          storeFlowerId: f.id,
                          label: f.display_name,
                          maxQty: line.quantity,
                          maxRealizationQty:
                            line.realization_quantity > 0 ? line.realization_quantity : undefined,
                        })
                    : undefined
                }
              />
            )
          })}
        </ul>
      ) : null}

      {orphanStockLines.length > 0 ? (
        <>
          <p className="warehouse-flower-card__orphan-title">На складе без отдельной карточки цветка</p>
          <ul className="warehouse-stock-list">
            {orphanStockLines.map((line) => {
              const batchMatch = /^batch:(\d+)$/.exec(line.mergeKey)
              const orphanBatch =
                advancedBatchesUi && batchMatch
                  ? stockBatches.find((b) => b.id === Number(batchMatch[1]))
                  : undefined
              return (
                <WarehouseFlowerStockRow
                  key={line.mergeKey}
                  line={line}
                  warehouseMode={warehouseMode}
                  flowerBatches={orphanBatch ? [orphanBatch] : undefined}
                  catalogFlowerNav={catalogFlowerNav}
                  showStockDiscard={Boolean(isOwner && line.quantity > 0 && batchMatch && onOpenFlowerStockDiscard)}
                  onStockDiscard={
                    batchMatch && onOpenFlowerStockDiscard
                      ? () =>
                          onOpenFlowerStockDiscard({
                            kind: 'batch',
                            batchId: Number(batchMatch[1]),
                          })
                      : undefined
                  }
                />
              )
            })}
          </ul>
        </>
      ) : null}
    </div>
  )
}
