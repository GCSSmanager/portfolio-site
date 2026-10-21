import { type InputHTMLAttributes, type ReactNode } from 'react'
import { isQtyInputBad } from '../../utils/crmInput'
import { CrmField } from './CrmField'

function qtyFieldInvalid(value: string, min: number, invalidOverride?: boolean): boolean {
  return isQtyInputBad(value, min) || Boolean(invalidOverride)
}

export type CrmQtyFieldProps = {
  label: string
  value: string
  /** Минимально допустимое целое (по умолчанию 0). */
  min?: number
  invalid?: boolean
  hint?: ReactNode
  wrapperClass?: string
  labClass?: string
  inputClass?: string
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'invalid' | 'value' | 'type' | 'inputMode' | 'min'>

/** Поле целого неотрицательного количества. */
export function CrmQtyField({
  label,
  value,
  min = 0,
  invalid,
  hint,
  wrapperClass = 'crm-field',
  labClass = 'crm-field__lab',
  inputClass = 'crm-field__input',
  className: inputExtraClass,
  autoComplete = 'off',
  placeholder,
  ...inputProps
}: CrmQtyFieldProps) {
  return (
    <CrmField
      label={label}
      invalid={qtyFieldInvalid(value, min, invalid)}
      wrapperClass={wrapperClass}
      labClass={labClass}
      inputClass={inputClass}
      hint={hint}
      type="text"
      inputMode="numeric"
      autoComplete={autoComplete}
      placeholder={placeholder ?? String(min)}
      value={value}
      className={inputExtraClass}
      {...inputProps}
    />
  )
}
