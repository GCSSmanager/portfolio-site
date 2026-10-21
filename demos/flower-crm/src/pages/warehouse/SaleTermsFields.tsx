import { parseMoneyInput } from '../../utils/crmInput'
import { CrmInlineMoneyField, CrmInlineQtyField } from './CrmField'

export type RealizationLineState = {
  realizationQty: string
  saleTermsFixedPrice: string
}

export const emptyRealizationLine = (): RealizationLineState => ({
  realizationQty: '',
  saleTermsFixedPrice: '',
})

function parseRealizationQtyInput(raw: string): number | null {
  const t = raw.trim()
  if (t === '') return 0
  const n = Number.parseInt(t, 10)
  return Number.isFinite(n) ? n : null
}

/** Подсветка поля «на реализации» до отправки формы. */
export function realizationQtyFieldInvalid(realizationQty: string, totalQty: string): boolean {
  const rq = parseRealizationQtyInput(realizationQty)
  if (realizationQty.trim() !== '' && rq === null) return true
  if (rq === null || rq < 0) return false
  const total = Number.parseInt(totalQty.trim(), 10)
  if (!Number.isFinite(total) || total < 1) return false
  return rq > total
}

export function validateRealizationLine(
  line: RealizationLineState,
  totalQty: number,
): string | null {
  const rq = parseRealizationQtyInput(line.realizationQty)
  if (rq === null) {
    return 'Укажите целое число «на реализации» (0 или больше).'
  }
  if (rq < 0) {
    return 'Укажите целое число «на реализации» (0 или больше).'
  }
  if (rq > totalQty) {
    return `На реализации не больше ${totalQty} шт.`
  }
  if (rq === 0) return null
  const fixed = parseMoneyInput(line.saleTermsFixedPrice)
  if (fixed == null || fixed === 'bad' || fixed <= 0) {
    return 'Укажите фиксированную цену для поставщика, ₽/шт.'
  }
  return null
}

export function realizationPayloadFromLine(line: RealizationLineState) {
  const rq = parseRealizationQtyInput(line.realizationQty) ?? 0
  const base: Record<string, unknown> = {
    realization_quantity: Number.isFinite(rq) && rq > 0 ? rq : 0,
  }
  if (!Number.isFinite(rq) || rq <= 0) {
    return base
  }
  const fixed = parseMoneyInput(line.saleTermsFixedPrice)
  return {
    ...base,
    sale_terms_fixed_price: fixed != null && fixed !== 'bad' ? String(fixed) : '',
  }
}

type RealizationBlockProps = {
  realizationQty: string
  totalQty: string
  saleTermsFixedPrice: string
  showLineErrors?: boolean
  onRealizationQtyChange: (v: string) => void
  onSaleTermsFixedPriceChange: (v: string) => void
}

/** «Из них на реализации N шт» + фикс. цена поставщику, если N &gt; 0 */
export function RealizationLineBlock({
  realizationQty,
  totalQty,
  saleTermsFixedPrice,
  showLineErrors = false,
  onRealizationQtyChange,
  onSaleTermsFixedPriceChange,
}: RealizationBlockProps) {
  const rq = parseRealizationQtyInput(realizationQty)
  const rqInvalidLive = realizationQtyFieldInvalid(realizationQty, totalQty)
  const rqInvalid =
    rqInvalidLive ||
    (showLineErrors &&
      realizationQty.trim() !== '' &&
      (rq === null || rq < 0))

  const showTerms = rq != null && rq > 0
  const rqOverTotal =
    rq != null &&
    rq > 0 &&
    Number.isFinite(Number.parseInt(totalQty.trim(), 10)) &&
    rq > Number.parseInt(totalQty.trim(), 10)
  const fixed = parseMoneyInput(saleTermsFixedPrice)
  const fixedNum = fixed != null && fixed !== 'bad' ? fixed : null
  const fixedInvalid = showLineErrors && showTerms && (fixedNum == null || fixedNum <= 0)

  return (
    <div className="crm-realization-block">
      <div className="crm-realization-block__qty-row">
        <span className="crm-realization-block__label">Из них на реализации</span>
        <CrmInlineQtyField
          wrapperClass={`crm-delivery-lines__qty crm-delivery-lines__qty--inline${rqInvalid ? ' crm-delivery-lines__qty--invalid' : ''}`}
          invalid={rqInvalid}
          min={0}
          aria-label="Количество на реализации"
          value={realizationQty}
          onChange={(e) => onRealizationQtyChange(e.target.value)}
          suffix={<span className="crm-delivery-lines__suffix">шт</span>}
        />
      </div>
      {rqOverTotal ? (
        <p className="crm-field__error" role="alert">
          На реализации не больше {Number.parseInt(totalQty.trim(), 10)} шт.
        </p>
      ) : null}
      {showTerms ? (
        <div className="crm-sale-terms crm-sale-terms--cooperation crm-sale-terms--horizontal">
          <span className="crm-field__lab">Фикс. цена поставщику</span>
          <CrmInlineMoneyField
            wrapperClass={`crm-sale-terms__inline-val${fixedInvalid ? ' crm-field--invalid' : ''}`}
            value={saleTermsFixedPrice}
            invalid={fixedInvalid}
            placeholder="—"
            aria-label="Фиксированная цена поставщику, ₽/шт"
            onChange={(e) => onSaleTermsFixedPriceChange(e.target.value)}
            suffix={<span className="crm-delivery-lines__suffix">₽/шт</span>}
          />
        </div>
      ) : null}
    </div>
  )
}