import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../../api/apiFetch'
import { isQtyInputBad, isRequiredMoneyReady, isRequiredQtyReady } from '../../utils/crmInput'
import { StoreFlowerThumb } from '../../components/ui/StoreFlowerThumb'
import { normalizeTaxonSearchQuery } from '../../utils/taxonSearchQuery'
import type { StockSearchHit } from '../../utils/stockSearchQuery'
import {
  isBouquetStockHit,
  isConsumableStockHit,
  isFlowerStockHit,
  isRetailStockHit,
} from '../../utils/stockSearchQuery'
import {
  consumableIntakeBatchHint,
  consumablePackCountFieldLabel,
  consumablePackCountInlineSuffix,
  consumablePackPriceFieldLabel,
  consumablePackPriceShortLabel,
  consumablePackPriceSuffix,
  consumablePackVolumeFieldLabel,
  consumableBouquetRecipeQtyLabel,
  consumableIntakePackUnitLabel,
  intakePreviewQuantity,
  isPieceUnit,
} from '../../utils/consumableMeters'
import { CrmButton } from '../../components/ui/CrmButton'
import { CrmSearchField } from '../../components/form/CrmSearchField'
import { CrmInlineMoneyField, CrmInlineQtyField } from './CrmField'

import {
  emptyRealizationLine,
  realizationPayloadFromLine,
  RealizationLineBlock,
  type RealizationLineState,
} from './SaleTermsFields'

export type TaxonQtyLineRow = {
  key: number
  taxon: StockSearchHit | null
  qty: string
  /** Цена за шт. при приходе на склад (₽). */
  unitCost: string
  /** Расходник (приход): объём партии, число партий, сумма закупки. */
  packSize?: string
  rollsCount?: string
  purchaseTotal?: string
} & RealizationLineState

export function stockLineApiPayload(
  line: TaxonQtyLineRow,
  quantity: number,
  unitCost: string | number,
) {
  if (!line.taxon || isBouquetStockHit(line.taxon)) return null
  const base = { quantity, unit_cost: unitCost, ...realizationPayloadFromLine(line) }
  if (isRetailStockHit(line.taxon)) {
    return { retail_product_id: line.taxon.retail_product_id, ...base }
  }
  if (isFlowerStockHit(line.taxon)) {
    return {
      store_flower_id: line.taxon.store_flower_id ?? line.taxon.id,
      ...base,
    }
  }
  return null
}

let lineKeySeq = 1

export function newTaxonQtyLine(defaultQty = '20', defaultUnitCost = ''): TaxonQtyLineRow {
  return {
    key: lineKeySeq++,
    taxon: null,
    qty: defaultQty,
    unitCost: defaultUnitCost,
    packSize: '',
    rollsCount: '1',
    purchaseTotal: '',
    ...emptyRealizationLine(),
  }
}

