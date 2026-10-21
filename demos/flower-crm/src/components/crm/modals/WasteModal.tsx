import { CrmButton } from '../../ui/CrmButton'
import { CrmModal } from '../../ui/CrmModal'
import { CrmInlineQtyField } from '../../form/CrmInlineQtyField'
import type { BatchRow, BouquetRow, ConsumableRow, RetailProductRow } from '../stock/types'
import {
  consumableUnitLabel,
  formatConsumableQuantity,
  parseConsumableMeters,
} from '../../../utils/consumableMeters'
import { CrmListSearch, type CrmListSearchOption } from '../../../pages/warehouse'
import { CrmField, CrmQtyField } from '../../../pages/warehouse'
import { validateDiscardRealizationQty } from '../../../utils/discardRealizationQty'

export type WasteAggregateTarget = {
  storeFlowerId: number
  label: string
  maxQty: number
  maxRealizationQty?: number
}

type Props = {
  open: boolean
  wasteSearchOptions: CrmListSearchOption[]
  wasteSelectedKey: string
  wasteSelectedRow: BatchRow | null
  wasteSelectedRetailProduct: RetailProductRow | null
  wasteSelectedBouquet: BouquetRow | null
  wasteSelectedConsumable: ConsumableRow | null
  aggregateTarget: WasteAggregateTarget | null
  /** Верхняя граница «с реализации» для выбранной позиции (уже с учётом агрегации по виду). */
  maxRealizationQty: number
  discardQty: string
  onDiscardQtyChange: (v: string) => void
  discardRealizationQty: string
  onDiscardRealizationQtyChange: (v: string) => void
  discardMeters: string
  onDiscardMetersChange: (v: string) => void
  busyDiscard: boolean
  onClose: () => void
  onSelectKey: (key: string) => void
  onConfirmDiscard: () => void
}

