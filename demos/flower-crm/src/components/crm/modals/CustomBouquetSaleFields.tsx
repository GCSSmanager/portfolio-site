import { useCallback } from 'react'
import { CrmTextField } from '../../form'
import { CrmButton } from '../../ui/CrmButton'
import { TaxonPickQtyRow } from '../../../pages/warehouse'
import {
  formatStoreFlowerStockHint,
  type StoreFlowerStockBreakdown,
} from '../../../utils/bouquetAssembleRealization'
import { isFlowerStockHit, type StockSearchHit } from '../../../utils/stockSearchQuery'
import { bouquetRecipeLineIsUnfilled } from './bouquetRecipeForm'
import {
  newCustomBouquetCompRow,
  type CustomBouquetCompRow,
} from './saleModalLines'

type Props = {
  customName: string
  composition: CustomBouquetCompRow[]
  bouquetQty: string
  storeFlowerStockBySf: Map<number, StoreFlowerStockBreakdown>
  disabled?: boolean
  showErrors?: boolean
  onNameChange: (v: string) => void
  onCompositionChange: (rows: CustomBouquetCompRow[]) => void
}

export function CustomBouquetSaleFields({
  customName,
  composition,
  bouquetQty,
  storeFlowerStockBySf,
  disabled,
  showErrors,
  onNameChange,
  onCompositionChange,
}: Props) {
  const hasUnfilledLine = composition.some(bouquetRecipeLineIsUnfilled)

  const setCompRow = (rowKey: number, patch: Partial<CustomBouquetCompRow>) => {
    onCompositionChange(
      composition.map((r) => (r.key === rowKey ? { ...r, ...patch } : r)),
    )
  }

  const makeFlowerFilter = useCallback(
    (rowKey: number) =>
      (hit: StockSearchHit): boolean => {
        if (!isFlowerStockHit(hit)) return false
        const sfId = hit.store_flower_id ?? hit.id
        if ((storeFlowerStockBySf.get(sfId)?.available ?? 0) <= 0) return false
        const pickedElsewhere = composition.some(
          (r) =>
            r.key !== rowKey &&
            r.taxon &&
            isFlowerStockHit(r.taxon) &&
            (r.taxon.store_flower_id ?? r.taxon.id) === sfId,
        )
        return !pickedElsewhere
      },
    [composition, storeFlowerStockBySf],
  )

  return (
    <div className="crm-custom-bouquet-sale">
      <CrmTextField
        label="Название для продажи"
        value={customName}
        disabled={disabled}
        placeholder="Букет на заказ"
        maxLength={120}
        hint="Попадёт в историю продаж и статистику."
        onChange={(e) => onNameChange(e.target.value)}
      />
      <div className="crm-custom-bouquet-sale__composition">
        <span className="crm-field__lab">Состав одного букета</span>
        <p className="crm-field__hint crm-field__hint--tight">
          Только цветы, доступные для сборки (не на реализации).
        </p>
        <ul className="crm-custom-bouquet-sale__list">
          {composition.map((row) => (
            <li key={row.key} className="crm-custom-bouquet-sale__row crm-custom-bouquet-sale__row--stacked">
              <TaxonPickQtyRow
                lineKey={row.key}
                taxon={row.taxon}
                qty={row.qty}
                quantityMin={1}
                showLineErrors={showErrors}
                openListOnFocus
                useStockSearch
                stockKindFilter="flower"
                filterStockHit={makeFlowerFilter(row.key)}
                extraQtyInvalid={isCustomBouquetLineQtyOverStock(row, storeFlowerStockBySf, bouquetQty)}
                onQtyChange={(key, qty) => setCompRow(key, { qty })}
                onTaxonChange={(key, taxon) => setCompRow(key, { taxon })}
              />
              {row.taxon && isFlowerStockHit(row.taxon) ? (
                <p className="crm-field__hint crm-field__hint--tight bouquet-recipe-line-stock">
                  {formatStoreFlowerStockHint(
                    storeFlowerStockBySf.get(row.taxon.store_flower_id ?? row.taxon.id) ?? {
                      total: 0,
                      realization: 0,
                      available: 0,
                    },
                  )}
                </p>
              ) : null}
              <CrmButton
                variant="deliveryLineRemove"
                title="Убрать"
                aria-label="Убрать цветок из состава"
                disabled={disabled || composition.length < 2}
                onClick={() =>
                  onCompositionChange(composition.filter((r) => r.key !== row.key))
                }
              >
                ×
              </CrmButton>
            </li>
          ))}
        </ul>
        <CrmButton
          variant="deliveryLineAdd"
          disabled={disabled || hasUnfilledLine}
          onClick={() => onCompositionChange([...composition, newCustomBouquetCompRow()])}
        >
          + цветок
        </CrmButton>
      </div>
    </div>
  )
}

