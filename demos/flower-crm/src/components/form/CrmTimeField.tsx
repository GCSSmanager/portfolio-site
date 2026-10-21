import { type ReactNode } from 'react'
import { withCrmFieldInvalid } from '../../utils/crmInput'
import { isReceivedAtInputBad } from '../../utils/receivedAtRuInput'
import { CrmMaskedInput } from './CrmMaskedInput'

function timeFieldInvalid(dateValue: string, timeValue: string, invalidOverride?: boolean): boolean {
  return isReceivedAtInputBad(dateValue, timeValue) || Boolean(invalidOverride)
}

export type CrmTimeFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  /** Связанная дата (для проверки «время без даты»). */
  dateValue?: string
  invalid?: boolean
  hint?: ReactNode
  wrapperClass?: string
  inputClass?: string
  timeAriaLabel?: string
}

/** Время ЧЧ:ММ с маской; необязательно, если дата пуста. */
export function CrmTimeField({
  label,
  value,
  onChange,
  dateValue = '',
  invalid,
  hint,
  wrapperClass = 'crm-field',
  inputClass = 'crm-field__input',
  timeAriaLabel = 'Время (необязательно)',
}: CrmTimeFieldProps) {
  const bad = timeFieldInvalid(dateValue, value, invalid)
  const inputCls = [inputClass, 'crm-field__input--received-time'].filter(Boolean).join(' ')

  return (
    <label className={withCrmFieldInvalid(bad, wrapperClass)}>
      <span className="crm-field__lab">{label}</span>
      <CrmMaskedInput
        kind="time"
        className={inputCls}
        type="text"
        inputMode="numeric"
        placeholder="ЧЧ:ММ"
        autoComplete="off"
        spellCheck={false}
        aria-label={timeAriaLabel}
        aria-invalid={bad || undefined}
        value={value}
        onChange={onChange}
      />
      {hint != null ? <span className="crm-field__hint">{hint}</span> : null}
    </label>
  )
}
