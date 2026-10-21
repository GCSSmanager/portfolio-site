import { type InputHTMLAttributes, type ReactNode } from 'react'
import { isMoneyInputBad } from '../../utils/crmInput'
import { CrmInlineInput } from './CrmField'

export type CrmInlineDecimalFieldProps = {
  value: string
  invalid?: boolean
  wrapperClass: string
  fieldLabel?: string
  suffix?: ReactNode
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'invalid' | 'value' | 'type' | 'inputMode' | 'wrapperClass'>

/** Компактное десятичное поле (см, °C): красная рамка при неверном вводе. */
export function CrmInlineDecimalField({
  value,
  invalid,
  wrapperClass,
  fieldLabel,
  suffix,
  className: inputExtraClass,
  autoComplete = 'off',
  placeholder,
  ...inputProps
}: CrmInlineDecimalFieldProps) {
  return (
    <CrmInlineInput
      invalid={isMoneyInputBad(value) || Boolean(invalid)}
      wrapperClass={wrapperClass}
      fieldLabel={fieldLabel}
      suffix={suffix}
      type="text"
      inputMode="decimal"
      autoComplete={autoComplete}
      spellCheck={false}
      placeholder={placeholder}
      value={value}
      className={inputExtraClass}
      {...inputProps}
    />
  )
}
