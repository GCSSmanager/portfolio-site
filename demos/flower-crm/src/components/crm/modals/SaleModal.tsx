import { type Dispatch, type FormEvent, type SetStateAction, useMemo } from 'react'
import { CrmButton } from '../../ui/CrmButton'
import { CrmModal } from '../../ui/CrmModal'
import type { SaleLineKey } from '../stock/types'
import {
  CrmInlineQtyField,
  CrmListSearch,
  CrmMoneyField,
  CrmPickField,
  CrmQtyField,
  saleStockOptionsToListSearch,
  type SaleStockOption,
} from '../../../pages/warehouse'
import {
  formatMoneyInputValue,
  isMoneyInputBad,
  isRequiredMoneyReady,
  parseStoredMoney,
} from '../../../utils/crmInput'
import { PAYMENT_TYPE_OPTIONS } from '../../../utils/paymentType'
import { CustomBouquetSaleFields, isCustomBouquetQtyFieldInvalid, maxCustomBouquetSaleQty } from './CustomBouquetSaleFields'
import { newCustomBouquetCompRow, newSaleModalLine, type SaleModalLineRow } from './saleModalLines'
import { areAllSaleModalLinesComplete, isSaleModalLineRealizationInvalid } from './saleModalValidation'
import type { StoreFlowerStockBreakdown } from '../../../utils/bouquetAssembleRealization'

type Props = {
  open: boolean
  hasSaleStock: boolean
  saleFormError: string | null
  showLineErrors: boolean
  salePaymentType: string
  onSalePaymentTypeChange: (v: string) => void
  saleStockOptions: SaleStockOption[]
  storeFlowerStockBySf: Map<number, StoreFlowerStockBreakdown>
  saleLines: SaleModalLineRow[]
  onSetSaleLines: Dispatch<SetStateAction<SaleModalLineRow[]>>
  saleBusy: boolean
  salePaymentInvalid: boolean
  onClose: () => void
  onSubmit: (e: FormEvent) => void
}

