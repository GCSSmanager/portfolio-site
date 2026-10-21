import { type FormEvent, useEffect, useState } from 'react'
import { CrmModal } from '../../ui/CrmModal'
import { CrmField } from '../../form'

type Props = {
  open: boolean
  busy: boolean
  error: string | null
  onClose: () => void
  onSubmit: (name: string) => void | Promise<void>
}

export function HomeSectionModal({ open, busy, error, onClose, onSubmit }: Props) {
  const [name, setName] = useState('')

  useEffect(() => {
    if (open) setName('')
  }, [open])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    void onSubmit(trimmed)
  }

  return (
    <CrmModal open={open} onClose={onClose} title="Новый раздел" width="sm" busy={busy} onSubmit={submit}>
      <CrmField
        label="Название раздела"
        value={name}
        disabled={busy}
        onChange={(e) => setName(e.target.value)}
      />
      {error ? (
        <p className="crm-field__hint" role="alert" style={{ color: '#9a3b3b' }}>
          {error}
        </p>
      ) : null}
      <CrmModal.Actions
        submitLabel="Создать"
        submitDisabled={busy || !name.trim()}
        submitBusy={busy}
      />
    </CrmModal>
  )
}