export function WasteModal({
  open,
  wasteSearchOptions,
  wasteSelectedKey,
  wasteSelectedRow,
  wasteSelectedRetailProduct,
  wasteSelectedBouquet,
  wasteSelectedConsumable,
  aggregateTarget,
  maxRealizationQty,
  discardQty,
  onDiscardQtyChange,
  discardRealizationQty,
  onDiscardRealizationQtyChange,
  discardMeters,
  onDiscardMetersChange,
  busyDiscard,
  onClose,
  onSelectKey,
  onConfirmDiscard,
}: Props) {
  const maxMeters = parseConsumableMeters(wasteSelectedConsumable?.meters_balance) ?? 0
  const metersNum = Number.parseFloat(discardMeters.replace(',', '.'))
  const metersOk =
    wasteSelectedConsumable != null &&
    Number.isFinite(metersNum) &&
    metersNum > 0 &&
    metersNum <= maxMeters &&
    maxMeters > 0

  const maxQty =
    aggregateTarget?.maxQty ??
    wasteSelectedBouquet?.quantity ??
    wasteSelectedRetailProduct?.quantity ??
    wasteSelectedRow?.quantity ??
    0
  const maxRealization = maxRealizationQty
  const showRealization = maxRealization > 0

  const q = Number.parseInt(discardQty.trim(), 10)
  const rqTrim = discardRealizationQty.trim()
  const rq = rqTrim === '' ? 0 : Number.parseInt(rqTrim, 10)
  const qtyOk = Number.isFinite(q) && q >= 1 && q <= maxQty && maxQty > 0
  const realizationLeft =
    showRealization && Number.isFinite(rq) && rq >= 0 && rq <= maxRealization
      ? maxRealization - rq
      : null
  const realizationError =
    showRealization && qtyOk
      ? validateDiscardRealizationQty(q, rq, maxRealization, maxQty)
      : null
  const realizationOk = !showRealization || realizationError == null

  const canSubmit =
    wasteSelectedConsumable != null
      ? metersOk
      : aggregateTarget != null
        ? qtyOk && realizationOk
        : wasteSelectedBouquet != null
          ? qtyOk
          : wasteSelectedRetailProduct != null
            ? qtyOk && realizationOk
            : Boolean(wasteSelectedRow) && qtyOk && realizationOk

  const hasAnyTarget = aggregateTarget != null || wasteSearchOptions.length > 0
  const isConsumableMode = wasteSelectedConsumable != null
  const consumableUnit = consumableUnitLabel(wasteSelectedConsumable?.unit_kind)

  return (
    <CrmModal
      open={open}
      onClose={onClose}
      title="Списание"
      width="min(48rem, 94vw)"
      className="crm-modal--waste"
      bodyClassName="crm-form crm-form--tight"
    >
      {aggregateTarget == null && !hasAnyTarget ? (
        <p className="crm-sale-empty">Нет позиций с остатком для списания.</p>
      ) : (
        <>
          {aggregateTarget ? (
            <p className="crm-waste-modal__aggregate-lead">
              <strong>{aggregateTarget.label}</strong>
              <span className="crm-waste-modal__aggregate-meta">
                {' '}
                · на складе <strong>{aggregateTarget.maxQty}</strong> шт.
                {maxRealization > 0 ? (
                  <>
                    {' '}
                    · по реализации на складе <strong>{maxRealization}</strong> шт.
                  </>
                ) : null}
              </span>
            </p>
          ) : (
            <label className="crm-field">
              <span className="crm-field__lab">Позиция на складе</span>
              <CrmListSearch
                options={wasteSearchOptions}
                selectedKey={wasteSelectedKey}
                onSelect={(key) => {
                  onSelectKey(key)
                }}
                placeholder="Партия, вид, товар или букет…"
                ariaLabel="Поиск позиции для списания"
                emptyHint="Нет подходящих позиций"
                openListOnFocus
              />
            </label>
          )}
          {isConsumableMode ? (
            <CrmField
              label={`Сколько списать (${consumableUnit})`}
              value={discardMeters}
              onChange={(e) => onDiscardMetersChange(e.target.value)}
              inputMode="decimal"
              placeholder="Например: 5"
              invalid={
                discardMeters.trim() !== '' &&
                (!Number.isFinite(metersNum) || metersNum <= 0 || (maxMeters > 0 && metersNum > maxMeters))
              }
              hint={
                maxMeters > 0
                  ? `На складе ${formatConsumableQuantity(wasteSelectedConsumable?.meters_balance)} ${consumableUnit}`
                  : null
              }
            />
          ) : (
            <>
              <CrmQtyField
                label="Сколько штук списать"
                value={discardQty}
                onChange={(e) => onDiscardQtyChange(e.target.value)}
                min={1}
                max={maxQty > 0 ? maxQty : undefined}
                disabled={
                  !aggregateTarget &&
                  !wasteSelectedRow &&
                  !wasteSelectedRetailProduct &&
                  !wasteSelectedBouquet
                }
                invalid={
                  discardQty.trim() !== '' &&
                  (!Number.isFinite(q) || q < 1 || (maxQty > 0 && q > maxQty))
                }
                hint={maxQty > 0 ? `Не больше ${maxQty} шт.` : null}
              />
              {showRealization ? (
                <div className="crm-realization-block crm-realization-block--discard">
                  <div className="crm-realization-block__qty-row">
                    <span className="crm-realization-block__label">Утиль из реализации</span>
                    <CrmInlineQtyField
                      wrapperClass={`crm-delivery-lines__qty crm-delivery-lines__qty--inline${
                        realizationError != null
                          ? ' crm-delivery-lines__qty--invalid'
                          : ''
                      }`}
                      invalid={realizationError != null}
                      min={0}
                      max={Math.min(maxRealization, q > 0 ? q : maxQty)}
                      aria-label="Сколько штук утиля списать с остатка по реализации"
                      value={discardRealizationQty}
                      onChange={(e) => onDiscardRealizationQtyChange(e.target.value)}
                      suffix={<span className="crm-delivery-lines__suffix">шт</span>}
                    />
                  </div>
                  <p className="crm-realization-block__hint">
                    {realizationLeft != null ? (
                      <>
                        Останется на реализации: <strong>{realizationLeft}</strong> шт.
                      </>
                    ) : (
                      <>По реализации на складе: <strong>{maxRealization}</strong> шт.</>
                    )}
                  </p>
                  {realizationError ? (
                    <p className="crm-field__error" role="alert">
                      {realizationError}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
          <div className="crm-waste-modal__action-row" role="group" aria-label="Подтверждение">
            <CrmButton
              variant="wasteDiscard"
              disabled={!canSubmit || busyDiscard}
              onClick={() => {
                if (!canSubmit || busyDiscard) return
                onConfirmDiscard()
              }}
            >
              {busyDiscard ? '…' : 'Списать'}
            </CrmButton>
          </div>
        </>
      )}
    </CrmModal>
  )
}
