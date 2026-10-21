import { type InputHTMLAttributes, type ReactNode } from 'react'
import { isMoneyInputBad } from '../../utils/crmInput'
import { CrmField } from './CrmField'

function moneyFieldInvalid(value: string, invalidOverride?: boolean): boolean {
  return isMoneyInputBad(value) || Boolean(invalidOverride)
}

export type CrmMoneyFieldProps = {
  label: string
  value: string
  invalid?: boolean
  hint?: ReactNode
  wrapperClass?: string
  labClass?: string
  inputClass?: string
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'invalid' | 'value' | 'type' | 'inputMode'>

/** Поле суммы/цены: decimal, красная рамка при неверном вводе. */
export function CrmMoneyField({
  label,
  value,
  invalid,
  hint,
  wrapperClass = 'crm-field',
  labClass = 'crm-field__lab',
  inputClass = 'crm-field__input',
  className: inputExtraClass,
  autoComplete = 'off',
  placeholder,
  ...inputProps
}: CrmMoneyFieldProps) {
  return (
    <CrmField
      label={label}
      invalid={moneyFieldInvalid(value, invalid)}
      wrapperClass={wrapperClass}
      labClass={labClass}
      inputClass={inputClass}
      hint={hint}
      type="text"
      inputMode="decimal"
      autoComplete={autoComplete}
      placeholder={placeholder ?? '0'}
      value={value}
      className={inputExtraClass}
      {...inputProps}
    />
  )
}
