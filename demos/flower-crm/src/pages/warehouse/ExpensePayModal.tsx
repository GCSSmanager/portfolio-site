import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { CrmModal } from '../../components/ui/CrmModal'
import { CrmMoneyField } from './CrmField'
import { isRequiredMoneyReady, parseMoneyInput } from '../../utils/crmInput'

type Props = {
  open: boolean
  expenseName: string
  defaultAmountStr: string
  variableAmount?: boolean
  busy: boolean
  error: string | null
  onClose: () => void
  onSubmit: (amount: number) => void | Promise<void>
}

export function ExpensePayModal({
  open,
  expenseName,
  defaultAmountStr,
  variableAmount = false,
  busy,
  error,
  onClose,
  onSubmit,
}: Props) {
  const [amountStr, setAmountStr] = useState(defaultAmountStr)

  useEffect(() => {
    if (!open) return
    setAmountStr(defaultAmountStr)
  }, [open, defaultAmountStr])

  const formReady = useMemo(() => isRequiredMoneyReady(amountStr), [amountStr])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!formReady || busy) return
    const n = parseMoneyInput(amountStr.replace(/\s/g, ''))
    if (n === null || n === 'bad' || n <= 0) return
    void onSubmit(n)
  }

  return (
    <CrmModal open={open} onClose={onClose} title="Внести оплату" width="md" busy={busy} onSubmit={submit}>
        {error ? (
          <p className="crm-field__error" role="alert">
            {error}
          </p>
        ) : null}
        <p className="crm-field__hint crm-field__hint--tight">{expenseName}</p>
        <CrmMoneyField
          label={variableAmount ? 'Сумма по счётчику, ₽' : 'Сумма, ₽'}
          value={amountStr}
          onChange={(ev) => setAmountStr(ev.target.value)}
          hint={variableAmount ? 'Введите фактическую сумму за этот период' : undefined}
        />
        <CrmModal.Actions
          submitLabel="Оплатить"
          submitDisabled={!formReady}
          submitBusy={busy}
        />
    </CrmModal>
  )
}