export function SaleModal({
  open,
  hasSaleStock,
  saleFormError,
  showLineErrors,
  salePaymentType,
  onSalePaymentTypeChange,
  saleStockOptions,
  storeFlowerStockBySf,
  saleLines,
  onSetSaleLines,
  saleBusy,
  salePaymentInvalid,
  onClose,
  onSubmit,
}: Props) {
  const stockListOptions = useMemo(
    () => saleStockOptionsToListSearch(saleStockOptions),
    [saleStockOptions],
  )

  const hasCustomBouquetOption = useMemo(
    () => saleStockOptions.some((o) => o.key === 'custom_bouquet'),
    [saleStockOptions],
  )

  const setRow = (rowKey: number, patch: Partial<SaleModalLineRow>) => {
    onSetSaleLines((prev) => prev.map((r) => (r.key === rowKey ? { ...r, ...patch } : r)))
  }

  const grandTotal = useMemo(() => {
    let sum = 0
    for (const row of saleLines) {
      const line = saleStockOptions.find((o) => o.key === row.lineKey)
      if (!line) continue
      const q = Number.parseInt(row.qty.trim(), 10)
      const p = Number.parseFloat(row.unitPrice.replace(',', '.'))
      if (Number.isFinite(q) && q >= 1 && Number.isFinite(p) && p > 0) {
        sum += q * p
      }
    }
    return sum
  }, [saleLines, saleStockOptions])

  const allLinesComplete = useMemo(
    () => areAllSaleModalLinesComplete(saleLines, saleStockOptions, storeFlowerStockBySf),
    [saleLines, saleStockOptions, storeFlowerStockBySf],
  )

  return (
    <CrmModal
      open={open}
      onClose={onClose}
      title="Новая продажа"
      width="2xl"
      busy={saleBusy}
      onSubmit={hasSaleStock ? onSubmit : undefined}
    >
      {!hasSaleStock ? (
        <p className="crm-sale-empty">На складе нет позиций с ненулевым остатком.</p>
      ) : (
        <>
          {saleFormError ? (
            <p className="crm-field__error" role="alert">
              {saleFormError}
            </p>
          ) : null}
          <div className={`crm-field${showLineErrors ? ' crm-field--invalid' : ''}`.trim()}>
            <span className="crm-field__lab">Состав продажи</span>
            <ul
              className={`crm-delivery-lines crm-delivery-lines--grid-cards crm-delivery-lines--sale${
                showLineErrors ? ' crm-delivery-lines--invalid' : ''
              }`.trim()}
            >
              {saleLines.map((row) => {
                const line = saleStockOptions.find((o) => o.key === row.lineKey) ?? null
                const priceCatalogMissing = Boolean(
                  line && parseStoredMoney(line.unit_price ?? null) == null,
                )
                const priceNeedsManual = priceCatalogMissing && !isRequiredMoneyReady(row.unitPrice)
                const priceFieldInvalid = Boolean(line && isMoneyInputBad(row.unitPrice))
                const realizationCap = line?.realizationAvailable ?? 0
                const q = Number.parseInt(row.qty.trim(), 10)
                const saleN = Number.isFinite(q) && q >= 1 ? q : 0
                const realizationMax =
                  realizationCap > 0 && line
                    ? Math.min(realizationCap, saleN || realizationCap)
                    : 0
                const showRealization =
                  line?.kind !== 'custom_bouquet' && realizationMax > 0
                const customMaxQty =
                  line?.kind === 'custom_bouquet'
                    ? maxCustomBouquetSaleQty(row.customComposition ?? [], storeFlowerStockBySf)
                    : line?.qty ?? 0
                const qtyInvalid = Boolean(
                  line &&
                    (line.kind === 'custom_bouquet'
                      ? isCustomBouquetQtyFieldInvalid(
                          row.qty,
                          row.customComposition ?? [],
                          storeFlowerStockBySf,
                          showLineErrors,
                        )
                      : !Number.isFinite(q) || q < 1),
                )
                const qtyShowInvalid = Boolean(
                  line &&
                    (line.kind === 'custom_bouquet'
                      ? qtyInvalid && (showLineErrors || row.qty.trim() !== '')
                      : showLineErrors && qtyInvalid),
                )
                const realizationInvalid = isSaleModalLineRealizationInvalid(row, line ?? undefined)
                const realizationShowInvalid =
                  realizationInvalid &&
                  (showLineErrors || row.realizationQty.trim() !== '')

                return (
                  <li key={row.key} className="crm-delivery-lines__row crm-delivery-lines__row--stacked">
                    <div className="crm-sale-line-fields">
                      <label className="crm-field">
                        <span className="crm-field__lab">Позиция</span>
                        <CrmListSearch
                          options={stockListOptions}
                          selectedKey={row.lineKey}
                          pinWhenEmptyKeys={hasCustomBouquetOption ? ['custom_bouquet'] : []}
                          onSelect={(key) => {
                            const k = key as SaleLineKey | ''
                            const picked = saleStockOptions.find((o) => o.key === k)
                            const catalog = picked
                              ? parseStoredMoney(picked.unit_price ?? null)
                              : null
                            setRow(row.key, {
                              lineKey: k,
                              qty: '1',
                              realizationQty: '',
                              unitPrice:
                                catalog != null ? formatMoneyInputValue(catalog) : '',
                              customName: picked?.kind === 'custom_bouquet' ? '' : row.customName,
                              customComposition:
                                picked?.kind === 'custom_bouquet'
                                  ? [newCustomBouquetCompRow()]
                                  : row.customComposition,
                            })
                          }}
                          placeholder="Партия, вид, товар…"
                          ariaLabel="Позиция"
                          invalid={showLineErrors && !row.lineKey}
                          disabled={saleBusy}
                          openListOnFocus
                        />
                      </label>
                      {line?.kind === 'custom_bouquet' ? (
                        <CustomBouquetSaleFields
                          customName={row.customName ?? ''}
                          composition={row.customComposition ?? []}
                          bouquetQty={row.qty}
                          storeFlowerStockBySf={storeFlowerStockBySf}
                          disabled={saleBusy}
                          showErrors={showLineErrors}
                          onNameChange={(v) => setRow(row.key, { customName: v })}
                          onCompositionChange={(customComposition) =>
                            setRow(row.key, { customComposition })
                          }
                        />
                      ) : null}
                      <CrmMoneyField
                        label="Цена, ₽/шт"
                        wrapperClass={`crm-field crm-field--sale-price${
                          line && priceNeedsManual ? ' crm-field--sale-price-miss' : ''
                        }`.trim()}
                        invalid={showLineErrors && priceFieldInvalid}
                        placeholder="—"
                        value={row.unitPrice}
                        disabled={!line || saleBusy}
                        onChange={(e) => setRow(row.key, { unitPrice: e.target.value })}
                      />
                      <CrmQtyField
                        label={line?.kind === 'custom_bouquet' ? 'Количество букетов' : 'Количество'}
                        min={1}
                        invalid={qtyShowInvalid}
                        hint={
                          line?.kind === 'custom_bouquet' && customMaxQty > 0
                            ? `Макс. ${customMaxQty} по составу`
                            : undefined
                        }
                        value={row.qty}
                        disabled={!line || saleBusy}
                        onChange={(e) => setRow(row.key, { qty: e.target.value })}
                        required
                      />
                      {showRealization ? (
                        <div className="crm-realization-block crm-realization-block--sale">
                          <div className="crm-realization-block__qty-row">
                            <span className="crm-realization-block__label">
                              С реализации
                              <span className="crm-realization-block__hint">
                                {' '}
                                (макс. {realizationMax})
                              </span>
                            </span>
                            <CrmInlineQtyField
                              wrapperClass={`crm-delivery-lines__qty crm-delivery-lines__qty--inline${
                                realizationShowInvalid ? ' crm-delivery-lines__qty--invalid' : ''
                              }`}
                              min={0}
                              invalid={realizationShowInvalid}
                              aria-label="С реализации"
                              value={row.realizationQty}
                              disabled={!line || saleBusy}
                              onChange={(e) =>
                                setRow(row.key, { realizationQty: e.target.value })
                              }
                              suffix={<span className="crm-delivery-lines__suffix">шт</span>}
                            />
                          </div>
                        </div>
                      ) : null}
                    </div>
                    <CrmButton
                      variant="deliveryLineRemove"
                      title="Убрать товар"
                      aria-label="Убрать товар"
                      disabled={saleLines.length < 2 || saleBusy}
                      onClick={() =>
                        onSetSaleLines((prev) =>
                          prev.length < 2 ? prev : prev.filter((r) => r.key !== row.key),
                        )
                      }
                    >
                      ×
                    </CrmButton>
                  </li>
                )
              })}
            </ul>
            <CrmButton
              variant="deliveryLineAdd"
              disabled={saleBusy || !allLinesComplete}
              onClick={() => onSetSaleLines((prev) => [...prev, newSaleModalLine()])}
            >
              + товар
            </CrmButton>
          </div>
          {grandTotal > 0 ? (
            <p className="crm-sale-total" aria-live="polite">
              Итого:{' '}
              <strong>
                {grandTotal.toLocaleString('ru-RU', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                ₽
              </strong>
            </p>
          ) : null}
          <CrmPickField
            label="Тип оплаты"
            value={salePaymentType}
            options={PAYMENT_TYPE_OPTIONS}
            onChange={onSalePaymentTypeChange}
            invalid={salePaymentInvalid}
            disabled={saleBusy}
            placeholder="Выберите способ оплаты…"
          />
          <CrmModal.Actions
            submitLabel="Подтвердить продажу"
            submitDisabled={!salePaymentType || saleBusy || !allLinesComplete}
            submitBusy={saleBusy}
          />
        </>
      )}
    </CrmModal>
  )
}