export function maxCustomBouquetSaleQty(
  composition: CustomBouquetCompRow[],
  stockBySf: Map<number, StoreFlowerStockBreakdown>,
): number {
  let cap = 9999
  for (const row of composition) {
    if (!row.taxon || !isFlowerStockHit(row.taxon)) continue
    const sfId = row.taxon.store_flower_id ?? row.taxon.id
    const per = Number.parseInt(row.qty.trim(), 10)
    if (!Number.isFinite(per) || per < 1) continue
    const available = stockBySf.get(sfId)?.available ?? 0
    cap = Math.min(cap, Math.floor(available / per))
  }
  return cap > 0 ? cap : 0
}

/** Макс. шт. одного цветка в одном букете при заданном числе букетов. */
export function maxPerFlowerInCustomBouquet(
  row: CustomBouquetCompRow,
  stockBySf: Map<number, StoreFlowerStockBreakdown>,
  bouquetQtyRaw: string,
): number {
  if (!row.taxon || !isFlowerStockHit(row.taxon)) return 0
  const sfId = row.taxon.store_flower_id ?? row.taxon.id
  const available = stockBySf.get(sfId)?.available ?? 0
  const bouquetCount = Number.parseInt(bouquetQtyRaw.trim(), 10)
  const bq = Number.isFinite(bouquetCount) && bouquetCount >= 1 ? bouquetCount : 1
  return Math.floor(available / bq)
}

/** Количество в строке состава превышает доступный остаток. */
export function isCustomBouquetLineQtyOverStock(
  row: CustomBouquetCompRow,
  stockBySf: Map<number, StoreFlowerStockBreakdown>,
  bouquetQtyRaw: string,
): boolean {
  if (!row.taxon || !isFlowerStockHit(row.taxon)) return false
  const t = row.qty.trim()
  if (!t) return false
  const per = Number.parseInt(t, 10)
  if (!Number.isFinite(per) || per < 1) return false
  return per > maxPerFlowerInCustomBouquet(row, stockBySf, bouquetQtyRaw)
}

export function isCustomBouquetCountInvalid(
  bouquetQtyRaw: string,
  composition: CustomBouquetCompRow[],
  stockBySf: Map<number, StoreFlowerStockBreakdown>,
): boolean {
  const t = bouquetQtyRaw.trim()
  if (!t) return false
  const q = Number.parseInt(t, 10)
  if (!Number.isFinite(q) || q < 1) return true
  const maxQty = maxCustomBouquetSaleQty(composition, stockBySf)
  return maxQty < 1 || q > maxQty
}

export function isCustomBouquetQtyFieldInvalid(
  bouquetQtyRaw: string,
  composition: CustomBouquetCompRow[],
  stockBySf: Map<number, StoreFlowerStockBreakdown>,
  showErrors: boolean,
): boolean {
  const t = bouquetQtyRaw.trim()
  if (!t) return showErrors
  return isCustomBouquetCountInvalid(bouquetQtyRaw, composition, stockBySf)
}

export function customBouquetCompositionComplete(
  composition: CustomBouquetCompRow[] | undefined,
): boolean {
  if (!composition?.length) return false
  return composition.every((row) => {
    if (bouquetRecipeLineIsUnfilled(row)) return false
    const per = Number.parseInt(row.qty.trim(), 10)
    return Number.isFinite(per) && per >= 1
  })
}
