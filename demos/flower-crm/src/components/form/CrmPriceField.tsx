import { type InputHTMLAttributes } from 'react'
import { isMoneyInputBad, withCrmFieldInvalid } from '../../utils/crmInput'

export type CrmPriceFieldProps = {
  label: string
  value: string
  invalid?: boolean
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'invalid' | 'value'>

/** Поле цены в списке «Цены» (компактная вёрстка + проверка суммы). */
export function CrmPriceField({
  label,
  value,
  invalid,
  className: inputExtraClass,
  autoComplete = 'off',
  placeholder = '—',
  type: inputType = 'text',
  inputMode: inputModeProp = 'decimal',
  ...inputProps
}: CrmPriceFieldProps) {
  const inputCls = ['crm-price-field__input', inputExtraClass].filter(Boolean).join(' ')
  const moneyInvalid = isMoneyInputBad(value) || Boolean(invalid)
  return (
    <label className={withCrmFieldInvalid(moneyInvalid, 'crm-price-field crm-price-field--row')}>
      <span className="crm-price-field__lab">{label}</span>
      <input
        className={inputCls}
        type={inputType}
        inputMode={inputModeProp}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={moneyInvalid || undefined}
        value={value}
        {...inputProps}
      />
    </label>
  )
}