/** Значение для поля «цена» при подстановке из закупки поставщика. */
export function formatUnitCostInput(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatOfferRub(value: number): string {
  return formatUnitCostInput(value)
}

function taxonSearchPlaceholder(
  stockKindFilter: 'flower' | 'consumable' | 'all',
  useStockSearch: boolean,
  openListOnFocus: boolean,
  searchBlocked: boolean,
): string {
  if (searchBlocked) return 'Сначала выберите поставщика'
  if (useStockSearch) {
    const minHint = openListOnFocus ? '' : ' (от 1 буквы)'
    if (stockKindFilter === 'flower') {
      return openListOnFocus ? 'Цветок' : `Цветок${minHint}`
    }
    if (stockKindFilter === 'consumable') {
      return openListOnFocus ? 'Расходник: лента, бумага…' : `Расходник${minHint}`
    }
    return openListOnFocus ? 'Цветок, товар или расходник' : `Цветок, товар или расходник${minHint}`
  }
  return openListOnFocus ? 'Цветок магазина' : 'Цветок магазина (от 2 букв)'
}

export function TaxonPickQtyRow({
  lineKey,
  taxon,
  qty,
  unitCost = '',
  quantityMin = 0,
  supplierId,
  /** Пока нет поставщика — поле поиска отключено (только модалка поставки). */
  requireSupplierForSearch = false,
  /** Редактируемая цена за шт. (приход на склад). */
  showUnitCost = false,
  /** Блок «на реализации» + условия сотрудничества. */
  showRealization = false,
  realizationQty = '',
  saleTermsFixedPrice = '',
  /** Колонка «закуп по прайсу» (плановая поставка, после выбора поставщика). */
  planOfferColumn = false,
  onQtyChange,
  onUnitCostChange,
  onRealizationQtyChange,
  onSaleTermsFixedPriceChange,
  onTaxonChange,
  packSize = '',
  rollsCount = '1',
  onPackSizeChange,
  onRollsCountChange,
  /** Подсветить незаполненные/неверные поля после попытки отправки формы */
  showLineErrors = false,
  /** Поставка / приход: по клику показать список без ввода букв */
  openListOnFocus = false,
  /** Цветы + товары без срока (`/api/me/stock/search/`). */
  useStockSearch = false,
  /** Ограничить результаты поиска: цветы, расходники или всё. */
  stockKindFilter = 'all',
  /** Расходник в рецепте букета: количество в см/шт (дробное для см). */
  bouquetConsumableQty = false,
  /** Доп. фильтр результатов поиска (например, только цветы с доступным остатком). */
  filterStockHit,
  /** Доп. признак неверного количества (например, превышает доступный остаток). */
  extraQtyInvalid = false,
}: {
  lineKey: number
  taxon: StockSearchHit | null
  qty: string
  unitCost?: string
  quantityMin?: number
  supplierId?: number | null
  requireSupplierForSearch?: boolean
  showUnitCost?: boolean
  showRealization?: boolean
  realizationQty?: string
  saleTermsFixedPrice?: string
  planOfferColumn?: boolean
  onQtyChange: (key: number, qty: string) => void
  onUnitCostChange?: (key: number, value: string) => void
  onRealizationQtyChange?: (key: number, value: string) => void
  onSaleTermsFixedPriceChange?: (key: number, value: string) => void
  onTaxonChange: (key: number, t: StockSearchHit | null) => void
  packSize?: string
  rollsCount?: string
  purchaseTotal?: string
  onPackSizeChange?: (key: number, v: string) => void
  onRollsCountChange?: (key: number, v: string) => void
  showLineErrors?: boolean
  openListOnFocus?: boolean
  useStockSearch?: boolean
  stockKindFilter?: 'flower' | 'consumable' | 'all'
  bouquetConsumableQty?: boolean
  filterStockHit?: (hit: StockSearchHit) => boolean
  extraQtyInvalid?: boolean
}) {
  const [query, setQuery] = useState(taxon?.display_name ?? '')
  const [results, setResults] = useState<StockSearchHit[]>([])
  const [ddOpen, setDdOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [empty, setEmpty] = useState(false)

  const searchBlocked =
    requireSupplierForSearch && (supplierId == null || supplierId <= 0)

  const fetchResults = useCallback(
    (rawQuery: string) => {
      if (searchBlocked) return
      const q = normalizeTaxonSearchQuery(rawQuery)
      setLoading(true)
      setEmpty(false)
      const sid = supplierId != null && supplierId > 0 ? `&supplier_id=${supplierId}` : ''
      const url = useStockSearch
        ? `/api/me/stock/search/?q=${encodeURIComponent(q)}${sid}`
        : `/api/me/flowers/search/?q=${encodeURIComponent(q)}${sid}`
      void apiFetch(url)
        .then((res) => {
          if (!res.ok) throw new Error(`Ошибка ${res.status}`)
          return res.json() as Promise<{ results: StockSearchHit[] }>
        })
        .then((data) => {
          let hits = data.results.filter((h) => !isBouquetStockHit(h))
          if (stockKindFilter === 'flower') {
            hits = hits.filter((h) => isFlowerStockHit(h))
          } else if (stockKindFilter === 'consumable') {
            hits = hits.filter((h) => isConsumableStockHit(h))
          }
          if (filterStockHit) {
            hits = hits.filter(filterStockHit)
          }
          setResults(hits)
          setDdOpen(hits.length > 0)
          setEmpty(hits.length === 0)
        })
        .catch(() => {
          setResults([])
          setDdOpen(false)
        })
        .finally(() => setLoading(false))
    },
    [searchBlocked, supplierId, useStockSearch, stockKindFilter, filterStockHit],
  )

  useEffect(() => {
    if (taxon) setQuery(taxon.display_name)
  }, [taxon])

  const taxonMissingInvalid = showLineErrors && taxon == null

  const unitCostInvalid = useMemo(() => {
    if (!showUnitCost || taxon == null) return false
    return showLineErrors && !isRequiredMoneyReady(unitCost)
  }, [showUnitCost, taxon, unitCost, showLineErrors])

  const isConsumable = taxon != null && isConsumableStockHit(taxon)

  const qtyInvalid = useMemo(() => {
    if (taxon == null) return false
    if (bouquetConsumableQty && isConsumable) {
      const n = Number.parseFloat(qty.replace(',', '.'))
      if (showLineErrors && (!Number.isFinite(n) || n <= 0)) return true
      if (taxon && isPieceUnit(taxon.unit_kind) && qty.trim() !== '' && !Number.isInteger(n)) return true
      return false
    }
    if (isConsumable) return false
    if (showLineErrors && !isRequiredQtyReady(qty, quantityMin)) return true
    return isQtyInputBad(qty, quantityMin) || extraQtyInvalid
  }, [taxon, qty, quantityMin, showLineErrors, isConsumable, bouquetConsumableQty, extraQtyInvalid])

  const packNum = Number.parseFloat((packSize ?? '').replace(',', '.'))
  const packOk = Number.isFinite(packNum) && packNum > 0
  const packInvalid = isConsumable && showLineErrors && !packOk
  const rolls = Number.parseInt((rollsCount ?? '1').trim(), 10)
  const rollsOk = Number.isFinite(rolls) && rolls >= 1
  const rollsInvalid = isConsumable && showLineErrors && !rollsOk
  const consumableUnitCostInvalid =
    isConsumable && showLineErrors && onUnitCostChange != null && !isRequiredMoneyReady(unitCost)

  const consumablePreview = useMemo(() => {
    if (!isConsumable || taxon == null || !packOk || !rollsOk) return null
    return intakePreviewQuantity(packSize ?? '', rolls, taxon.unit_kind)
  }, [isConsumable, taxon, packSize, packOk, rolls, rollsOk])

  useEffect(() => {
    if (searchBlocked) {
      setResults([])
      setDdOpen(false)
      setEmpty(false)
      setLoading(false)
      return
    }
    const q = normalizeTaxonSearchQuery(query)
    if (taxon != null && query === taxon.display_name) {
      return
    }
    const minQueryLen = useStockSearch ? 1 : 2
    if (q.length < minQueryLen) {
      if (!openListOnFocus) {
        setResults([])
        setDdOpen(false)
        setEmpty(false)
      }
      return
    }
    const tmr = window.setTimeout(() => fetchResults(query), 300)
    return () => window.clearTimeout(tmr)
  }, [query, taxon, searchBlocked, openListOnFocus, fetchResults, useStockSearch])

  return (
    <div className="crm-delivery-lines__line-body">
      <div className="crm-delivery-lines__row-top">
        <div className="crm-delivery-lines__taxon">
          <CrmSearchField
            open={ddOpen}
            onOpenChange={setDdOpen}
            invalid={taxonMissingInvalid}
            busy={loading}
            disabled={searchBlocked}
            value={query}
            placeholder={taxonSearchPlaceholder(
              stockKindFilter,
              useStockSearch,
              openListOnFocus,
              searchBlocked,
            )}
            beforeInput={
              taxon && isFlowerStockHit(taxon) ? (
                <StoreFlowerThumb
                  url={taxon.photo_url}
                  alt={taxon.display_name}
                  size={32}
                  className="crm-taxon-search__thumb"
                />
              ) : taxon && isRetailStockHit(taxon) ? (
                <StoreFlowerThumb
                  url={taxon.photo_url}
                  alt={taxon.display_name}
                  size={32}
                  variant="retail"
                  className="crm-taxon-search__thumb"
                />
              ) : taxon && isConsumableStockHit(taxon) ? (
                <StoreFlowerThumb
                  url={taxon.photo_url}
                  alt={taxon.display_name}
                  size={32}
                  variant="consumable"
                  className="crm-taxon-search__thumb"
                />
              ) : null
            }
            onChange={(e) => {
              const v = e.target.value
              setQuery(v)
              onTaxonChange(lineKey, null)
            }}
            onFocus={() => {
              if (searchBlocked) return
              if (taxon != null && query === taxon.display_name) return
              if (openListOnFocus) {
                fetchResults(query)
              }
            }}
          >
            {!searchBlocked && results.length > 0 ? (
              <ul className="crm-taxon-dd" role="listbox">
                {results.map((t) => (
                  <li
                    key={
                      isConsumableStockHit(t)
                        ? `c-${t.consumable_id}`
                        : isRetailStockHit(t)
                          ? `r-${t.retail_product_id}`
                          : `f-${t.id}`
                    }
                    role="presentation"
                  >
                    <CrmButton
                      variant="taxonDd"
                      role="option"
                      onMouseDown={(ev) => ev.preventDefault()}
                      onClick={() => {
                        onTaxonChange(lineKey, t)
                        setQuery(t.display_name)
                        setResults([])
                        setDdOpen(false)
                        setEmpty(false)
                      }}
                    >
                      {isFlowerStockHit(t) ? (
                        <StoreFlowerThumb
                          url={t.photo_url}
                          alt={t.display_name}
                          size={36}
                          className="crm-taxon-dd__thumb"
                        />
                      ) : isRetailStockHit(t) ? (
                        <StoreFlowerThumb
                          url={t.photo_url}
                          alt={t.display_name}
                          size={36}
                          variant="retail"
                          className="crm-taxon-dd__thumb"
                        />
                      ) : isConsumableStockHit(t) ? (
                        <StoreFlowerThumb
                          url={t.photo_url}
                          alt={t.display_name}
                          size={36}
                          variant="consumable"
                          className="crm-taxon-dd__thumb"
                        />
                      ) : null}
                      <span className="crm-taxon-dd__text">
                        <span className="crm-taxon-dd__title">{t.display_name}</span>
                        <span className="crm-taxon-dd__meta">
                          {isConsumableStockHit(t)
                            ? `${t.rank_label} · учёт в ${t.unit_label}`
                            : isRetailStockHit(t)
                              ? t.rank_label
                              : isFlowerStockHit(t)
                                ? `${t.latin_name ?? t.name} · ${t.rank_label}`
                                : t.rank_label}
                          {isFlowerStockHit(t) &&
                          t.unit_purchase_price != null &&
                          Number.isFinite(t.unit_purchase_price)
                            ? ` · ${formatOfferRub(t.unit_purchase_price)} ₽/шт`
                            : ''}
                        </span>
                      </span>
                    </CrmButton>
                  </li>
                ))}
              </ul>
            ) : null}
          </CrmSearchField>
          {empty && !searchBlocked ? <span className="crm-field__hint">Ничего не найдено</span> : null}
        </div>
        {planOfferColumn ? (
          <div
            className="crm-delivery-lines__plan-offer crm-delivery-lines__plan-offer--inline"
            title="Закупка по прайсу поставщика (из базы)"
          >
            <span className="crm-delivery-lines__plan-offer-val">
              {taxon != null &&
              isFlowerStockHit(taxon) &&
              taxon.unit_purchase_price != null &&
              Number.isFinite(taxon.unit_purchase_price)
                ? formatOfferRub(taxon.unit_purchase_price)
                : '—'}
            </span>
            {taxon != null &&
            isFlowerStockHit(taxon) &&
            taxon.unit_purchase_price != null &&
            Number.isFinite(taxon.unit_purchase_price) ? (
              <span className="crm-delivery-lines__suffix">₽/шт</span>
            ) : null}
          </div>
        ) : null}
        {isConsumable && onPackSizeChange && onRollsCountChange && onUnitCostChange ? (
          <div className="crm-delivery-lines__consumable-block">
            <p className="crm-field__hint crm-field__hint--tight crm-delivery-lines__consumable-hint">
              {consumableIntakeBatchHint(taxon.unit_kind)}
            </p>
            <div className="crm-delivery-lines__consumable-fields">
              <CrmInlineQtyField
                wrapperClass="crm-delivery-lines__qty"
                fieldLabel={consumablePackVolumeFieldLabel(taxon.unit_kind)}
                invalid={packInvalid}
                min={0}
                aria-label={consumablePackVolumeFieldLabel(taxon.unit_kind)}
                value={packSize ?? ''}
                onChange={(e) => onPackSizeChange(lineKey, e.target.value)}
              suffix={
                <span className="crm-delivery-lines__suffix">
                  {consumableIntakePackUnitLabel(taxon.unit_kind)}
                </span>
              }
              />
              <CrmInlineQtyField
                wrapperClass="crm-delivery-lines__qty"
                fieldLabel={consumablePackCountFieldLabel(taxon.unit_kind)}
                invalid={rollsInvalid}
                min={1}
                aria-label={consumablePackCountFieldLabel(taxon.unit_kind)}
                value={rollsCount ?? '1'}
                onChange={(e) => onRollsCountChange(lineKey, e.target.value)}
                suffix={
                  <span className="crm-delivery-lines__suffix">
                    {consumablePackCountInlineSuffix(taxon.unit_kind)}
                  </span>
                }
              />
              <CrmInlineMoneyField
                wrapperClass="crm-delivery-lines__qty crm-delivery-lines__unit-cost"
                fieldLabel={consumablePackPriceShortLabel(taxon.unit_kind)}
                invalid={consumableUnitCostInvalid}
                aria-label={consumablePackPriceFieldLabel(taxon.unit_kind)}
                value={unitCost}
                onChange={(e) => onUnitCostChange(lineKey, e.target.value)}
                suffix={
                  <span className="crm-delivery-lines__suffix">
                    {consumablePackPriceSuffix(taxon.unit_kind)}
                  </span>
                }
              />
            </div>
            {consumablePreview ? (
              <p className="crm-field__hint consumable-intake-preview" aria-live="polite">
                На склад: <strong>{consumablePreview}</strong>
              </p>
            ) : null}
          </div>
        ) : (
          <>
            {showUnitCost && onUnitCostChange != null ? (
              <CrmInlineMoneyField
                wrapperClass="crm-delivery-lines__unit-cost crm-delivery-lines__unit-cost--inline"
                invalid={unitCostInvalid}
                aria-label="Цена за штуку, ₽"
                value={unitCost}
                onChange={(e) => onUnitCostChange(lineKey, e.target.value)}
                suffix={<span className="crm-delivery-lines__suffix">₽/шт</span>}
              />
            ) : null}
            <CrmInlineQtyField
              wrapperClass="crm-delivery-lines__qty crm-delivery-lines__qty--inline"
              invalid={qtyInvalid}
              min={quantityMin}
              aria-label={
                bouquetConsumableQty && taxon && isConsumableStockHit(taxon)
                  ? consumableBouquetRecipeQtyLabel(taxon.unit_kind)
                  : 'Количество, шт.'
              }
              value={qty}
              onChange={(e) => onQtyChange(lineKey, e.target.value)}
              inputMode={bouquetConsumableQty ? 'decimal' : 'numeric'}
              suffix={
                <span className="crm-delivery-lines__suffix">
                  {bouquetConsumableQty && taxon && isConsumableStockHit(taxon)
                    ? taxon.unit_label
                    : 'шт'}
                </span>
              }
            />
          </>
        )}
      </div>
      {showRealization &&
      !isConsumable &&
      onRealizationQtyChange &&
      onSaleTermsFixedPriceChange ? (
        <RealizationLineBlock
          realizationQty={realizationQty}
          totalQty={qty}
          saleTermsFixedPrice={saleTermsFixedPrice}
          showLineErrors={showLineErrors}
          onRealizationQtyChange={(v) => onRealizationQtyChange(lineKey, v)}
          onSaleTermsFixedPriceChange={(v) => onSaleTermsFixedPriceChange(lineKey, v)}
        />
      ) : null}
    </div>
  )
}
