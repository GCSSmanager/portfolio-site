import { Fragment, useState } from 'react'
import { LegalNote } from '@/components/crm/LegalNote'
import { usePhoneMask } from '@/hooks/usePhoneMask'
import { sendCrmLead } from '@/lib/leads'

const PAIRS = [
  {
    fear: 'После сдачи проекта ошибку будет некому исправить',
    offer: 'Ошибки после запуска исправляем бесплатно в любое время',
  },
  {
    fear: 'Любая доработка завязана на нашу цену и наши сроки',
    offer: 'Код Ваш: доработаете у нас или у любой другой команды',
  },
  {
    fear: 'Клиентская база окажется у посторонних',
    offer: 'Поставим на Ваш сервер — доступ к базе только у Вас',
  },
  {
    fear: 'Сотрудник увидит чужие данные, а систему смогут взломать',
    offer: 'Доступ по ролям и шифрование по современным стандартам',
  },
  {
    fear: 'Сотрудникам будет сложно разобраться в новой системе',
    offer: 'Понятный интерфейс и бесплатное обучение всех сотрудников',
  },
] as const

function FearIcon() {
  return (
    <svg className="crm-fears__icon crm-fears__icon--fear" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="6" />
      <circle cx="6" cy="6.45" r="0.85" />
      <circle cx="10" cy="6.45" r="0.85" />
      <path d="M5.6 10.45c.8-.95 1.5-1.25 2.4-1.25s1.6.3 2.4 1.25" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg className="crm-fears__icon crm-fears__icon--yes" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3.6 8.3 6.5 11.1 12.4 5" />
    </svg>
  )
}

export function CrmFears() {
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const phone = usePhoneMask()

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    if (sending) return
    if (!phone.complete) {
      setError('Введите номер полностью: +7 (___) ___-__-__')
      return
    }
    setSending(true)
    try {
      await sendCrmLead({
        name: 'Прототип с сайта',
        phone: phone.value,
        source: 'fears-prototype',
        message: 'Хочет обсудить прототип под свою задачу.',
      })
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить заявку.')
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="crm-fears" id="fears" aria-labelledby="crm-fears-title">
      <div className="container">
        <div className="section__head">
          <p className="section__eyebrow">Страхи и что предлагаем</p>
          <h2 className="section__title" id="crm-fears-title">
            Работаем по <span className="crm-fears__blob">договору</span>.{' '}
            <span className="crm-fears__blob">100% гарантия</span> результата.
          </h2>
        </div>

        <div className="crm-fears__board">
          <h3 className="crm-fears__head crm-fears__head--fear">
            <FearIcon />
            Частые страхи
          </h3>
          <h3 className="crm-fears__head crm-fears__head--offer">
            <CheckIcon />
            Что предлагаем
          </h3>
          <div className="crm-fears__rows">
            {PAIRS.map((pair, index) => {
              const last = index === PAIRS.length - 1 ? ' is-last' : ''
              return (
                <Fragment key={pair.fear}>
                  <p className={`crm-fears__fear${last}`}>{pair.fear}</p>
                  <p className={`crm-fears__offer${last}`}>{pair.offer}</p>
                </Fragment>
              )
            })}
          </div>
        </div>
        <form className="crm-fears__form" noValidate onSubmit={(e) => void handleSubmit(e)}>
          <div className="crm-fears__panel">
            {!submitted ? (
              <>
                <p className="crm-fears__lead">
                  Обсудим прототип <span className="crm-fears__mark">под Вашу задачу</span>
                </p>
                <div className="crm-fears__send">
                  <label className="crm-fears__phone-wrap">
                    <span className="visually-hidden">Телефон</span>
                    <input
                      className="crm-fears__phone"
                      type="tel"
                      name="phone"
                      autoComplete="tel"
                      inputMode="tel"
                      maxLength={18}
                      placeholder="+7 (___) ___-__-__"
                      required
                      value={phone.value}
                      onFocus={phone.onFocus}
                      onChange={phone.onChange}
                      onKeyDown={phone.onKeyDown}
                      onBlur={phone.onBlur}
                    />
                  </label>
                  <button className="btn btn--primary crm-fears__cta" type="submit" disabled={!phone.complete || sending}>
                    {sending ? 'Отправка...' : 'Обсудить прототип'}
                  </button>
                </div>
                <LegalNote />
                {error ? <p className="crm-fears__error">{error}</p> : null}
              </>
            ) : (
              <p className="crm-fears__done">Свяжемся в течение часа.</p>
            )}
          </div>
        </form>
      </div>
    </section>
  )
}
