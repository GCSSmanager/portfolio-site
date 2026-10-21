import { isReceivedAtInputBad } from '../../utils/receivedAtRuInput'
import { CrmDateInputControl } from './CrmDateInputControl'
import { CrmMaskedInput } from './CrmMaskedInput'

export type CrmInlineDateTimeFieldProps = {
  dateValue: string
  timeValue: string
  onDateChange: (value: string) => void
  onTimeChange: (value: string) => void
  invalid?: boolean
  wrapperClass?: string
  dateInputClass?: string
  timeInputClass?: string
  dateAriaLabel?: string
  timeAriaLabel?: string
  title?: string
}

/** Компактная пара дата+время без подписи (строки партии). */
export function CrmInlineDateTimeField({
  dateValue,
  timeValue,
  onDateChange,
  onTimeChange,
  invalid,
  wrapperClass = 'crm-delivery-lines__line-cut',
  dateInputClass = 'crm-field__input',
  timeInputClass = 'crm-field__input crm-delivery-lines__line-cut-time',
  dateAriaLabel = 'Дата',
  timeAriaLabel = 'Время',
  title,
}: CrmInlineDateTimeFieldProps) {
  const bad = isReceivedAtInputBad(dateValue, timeValue) || Boolean(invalid)
  const wrapCls = `${wrapperClass}${bad ? ` ${wrapperClass}--invalid` : ''}`.trim()

  return (
    <div className={wrapCls} title={title}>
      <CrmDateInputControl
        value={dateValue}
        onChange={onDateChange}
        invalid={bad}
        dateAriaLabel={dateAriaLabel}
        inputClass={dateInputClass}
        compact
      />
      <CrmMaskedInput
        kind="time"
        className={timeInputClass}
        type="text"
        inputMode="numeric"
        placeholder="ЧЧ:ММ"
        autoComplete="off"
        spellCheck={false}
        aria-label={timeAriaLabel}
        aria-invalid={bad || undefined}
        value={timeValue}
        onChange={onTimeChange}
      />
    </div>
  )
}
