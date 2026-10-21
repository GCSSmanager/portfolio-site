import { type ReactNode } from 'react'
import { withCrmFieldInvalid } from '../../utils/crmInput'
import {
  isReceivedAtInputBad,
  receivedAtInputBadMessage,
} from '../../utils/receivedAtRuInput'
import { CrmDateInputControl } from './CrmDateInputControl'
import { CrmMaskedInput } from './CrmMaskedInput'

function dateTimeFieldInvalid(dateValue: string, timeValue: string, invalidOverride?: boolean): boolean {
  return isReceivedAtInputBad(dateValue, timeValue) || Boolean(invalidOverride)
}

export type CrmDateTimeFieldProps = {
  label: string
  dateValue: string
  timeValue: string
  onDateChange: (value: string) => void
  onTimeChange: (value: string) => void
  invalid?: boolean
  errorMessage?: string | null
  hint?: ReactNode
  dateAriaLabel?: string
  timeAriaLabel?: string
  wrapperClass?: string
  disabled?: boolean
}

/** Дата и время в одной строке (приход, привоз и т.п.). */
export function CrmDateTimeField({
  label,
  dateValue,
  timeValue,
  onDateChange,
  onTimeChange,
  invalid,
  errorMessage = null,
  hint,
  dateAriaLabel = 'Дата',
  timeAriaLabel = 'Время (необязательно)',
  wrapperClass = 'crm-field',
  disabled = false,
}: CrmDateTimeFieldProps) {
  const bad = dateTimeFieldInvalid(dateValue, timeValue, invalid)
  const resolvedError =
    errorMessage ?? (bad ? receivedAtInputBadMessage(dateValue, timeValue) : null)

  return (
    <label className={withCrmFieldInvalid(bad, wrapperClass)}>
      <span className="crm-field__lab">{label}</span>
      <div className="crm-received-row">
        <CrmDateInputControl
          value={dateValue}
          onChange={onDateChange}
          disabled={disabled}
          invalid={bad}
          dateAriaLabel={dateAriaLabel}
          inputClass="crm-field__input"
          inRow
        />
        <CrmMaskedInput
          kind="time"
          className="crm-field__input crm-field__input--received-time"
          type="text"
          inputMode="numeric"
          placeholder="ЧЧ:ММ"
          autoComplete="off"
          spellCheck={false}
          aria-label={timeAriaLabel}
          aria-invalid={bad || undefined}
          value={timeValue}
          onChange={onTimeChange}
          disabled={disabled}
        />
      </div>
      {hint != null ? <span className="crm-field__hint">{hint}</span> : null}
      {resolvedError ? (
        <span className="crm-field__error" role="alert">
          {resolvedError}
        </span>
      ) : null}
    </label>
  )
}
