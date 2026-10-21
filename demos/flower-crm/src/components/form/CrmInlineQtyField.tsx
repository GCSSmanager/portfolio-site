import { type InputHTMLAttributes, type ReactNode } from 'react'
import { isQtyInputBad } from '../../utils/crmInput'
import { CrmInlineInput } from './CrmField'

export type CrmInlineQtyFieldProps = {
  value: string
  min?: number
  invalid?: boolean
  wrapperClass: string
  fieldLabel?: string
  suffix?: ReactNode
  inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode']
} & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'invalid' | 'value' | 'type' | 'inputMode' | 'min' | 'wrapperClass'
>

export function CrmInlineQtyField({
  value,
  min = 0,
  invalid,
  wrapperClass,
  fieldLabel,
  suffix,
  inputMode = 'numeric',
  className: inputExtraClass,
  autoComplete = 'off',
  placeholder,
  ...inputProps
}: CrmInlineQtyFieldProps) {
  return (
    <CrmInlineInput
      invalid={isQtyInputBad(value, min) || Boolean(invalid)}
      wrapperClass={wrapperClass}
      fieldLabel={fieldLabel}
      suffix={suffix}
      type="text"
      inputMode={inputMode}
      autoComplete={autoComplete}
      spellCheck={false}
      placeholder={placeholder ?? String(min)}
      value={value}
      className={inputExtraClass}
      {...inputProps}
    />
  )
}
