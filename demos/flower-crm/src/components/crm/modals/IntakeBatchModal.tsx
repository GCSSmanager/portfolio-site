import { type Dispatch, type FormEvent, type SetStateAction } from 'react'
import { CrmButton } from '../../ui/CrmButton'
import { CrmModal } from '../../ui/CrmModal'
import type { StockSearchHit } from '../../../utils/stockSearchQuery'
import {
  CrmDateTimeField,
  TaxonPickQtyRow,
  newTaxonQtyLine,
  type TaxonQtyLineRow,
} from '../../../pages/warehouse'

type Props = {
  open: boolean
  batchLines: TaxonQtyLineRow[]
  receivedDate: string
  receivedTime: string
  intakeFormError: string | null
  intakeInvalidField: 'lines' | 'received' | null
  receivedAtBad: boolean
  receivedAtError: string | null
  creating: boolean
  onDialogClose: () => void
  onSubmit: (e: FormEvent) => void
  onSetBatchLines: Dispatch<SetStateAction<TaxonQtyLineRow[]>>
  onSetReceivedDate: (v: string) => void
  onSetReceivedTime: (v: string) => void
  onSetBatchLineTaxon: (key: number, t: StockSearchHit | null) => void
  onSetBatchLineQty: (key: number, qty: string) => void
  onSetBatchLineUnitCost: (key: number, unitCost: string) => void
  onSetBatchLineRealizationQty: (key: number, v: string) => void
  onSetBatchLineSaleTermsFixedPrice: (key: number, v: string) => void
  onSetBatchLinePackSize: (key: number, v: string) => void
  onSetBatchLineRollsCount: (key: number, v: string) => void
}

export function IntakeBatchModal({
  open,
  batchLines,
  receivedDate,
  receivedTime,
  intakeFormError,
  intakeInvalidField,
  receivedAtBad,
  receivedAtError,
  creating,
  onDialogClose,
  onSubmit,
  onSetBatchLines,
  onSetReceivedDate,
  onSetReceivedTime,
  onSetBatchLineTaxon,
  onSetBatchLineQty,
  onSetBatchLineUnitCost,
  onSetBatchLineRealizationQty,
  onSetBatchLineSaleTermsFixedPrice,
  onSetBatchLinePackSize,
  onSetBatchLineRollsCount,
}: Props) {
  const showLineErrors = intakeInvalidField === 'lines'

  return (
    <CrmModal
      open={open}
      onClose={onDialogClose}
      title="Новый приход"
      width="2xl"
      busy={creating}
      portal
      onSubmit={onSubmit}
    >
      {intakeFormError ? (
        <p className="crm-field__error" role="alert">
          {intakeFormError}
        </p>
      ) : null}
      <div className={`crm-field${showLineErrors ? ' crm-field--invalid' : ''}`.trim()}>
        <span className="crm-field__lab">Состав прихода</span>
        <ul
          className={`crm-delivery-lines crm-delivery-lines--grid-cards crm-delivery-lines--intake${
            showLineErrors ? ' crm-delivery-lines--invalid' : ''
          }`.trim()}
        >
          {batchLines.map((ln) => (
            <li key={ln.key} className="crm-delivery-lines__row crm-delivery-lines__row--stacked">
              <TaxonPickQtyRow
                lineKey={ln.key}
                taxon={ln.taxon}
                qty={ln.qty}
                unitCost={ln.unitCost}
                quantityMin={0}
                showUnitCost
                showRealization
                realizationQty={ln.realizationQty}
                saleTermsFixedPrice={ln.saleTermsFixedPrice}
                showLineErrors={showLineErrors}
                openListOnFocus
                useStockSearch
                onUnitCostChange={onSetBatchLineUnitCost}
                onRealizationQtyChange={onSetBatchLineRealizationQty}
                onSaleTermsFixedPriceChange={onSetBatchLineSaleTermsFixedPrice}
                onQtyChange={onSetBatchLineQty}
                onTaxonChange={onSetBatchLineTaxon}
                packSize={ln.packSize ?? ''}
                rollsCount={ln.rollsCount ?? '1'}
                onPackSizeChange={onSetBatchLinePackSize}
                onRollsCountChange={onSetBatchLineRollsCount}
              />
              <CrmButton
                variant="deliveryLineRemove"
                title="Убрать позицию"
                aria-label="Убрать позицию"
                disabled={batchLines.length < 2}
                onClick={() =>
                  onSetBatchLines((prev) =>
                    prev.length < 2 ? prev : prev.filter((r) => r.key !== ln.key),
                  )
                }
              >
                ×
              </CrmButton>
            </li>
          ))}
        </ul>
        <CrmButton variant="deliveryLineAdd" onClick={() => onSetBatchLines((prev) => [...prev, newTaxonQtyLine('50', '')])}>
          + позиция
        </CrmButton>
      </div>
      <CrmDateTimeField
        label="Приход"
        dateValue={receivedDate}
        timeValue={receivedTime}
        onDateChange={onSetReceivedDate}
        onTimeChange={onSetReceivedTime}
        invalid={intakeInvalidField === 'received' || receivedAtBad}
        errorMessage={receivedAtError}
        dateAriaLabel="Дата прихода"
        timeAriaLabel="Время прихода (необязательно)"
        hint="Пусто — сейчас. Шесть цифр → ДД/ММ/ГГ. Время необязательно."
      />
      <CrmModal.Actions submitLabel="Добавить" submitBusy={creating} />
    </CrmModal>
  )
}
