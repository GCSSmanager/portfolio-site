import { type FocusEventHandler, type ReactNode } from 'react'
import { withCrmFieldInvalid } from '../../utils/crmInput'
import { isCareAnchorDateBad, isReceivedAtInputBad } from '../../utils/receivedAtRuInput'
import { CrmDateInputControl } from './CrmDateInputControl'

function dateFieldInvalid(value: string, invalidOverride?: boolean): boolean {
  return isReceivedAtInputBad(value, '') || Boolean(invalidOverride)
}

export type CrmDateFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  invalid?: boolean
  hint?: ReactNode
  wrapperClass?: string
  inputClass?: string
  dateAriaLabel?: string
  disabled?: boolean
  /** Настройки: ДД/ММ/ГГ или ДД/ММ/ГГГГ (8 цифр). */
  careAnchor?: boolean
  onBlur?: FocusEventHandler<HTMLInputElement>
}

/** Дата ДД/ММ/ГГ с маской и всплывающим календарём. */
export function CrmDateField({
  label,
  value,
  onChange,
  invalid,
  hint,
  wrapperClass = 'crm-field',
  inputClass = 'crm-field__input',
  dateAriaLabel = 'Дата',
  disabled = false,
  careAnchor = false,
  onBlur,
}: CrmDateFieldProps) {
  const bad = careAnchor
    ? isCareAnchorDateBad(value) || Boolean(invalid)
    : dateFieldInvalid(value, invalid)

  return (
    <label className={withCrmFieldInvalid(bad, wrapperClass)}>
      <span className="crm-field__lab">{label}</span>
      <CrmDateInputControl
        value={value}
        onChange={onChange}
        disabled={disabled}
        invalid={bad}
        dateAriaLabel={dateAriaLabel}
        careAnchor={careAnchor}
        onBlur={onBlur}
        inputClass={inputClass}
      />
      {hint != null ? <span className="crm-field__hint">{hint}</span> : null}
    </label>
  )
}
