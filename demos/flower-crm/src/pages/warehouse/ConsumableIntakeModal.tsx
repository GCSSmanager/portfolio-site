import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { CrmButton } from '../../components/ui/CrmButton'
import { CrmModal } from '../../components/ui/CrmModal'
import { isMoneyInputBad, isRequiredMoneyReady } from '../../utils/crmInput'
import type { ConsumableRow } from '../../components/crm/stock/types'
import {
  consumablePackCountFieldLabel,
  consumablePackPriceFieldLabel,
  consumablePackVolumeFieldLabel,
  intakePreviewQuantity,
} from '../../utils/consumableMeters'
import { CrmField, CrmMoneyField, CrmQtyField } from './CrmField'

type Props = {
  open: boolean
  row: ConsumableRow | null
  busy?: boolean
  error?: string | null
  onClose: () => void
  onSubmit: (values: { packSize: string; rollsCount: string; unitCost: string }) => void | Promise<void>
}

export function ConsumableIntakeModal({
  open,
  row,
  busy = false,
  error = null,
  onClose,
  onSubmit,
}: Props) {
  const [packSize, setPackSize] = useState('')
  const [rollsCount, setRollsCount] = useState('1')
  const [unitCost, setUnitCost] = useState('')

  useEffect(() => {
    if (!open) return
    setPackSize('')
    setRollsCount('1')
    setUnitCost('')
  }, [open, row?.id])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!row || busy) return
    void Promise.resolve(
      onSubmit({
        packSize: packSize.trim(),
        rollsCount: rollsCount.trim(),
        unitCost: unitCost.trim(),
      }),
    )
  }

  const packNum = Number.parseFloat(packSize.replace(',', '.'))
  const packOk = Number.isFinite(packNum) && packNum > 0
  const rolls = Number.parseInt(rollsCount.trim(), 10)
  const rollsOk = Number.isFinite(rolls) && rolls >= 1
  const unitCostOk = isRequiredMoneyReady(unitCost)
  const unitCostInvalid = unitCost.trim() !== '' && (isMoneyInputBad(unitCost) || !unitCostOk)

  const preview = useMemo(() => {
    if (!row || !packOk || !rollsOk) return null
    return intakePreviewQuantity(packSize, rolls, row.unit_kind)
  }, [row, packSize, packOk, rolls, rollsOk])

  const unitKind = row?.unit_kind

  return (
    <CrmModal
      open={open}
      onClose={onClose}
      title={row ? `Приход: ${row.name}` : 'Приход'}
      width="md"
      busy={busy}
      portal
      onSubmit={submit}
    >
      {error ? (
        <p className="crm-field__error" role="alert">
          {error}
        </p>
      ) : null}
      <CrmField
        label={unitKind ? consumablePackVolumeFieldLabel(unitKind) : 'Объём'}
        value={packSize}
        onChange={(e) => setPackSize(e.target.value)}
        placeholder={unitKind === 'piece' ? 'Например: 50' : 'Например: 10'}
        inputMode="decimal"
        invalid={packSize.trim() !== '' && !packOk}
      />
      <CrmQtyField
        label={unitKind ? consumablePackCountFieldLabel(unitKind) : 'Количество'}
        value={rollsCount}
        onChange={(e) => setRollsCount(e.target.value)}
        min={1}
        invalid={rollsCount.trim() !== '' && !rollsOk}
      />
      <CrmMoneyField
        label={unitKind ? consumablePackPriceFieldLabel(unitKind) : 'Цена'}
        value={unitCost}
        onChange={(e) => setUnitCost(e.target.value)}
        invalid={unitCostInvalid}
      />
      {preview ? (
        <p className="crm-field__hint consumable-intake-preview" aria-live="polite">
          На склад: <strong>{preview}</strong>
        </p>
      ) : null}
      <CrmModal.Actions>
        <CrmButton
          type="submit"
          variant="accent"
          disabled={busy || !row || !packOk || !rollsOk || !unitCostOk}
        >
          {busy ? '…' : 'Принять'}
        </CrmButton>
      </CrmModal.Actions>
    </CrmModal>
  )
}
