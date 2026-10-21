import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { CrmModal } from '../../components/ui/CrmModal'
import { isRequiredMoneyReady } from '../../utils/crmInput'
import { CrmField, CrmMoneyField } from './CrmField'

export type DeliveryServiceEntryInitial = {
  name: string
  description: string
  contacts: string
  cityDeliveryPrice: string
}

type Props = {
  open: boolean
  mode: 'add' | 'edit'
  initial: DeliveryServiceEntryInitial
  busy: boolean
  error: string | null
  onClose: () => void
  onSubmit: (values: DeliveryServiceEntryInitial) => void | Promise<void>
}

export function DeliveryServiceEntryModal({
  open,
  mode,
  initial,
  busy,
  error,
  onClose,
  onSubmit,
}: Props) {
  const [name, setName] = useState(initial.name)
  const [description, setDescription] = useState(initial.description)
  const [contacts, setContacts] = useState(initial.contacts)
  const [cityDeliveryPrice, setCityDeliveryPrice] = useState(initial.cityDeliveryPrice)

  useEffect(() => {
    if (!open) return
    setName(initial.name)
    setDescription(initial.description)
    setContacts(initial.contacts)
    setCityDeliveryPrice(initial.cityDeliveryPrice)
  }, [open, initial])

  const formReady = useMemo(
    () => name.trim().length > 0 && isRequiredMoneyReady(cityDeliveryPrice),
    [name, cityDeliveryPrice],
  )

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!formReady || busy) return
    void onSubmit({
      name: name.trim(),
      description: description.trim(),
      contacts: contacts.trim(),
      cityDeliveryPrice: cityDeliveryPrice.trim(),
    })
  }

  const title = mode === 'add' ? 'Добавить сервис доставки' : 'Изменить сервис доставки'

  return (
    <CrmModal open={open} onClose={onClose} title={title} width="lg" busy={busy} onSubmit={submit}>
      {error ? (
        <p className="crm-field__error" role="alert">
          {error}
        </p>
      ) : null}
      <CrmField label="Название" value={name} onChange={(ev) => setName(ev.target.value)} required />
      <label className="crm-field">
        <span className="crm-field__lab">О сервисе</span>
        <textarea
          className="crm-field__input suppliers-page__textarea"
          rows={3}
          value={description}
          onChange={(ev) => setDescription(ev.target.value)}
          placeholder="Необязательно"
        />
      </label>
      <label className="crm-field">
        <span className="crm-field__lab">Контакты</span>
        <textarea
          className="crm-field__input suppliers-page__textarea"
          rows={2}
          value={contacts}
          onChange={(ev) => setContacts(ev.target.value)}
          placeholder="Телефон, сайт, мессенджеры"
        />
      </label>
      <CrmMoneyField
        label="Цена по городу, ₽"
        value={cityDeliveryPrice}
        onChange={(ev) => setCityDeliveryPrice(ev.target.value)}
      />
      <CrmModal.Actions
        submitLabel="Сохранить"
        submitDisabled={!formReady}
        submitBusy={busy}
      />
    </CrmModal>
  )
}
