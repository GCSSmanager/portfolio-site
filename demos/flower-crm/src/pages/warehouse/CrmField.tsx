import { type ReactNode, type SelectHTMLAttributes } from 'react'
import { withCrmFieldInvalid } from '../../utils/crmInput'

export { CrmField, CrmInlineInput } from '../../components/form/CrmField'
export { CrmTextField, type CrmTextFieldProps } from '../../components/form/CrmTextField'
export { CrmSearchField, useCrmSearchDropdown, type CrmSearchFieldProps } from '../../components/form/CrmSearchField'
export { CrmFileField, type CrmFileFieldProps } from '../../components/form/CrmFileField'
export { CrmMoneyField, type CrmMoneyFieldProps } from '../../components/form/CrmMoneyField'
export { CrmQtyField, type CrmQtyFieldProps } from '../../components/form/CrmQtyField'
export { CrmInlineMoneyField, type CrmInlineMoneyFieldProps } from '../../components/form/CrmInlineMoneyField'
export { CrmInlineQtyField, type CrmInlineQtyFieldProps } from '../../components/form/CrmInlineQtyField'
export { CrmInlineDecimalField, type CrmInlineDecimalFieldProps } from '../../components/form/CrmInlineDecimalField'
export { CrmPriceField, type CrmPriceFieldProps } from '../../components/form/CrmPriceField'
export { CrmMaskedInput } from '../../components/form/CrmMaskedInput'
export { CrmDateField, type CrmDateFieldProps } from '../../components/form/CrmDateField'
export { CrmTimeField, type CrmTimeFieldProps } from '../../components/form/CrmTimeField'
export { CrmDateTimeField, type CrmDateTimeFieldProps } from '../../components/form/CrmDateTimeField'
export {
  CrmInlineDateTimeField,
  type CrmInlineDateTimeFieldProps,
} from '../../components/form/CrmInlineDateTimeField'

type CrmSelectFieldProps = {
  label: string
  invalid?: boolean
  wrapperClass?: string
  children: ReactNode
} & SelectHTMLAttributes<HTMLSelectElement>

export function CrmSelectField({
  label,
  invalid = false,
  wrapperClass = 'crm-field',
  className: selectExtraClass,
  children,
  ...selectProps
}: CrmSelectFieldProps) {
  const selectCls = ['crm-field__input', selectExtraClass].filter(Boolean).join(' ')
  return (
    <label className={withCrmFieldInvalid(invalid, wrapperClass)}>
      <span className="crm-field__lab">{label}</span>
      <select className={selectCls} aria-invalid={invalid || undefined} {...selectProps}>
        {children}
      </select>
    </label>
  )
}
