import { useEffect, useState, type FormEventHandler } from 'react'
import { createPortal } from 'react-dom'
import { useDemoShellOptional } from '../../demo-shell'
import { sendCrmLeadReady } from '../../lib/crm-leads'
import { reachCrmFormGoal } from '../../lib/metrika'
import { isPhoneRuComplete, phoneRuValidityMessage } from '../../lib/phone-ru'
import { useBodyScrollLock } from '../../utils/demoScrollLock'
import '../../pages/warehouse/stock/forms-fields.css'
import { CrmButton } from '../ui/CrmButton'
import { PhoneRuInput } from './PhoneRuInput'
import './demo-phone-gate.css'

const STORAGE_KEY = 'flower-crm-demo.phone-unlocked'
const DELAY_MS = 2 * 60_000

function readUnlocked() {
  try {
    return Boolean(localStorage.getItem(STORAGE_KEY))
  } catch {
    return false
  }
}

function writeUnlocked(phone: string) {
  try {
    localStorage.setItem(STORAGE_KEY, phone)
  } catch {
    /* ignore */
  }
}

type Props = {
  paused?: boolean
}

export function DemoPhoneGate({ paused = false }: Props) {
  const shell = useDemoShellOptional()
  const tipOpen = shell?.tipOpen ?? false

  const [unlocked, setUnlocked] = useState(readUnlocked)
  const [due, setDue] = useState(false)
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (unlocked) return
    const timer = window.setTimeout(() => setDue(true), DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [unlocked])

  const open = due && !unlocked && !tipOpen && !paused
  useBodyScrollLock(open)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [open])

  if (!open) return null

  const submit: FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault()
    setError('')

    if (!isPhoneRuComplete(phone)) {
      setError(phoneRuValidityMessage())
      return
    }

    setLoading(true)
    try {
      await sendCrmLeadReady({
        name: 'Демо CRM',
        phone,
        source: 'demo-phone-gate',
      })
      reachCrmFormGoal()
      writeUnlocked(phone)
      setUnlocked(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить номер')
      setLoading(false)
    }
  }

  return createPortal(
    <div className="demo-phone-gate">
      <div className="demo-phone-gate__backdrop" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="demo-phone-gate-title"
        className="demo-phone-gate__panel"
      >
        <p className="demo-phone-gate__kicker">Демо CRM</p>
        <h2 id="demo-phone-gate-title" className="demo-phone-gate__title">
          Продолжить демо
        </h2>
        <p className="demo-phone-gate__lead">
          Введите номер телефона, чтобы продолжить пользоваться демо-версией.
        </p>

        <form className="crm-form crm-form--tight" noValidate onSubmit={submit}>
          <label className="crm-field">
            <span className="crm-field__lab">Телефон</span>
            <PhoneRuInput
              value={phone}
              onChange={(value) => {
                setPhone(value)
                if (error) setError('')
              }}
              autoFocus
            />
          </label>
          {error ? (
            <p className="crm-field__error" role="alert">
              {error}
            </p>
          ) : null}
          <CrmButton variant="primary" type="submit" disabled={loading}>
            {loading ? 'Отправляем…' : 'Продолжить'}
          </CrmButton>
        </form>
      </div>
    </div>,
    document.body,
  )
}
