import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { withCrmFieldInvalid } from '../../utils/crmInput'

export type CrmFieldProps = {
  label: string
  invalid?: boolean
  wrapperClass?: string
  labClass?: string
  inputClass?: string
  hint?: ReactNode
} & InputHTMLAttributes<HTMLInputElement>

/** Стандартная ячейка CRM-формы: label + input + опциональная подсказка. */
export const CrmField = forwardRef<HTMLInputElement, CrmFieldProps>(function CrmField(
  {
    label,
    invalid = false,
    wrapperClass = 'crm-field',
    labClass = 'crm-field__lab',
    inputClass = 'crm-field__input',
    hint,
    className: inputExtraClass,
    ...inputProps
  },
  ref,
) {
  const inputCls = [inputClass, inputExtraClass].filter(Boolean).join(' ')
  return (
    <label className={withCrmFieldInvalid(invalid, wrapperClass)}>
      <span className={labClass}>{label}</span>
      <input ref={ref} className={inputCls} aria-invalid={invalid || undefined} {...inputProps} />
      {hint != null ? (
        typeof hint === 'string' ? (
          <span className="crm-field__hint">{hint}</span>
        ) : (
          hint
        )
      ) : null}
    </label>
  )
})

type CrmInlineInputProps = {
  invalid?: boolean
  wrapperClass: string
  fieldLabel?: string
  suffix?: ReactNode
} & InputHTMLAttributes<HTMLInputElement>

/** Компактное поле: суффикс «шт», «₽/шт»; опционально мини-подпись сверху. */
export function CrmInlineInput({
  invalid = false,
  wrapperClass,
  fieldLabel,
  suffix,
  className: inputExtraClass,
  ...inputProps
}: CrmInlineInputProps) {
  const inputCls = ['crm-field__input', inputExtraClass].filter(Boolean).join(' ')
  const inputRow = (
    <>
      <input className={inputCls} aria-invalid={invalid || undefined} {...inputProps} />
      {suffix}
    </>
  )
  return (
    <label className={withCrmFieldInvalid(invalid, wrapperClass)}>
      {fieldLabel ? <span className="crm-delivery-lines__qty-lab">{fieldLabel}</span> : null}
      {fieldLabel ? <span className="crm-delivery-lines__qty-value">{inputRow}</span> : inputRow}
    </label>
  )
}
