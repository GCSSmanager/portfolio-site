import { useMemo } from 'react'
import type { ConsumableUnitKind } from '../../components/crm/stock/types'
import { CrmPickField, type CrmPickOption } from './CrmPickField'

const OPTIONS: CrmPickOption[] = [
  { value: 'meter', label: 'Сантиметры', meta: 'лента, плёнка — приход в метрах на катушку' },
  { value: 'piece', label: 'Штуки', meta: 'упаковки, оазис, держатели' },
]

type Props = {
  label?: string
  value: ConsumableUnitKind
  onChange: (value: ConsumableUnitKind) => void
  invalid?: boolean
  disabled?: boolean
}

export function ConsumableUnitKindPick({
  label = 'Единица учёта',
  value,
  onChange,
  invalid = false,
  disabled = false,
}: Props) {
  const options = useMemo(() => OPTIONS, [])

  return (
    <CrmPickField
      label={label}
      value={value}
      options={options}
      invalid={invalid}
      disabled={disabled}
      placeholder="Выберите единицу…"
      onChange={(v) => onChange(v === 'piece' ? 'piece' : 'meter')}
    />
  )
}
