import type { CrmPickOption } from '../pages/warehouse'

export type PaymentType = 'card' | 'sbp' | 'cash' | 'transfer'

export const PAYMENT_TYPE_OPTIONS: CrmPickOption[] = [
  { value: 'card', label: 'Карта' },
  { value: 'sbp', label: 'СБП' },
  { value: 'cash', label: 'Наличные' },
  { value: 'transfer', label: 'Перевод' },
]

export const DEFAULT_PAYMENT_TYPE: PaymentType = 'card'
