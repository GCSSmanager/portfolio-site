import { useId, useState } from 'react'
import { sendCrmLead } from '@/lib/leads'
import { usePhoneMask } from '@/hooks/usePhoneMask'
import { LegalNote } from '@/components/crm/LegalNote'

declare global {
  interface Window {
    ym?: (id: number, method: string, goal: string) => void
  }
}

export type PhoneLeadFormProps = {
  leadName: string
  leadSource: string
  submitLabel: string
  phoneLeadId?: string
  phoneLeadClass?: string
  phoneLeadBtnClass?: string
  phoneLeadDealBtn?: boolean
  noteOnHero?: boolean
  phoneInputClassName?: string
  errorClassName?: string
  doneClassName?: string
  /** When set, success message renders inside the parent (hero layout). */
  doneSibling?: boolean
}

export function PhoneLeadForm({
  leadName,
  leadSource,
  submitLabel,
  phoneLeadId,
  phoneLeadClass,
  phoneLeadBtnClass,
  phoneLeadDealBtn = false,
  noteOnHero,
  phoneInputClassName = 'crm-phone-lead__phone',
  errorClassName = 'crm-phone-lead__error',
  doneClassName = 'crm-phone-lead__done',
  doneSibling = true,
}: PhoneLeadFormProps) {
  const autoId = useId()
  const inputId = phoneLeadId ?? `phone-lead-${autoId.replace(/:/g, '')}`
  const phone = usePhoneMask()
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [sending, setSending] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (sending) return
    if (!phone.complete) {
      const input = event.currentTarget.querySelector<HTMLInputElement>('input[name="phone"]')
      input?.setCustomValidity('Введите номер полностью: +7 (___) ___-__-__')
      input?.reportValidity()
      return
    }

    const input = event.currentTarget.querySelector<HTMLInputElement>('input[name="phone"]')
    input?.setCustomValidity('')
    setSending(true)

    try {
      await sendCrmLead({
        name: leadName,
        phone: phone.value,
        source: leadSource,
      })
      if (typeof window.ym === 'function') {
        window.ym(112716152, 'reachGoal', 'crm-form')
      }
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить заявку.')
    } finally {
      setSending(false)
    }
  }

  const formClass = ['crm-phone-lead', phoneLeadClass].filter(Boolean).join(' ')
  const btnClass = ['btn', 'btn--primary', phoneLeadBtnClass].filter(Boolean).join(' ')

  return (
    <>
      <form
        className={formClass}
        data-crm-phone-lead=""
        data-lead-name={leadName}
        data-lead-source={leadSource}
        noValidate
        hidden={submitted}
        onSubmit={(e) => void handleSubmit(e)}
      >
        <label className="visually-hidden" htmlFor={inputId}>
          Телефон
        </label>
        <input
          className={phoneInputClassName}
          id={inputId}
          type="tel"
          name="phone"
          autoComplete="tel"
          inputMode="tel"
          maxLength={18}
          placeholder="+7 (___) ___-__-__"
          required
          value={phone.value}
          onFocus={phone.onFocus}
          onChange={(e) => {
            phone.onChange(e)
            e.target.setCustomValidity('')
            setError(null)
          }}
          onKeyDown={phone.onKeyDown}
          onBlur={phone.onBlur}
        />
        <button className={btnClass} type="submit" disabled={!phone.complete || sending}>
          {sending ? 'Отправка...' : submitLabel}
          {phoneLeadDealBtn ? (
            <span className="crm-card__deal" aria-hidden="true">
              −10%
            </span>
          ) : null}
        </button>
        <LegalNote noteOnHero={noteOnHero} />
        <p className={errorClassName} data-crm-phone-lead-error hidden={!error}>
          {error ?? ''}
        </p>
      </form>
      {doneSibling ? (
        <p
          className={doneClassName}
          data-crm-phone-lead-done
          hidden={!submitted}
          role="status"
        >
          Заявка отправлена. Свяжемся с вами в течение часа.
        </p>
      ) : null}
    </>
  )
}
