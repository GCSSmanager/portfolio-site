import { forwardRef, type InputHTMLAttributes } from 'react'
import { CrmField, type CrmFieldProps } from './CrmField'

export type CrmTextFieldProps = Omit<CrmFieldProps, 'type'> & {
  type?: InputHTMLAttributes<HTMLInputElement>['type']
}

/** Текстовое поле CRM (логин, название и т.п.). */
export const CrmTextField = forwardRef<HTMLInputElement, CrmTextFieldProps>(function CrmTextField(
  { type = 'text', ...props },
  ref,
) {
  return <CrmField ref={ref} type={type} {...props} />
})
