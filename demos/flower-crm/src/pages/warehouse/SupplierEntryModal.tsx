import { type FormEvent, useEffect, useState } from 'react'
import { CrmModal } from '../../components/ui/CrmModal'
import { CrmField } from './CrmField'

export type SupplierEntryInitial = {
  name: string
  legalName: string
  legalInfo: string
  address: string
  contacts: string
  notes: string
}

type Props = {
  open: boolean
  mode: 'add' | 'edit'
  initial: SupplierEntryInitial
  busy: boolean
  error: string | null
  onClose: () => void
  onSubmit: (values: SupplierEntryInitial) => void | Promise<void>
}

export function SupplierEntryModal({
  open,
  mode,
  initial,
  busy,
  error,
  onClose,
  onSubmit,
}: Props) {
  const [name, setName] = useState(initial.name)
  const [legalName, setLegalName] = useState(initial.legalName)
  const [legalInfo, setLegalInfo] = useState(initial.legalInfo)
  const [address, setAddress] = useState(initial.address)
  const [contacts, setContacts] = useState(initial.contacts)
  const [notes, setNotes] = useState(initial.notes)

  useEffect(() => {
    if (!open) return
    setName(initial.name)
    setLegalName(initial.legalName)
    setLegalInfo(initial.legalInfo)
    setAddress(initial.address)
    setContacts(initial.contacts)
    setNotes(initial.notes)
  }, [open, initial])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim() || busy) return
    void onSubmit({
      name: name.trim(),
      legalName: legalName.trim(),
      legalInfo: legalInfo.trim(),
      address: address.trim(),
      contacts: contacts.trim(),
      notes: notes.trim(),
    })
  }

  const title = mode === 'add' ? 'Добавить поставщика' : 'Изменить поставщика'

  return (
    <CrmModal open={open} onClose={onClose} title={title} width="lg" busy={busy} onSubmit={submit}>
        {error ? (
          <p className="crm-field__error" role="alert">
            {error}
          </p>
        ) : null}
        <CrmField label="Название" value={name} onChange={(ev) => setName(ev.target.value)} required />
        <CrmField
          label="Юр. наименование"
          value={legalName}
          onChange={(ev) => setLegalName(ev.target.value)}
          placeholder="Необязательно"
        />
        <label className="crm-field">
          <span className="crm-field__lab">Реквизиты</span>
          <textarea
            className="crm-field__input suppliers-page__textarea"
            rows={2}
            value={legalInfo}
            onChange={(ev) => setLegalInfo(ev.target.value)}
            placeholder="ИНН, банк…"
          />
        </label>
        <label className="crm-field">
          <span className="crm-field__lab">Адрес</span>
          <textarea
            className="crm-field__input suppliers-page__textarea"
            rows={2}
            value={address}
            onChange={(ev) => setAddress(ev.target.value)}
          />
        </label>
        <label className="crm-field">
          <span className="crm-field__lab">Контакты</span>
          <textarea
            className="crm-field__input suppliers-page__textarea"
            rows={2}
            value={contacts}
            onChange={(ev) => setContacts(ev.target.value)}
            placeholder="Телефон, мессенджеры, e-mail"
          />
        </label>
        <label className="crm-field">
          <span className="crm-field__lab">Заметки</span>
          <textarea
            className="crm-field__input suppliers-page__textarea"
            rows={2}
            value={notes}
            onChange={(ev) => setNotes(ev.target.value)}
          />
        </label>
        <CrmModal.Actions
          submitLabel="Сохранить"
          submitDisabled={!name.trim()}
          submitBusy={busy}
        />
    </CrmModal>
  )
}
