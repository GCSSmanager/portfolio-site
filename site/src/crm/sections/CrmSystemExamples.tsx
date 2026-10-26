import { useState } from 'react'
import { LegalNote } from '@/components/crm/LegalNote'
import {
  CRM_LAUNCH_EXAMPLES,
  formatExamplePriceRub,
  type CrmLaunchExample,
} from '@/data/crm-system-examples'
import { usePhoneMask } from '@/hooks/usePhoneMask'
import { sendCrmLead } from '@/lib/leads'

function LaunchCard({ example }: { example: CrmLaunchExample }) {
  return (
    <article className="crm-launch">
      <div className="crm-launch__head">
        <div className="crm-launch__media">
          <img
            className="crm-launch__pic"
            src={example.image}
            alt=""
            width={256}
            height={256}
            decoding="async"
            aria-hidden
          />
        </div>
        <div className="crm-launch__sum">
          <p className="crm-launch__price">{formatExamplePriceRub(example.priceRub)}</p>
          <p className="crm-launch__term">{example.term}</p>
        </div>
      </div>
      <ul className="crm-launch__includes" role="list">
        {example.includes.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </article>
  )
}

export function CrmSystemExamples() {
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const phone = usePhoneMask()

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    if (!phone.complete) {
      setError('Введите номер полностью: +7 (___) ___-__-__')
      return
    }
    try {
      await sendCrmLead({
        name: 'Цены с сайта',
        phone: phone.value,
        source: 'system-examples',
        message: 'Запрос расчёта стоимости под задачу (блок «Подробнее о ценах»).',
      })
      if (typeof window.ym === 'function') {
        window.ym(112716152, 'reachGoal', 'crm-form')
      }
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить заявку.')
    }
  }

  return (
    <section className="crm-examples" id="examples" aria-labelledby="crm-examples-title">
      <div className="container">
        <div className="section__head crm-examples__head">
          <p className="section__eyebrow">Подробнее о ценах</p>
          <h2 className="section__title" id="crm-examples-title">
            Примеры кейсов и стоимостей
          </h2>
        </div>

        <div className="crm-examples__grid">
          {CRM_LAUNCH_EXAMPLES.map((example) => (
            <LaunchCard key={example.id} example={example} />
          ))}
        </div>

        <form className="crm-examples__form" noValidate onSubmit={(e) => void handleSubmit(e)}>
          {!submitted ? (
            <div className="crm-examples__calc">
              <p className="crm-examples__calc-lead">
                Рассчитаем стоимость{' '}
                <span className="crm-examples__calc-mark">под Ваш случай</span>
              </p>
              <div className="crm-examples__send">
                <label className="crm-examples__phone-wrap">
                  <span className="visually-hidden">Телефон</span>
                  <input
                    className="crm-examples__phone"
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
                <button className="btn btn--primary crm-examples__cta" type="submit" disabled={!phone.complete}>
                  Получить расчёт
                </button>
              </div>
              <LegalNote />
              {error ? <p className="crm-examples__error">{error}</p> : null}
            </div>
          ) : (
            <p className="crm-examples__done">Свяжемся в течение часа.</p>
          )}
        </form>
      </div>
    </section>
  )
}
