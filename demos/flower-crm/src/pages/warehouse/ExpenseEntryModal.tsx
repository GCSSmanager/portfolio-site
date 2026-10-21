import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { CrmModal } from '../../components/ui/CrmModal'
import { CrmField, CrmMoneyField } from './CrmField'
import { CrmPickField } from './CrmPickField'
import { isRequiredMoneyReady, parseMoneyInput } from '../../utils/crmInput'

export type ExpensePeriodChoice = { value: string; label: string }

const AMOUNT_LABEL: Record<string, string> = {
  monthly: 'Сумма, ₽/мес',
  weekly: 'Сумма, ₽/нед',
  quarterly: 'Сумма, ₽/квартал',
  yearly: 'Сумма, ₽/год',
}

const WEEKDAY_OPTIONS = [
  { value: '1', label: 'Понедельник' },
  { value: '2', label: 'Вторник' },
  { value: '3', label: 'Среда' },
  { value: '4', label: 'Четверг' },
  { value: '5', label: 'Пятница' },
  { value: '6', label: 'Суббота' },
  { value: '7', label: 'Воскресенье' },
]

const MONTH_DAY_OPTIONS = Array.from({ length: 28 }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1}-го числа`,
}))

function dueDayOptions(periodCode: string) {
  return periodCode === 'weekly' ? WEEKDAY_OPTIONS : MONTH_DAY_OPTIONS
}

export type ExpenseEntryInitial = {
  name: string
  amountStr: string
  periodCode: string
  dueDayStr: string
}

type Props = {
  open: boolean
  mode: 'add' | 'edit'
  category: 'regular' | 'additional'
  periodChoices: ExpensePeriodChoice[]
  initial: ExpenseEntryInitial
  busy: boolean
  error: string | null
  onClose: () => void
  onSubmit: (values: {
    name: string
    amount: number
    periodCode: string
    dueDay: number
  }) => void | Promise<void>
}

export function ExpenseEntryModal({
  open,
  mode,
  category,
  periodChoices,
  initial,
  busy,
  error,
  onClose,
  onSubmit,
}: Props) {
  const [name, setName] = useState(initial.name)
  const [amountStr, setAmountStr] = useState(initial.amountStr)
  const [periodCode, setPeriodCode] = useState(initial.periodCode)
  const [dueDayStr, setDueDayStr] = useState(initial.dueDayStr)

  const isUtilities = category === 'regular' && periodCode === 'utilities'

  useEffect(() => {
    if (!open) return
    setName(initial.name)
    setAmountStr(initial.amountStr)
    setPeriodCode(initial.periodCode)
    setDueDayStr(initial.dueDayStr)
  }, [open, initial])

  const formReady = useMemo(() => {
    if (!name.trim()) return false
    if (isUtilities) return true
    if (category === 'additional') return isRequiredMoneyReady(amountStr)
    return isRequiredMoneyReady(amountStr)
  }, [name, amountStr, isUtilities, category])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!formReady || busy) return
    let amount = 0
    if (!isUtilities) {
      const n = parseMoneyInput(amountStr.replace(/\s/g, ''))
      if (n === null || n === 'bad' || n <= 0) return
      amount = n
    }
    void onSubmit({
      name: name.trim(),
      amount,
      periodCode,
      dueDay: Number(dueDayStr),
    })
  }

  const title = mode === 'add' ? 'Добавить' : 'Изменить'

  return (
    <CrmModal open={open} onClose={onClose} title={title} width="md" busy={busy} onSubmit={submit}>
        {error ? (
          <p className="crm-field__error" role="alert">
            {error}
          </p>
        ) : null}
        <p className="crm-field__hint crm-field__hint--tight">
          {category === 'regular'
            ? isUtilities
              ? 'Коммуналка — сумму вносите при оплате по счётчику'
              : 'Регулярная статья'
            : 'Разовый расход (дата — сегодня)'}
        </p>
        <CrmField label="Название" value={name} onChange={(ev) => setName(ev.target.value)} />
        {category === 'regular' ? (
          <>
            <CrmPickField
              label="Период"
              value={periodCode}
              options={periodChoices.map((c) => ({ value: c.value, label: c.label }))}
              onChange={(next) => {
                setPeriodCode(next)
                if (next === 'weekly' && Number(dueDayStr) > 7) setDueDayStr('1')
              }}
            />
            <CrmPickField
              label={periodCode === 'weekly' ? 'День недели оплаты' : 'День месяца оплаты'}
              value={dueDayStr}
              options={dueDayOptions(periodCode)}
              onChange={setDueDayStr}
            />
          </>
        ) : null}
        {!isUtilities ? (
          <CrmMoneyField
            label={category === 'regular' ? AMOUNT_LABEL[periodCode] ?? 'Сумма, ₽' : 'Сумма, ₽'}
            value={amountStr}
            onChange={(ev) => setAmountStr(ev.target.value)}
          />
        ) : null}
        <CrmModal.Actions
          submitLabel="Сохранить"
          submitDisabled={!formReady}
          submitBusy={busy}
        />
    </CrmModal>
  )
}
