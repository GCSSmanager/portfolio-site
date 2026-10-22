import { useEffect, useState, type FormEventHandler } from 'react'
import { sendCrmLeadReady } from '../../lib/crm-leads'
import { reachCrmFormGoal } from '../../lib/metrika'
import { isPhoneRuComplete, phoneRuValidityMessage } from '../../lib/phone-ru'
import '../../pages/warehouse/stock/forms-fields.css'
import { CrmModal } from '../ui/CrmModal'
import { PhoneRuInput } from './PhoneRuInput'
import './demo-phone-gate.css'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DemoDiscussModal({ open, onOpenChange }: Props) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!open) return
    setName('')
    setPhone('')
    setError('')
    setLoading(false)
    setDone(false)
  }, [open])

  const close = () => onOpenChange(false)

  const submit: FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault()
    setError('')

    const trimmed = name.trim()
    if (!trimmed) {
      setError('Укажите имя')
      return
    }
    if (!isPhoneRuComplete(phone)) {
      setError(phoneRuValidityMessage())
      return
    }

    setLoading(true)
    try {
      await sendCrmLeadReady({
        name: trimmed,
        phone,
        source: 'demo-discuss',
        message: 'Обсудить внедрение (−10% с демо)',
      })
      reachCrmFormGoal()
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить заявку')
      setLoading(false)
    }
  }

  return (
    <CrmModal
      open={open}
      onClose={close}
      title="Обсудить внедрение"
      width="sm"
      portal
      busy={loading}
      onSubmit={done ? undefined : submit}
    >
      {done ? (
        <p className="crm-field__hint">
          Спасибо! Мы свяжемся с вами в течение часа. Скидку −10% зафиксируем в заявке.
        </p>
      ) : (
        <>
          <div className="demo-discuss-deal">
            <span className="demo-discuss-deal__badge">−10%</span>
            <p className="demo-discuss-deal__text">Скидка при заказе с демо — зафиксируем в заявке</p>
          </div>

          <label className="crm-field">
            <span className="crm-field__lab">Имя</span>
            <input
              className="crm-field__input"
              name="name"
              autoComplete="name"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                if (error) setError('')
              }}
            />
          </label>

          <label className="crm-field">
            <span className="crm-field__lab">Телефон</span>
            <PhoneRuInput
              value={phone}
              onChange={(value) => {
                setPhone(value)
                if (error) setError('')
              }}
            />
          </label>

          {error ? (
            <p className="crm-field__error" role="alert">
              {error}
            </p>
          ) : null}

          <CrmModal.Actions submitLabel={loading ? 'Отправляем…' : 'Отправить'} submitBusy={loading} />
        </>
      )}
    </CrmModal>
  )
}
