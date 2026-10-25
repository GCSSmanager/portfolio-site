import { useState } from 'react'
import { LegalNote } from '@/components/crm/LegalNote'
import { usePhoneMask } from '@/hooks/usePhoneMask'
import { sendCrmLead } from '@/lib/leads'

const QUIZ_KIND: Record<string, string> = {
  services: 'Услуги',
  shop: 'Магазин',
  booking: 'Запись клиентов',
  stock: 'Склад и учёт',
  other: 'Другое',
}

const QUIZ_TEAM: Record<string, string> = {
  '1-3': '1–3 человека',
  '4-10': '4–10 человек',
  '11-30': '11–30 человек',
  '30+': 'больше 30 человек',
  other: 'Другое',
}

const QUIZ_PAIN: Record<string, string> = {
  leads: 'Разбор заявок',
  schedule: 'Расписание',
  stock: 'Остатки',
  reports: 'Отчёты',
  other: 'Другое',
}

function QuizPic({ src, alt }: { src: string; alt: string }) {
  return <img className="crm-quiz__pic" src={src} alt="" width={256} height={256} decoding="async" aria-hidden={alt === ''} />
}

export function CrmQuiz() {
  const [step, setStep] = useState(1)
  const [kind, setKind] = useState('')
  const [team, setTeam] = useState('')
  const [pain, setPain] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const phone = usePhoneMask()

  const goNextFromRadio = (next: string, setter: (v: string) => void, value: string) => {
    setter(value)
    window.setTimeout(() => setStep(next === 'kind' ? 2 : next === 'team' ? 3 : 4), 180)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    if (!phone.complete) {
      setError('Введите номер полностью: +7 (___) ___-__-__')
      return
    }
    try {
      await sendCrmLead({
        name: 'Квиз',
        phone: phone.value,
        source: 'crm-quiz',
        message: [
          `Отрасль: ${QUIZ_KIND[kind] || kind}`,
          `Сколько человек? ${QUIZ_TEAM[team] || team}`,
          `Что занимает время? ${QUIZ_PAIN[pain] || pain}`,
        ].join('\n'),
      })
      if (typeof window.ym === 'function') {
        window.ym(112716152, 'reachGoal', 'crm-form')
      }
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить заявку.')
    }
  }

  if (done) {
    return (
      <section className="crm-quiz" id="quiz" aria-labelledby="crm-quiz-title">
        <div className="container crm-quiz__inner">
          <p className="crm-quiz__done">Свяжемся в течение часа.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="crm-quiz" id="quiz" aria-labelledby="crm-quiz-title">
      <img
        className="crm-quiz__art"
        src="/assets/crm-quiz-bg.webp"
        alt=""
        width={1280}
        height={720}
        decoding="async"
      />
      <div className="container crm-quiz__inner">
        <header className="section__head crm-quiz__head">
          <p className="section__eyebrow">Анкета</p>
          <h2 className="section__title" id="crm-quiz-title">
            Рассчитаем стоимость
          </h2>
          <p className="crm-quiz__lead">
            <span className="crm-quiz__mark">
              Ответьте на вопросы — назовём сумму и зафиксируем скидку 10% за вашим номером.
            </span>
          </p>
        </header>

        <ol className="crm-quiz__progress" aria-label={`Шаг ${step} из 4`}>
          {[1, 2, 3, 4].map((n) => (
            <li key={n} className={n === step ? 'is-current' : n < step ? 'is-done' : undefined}>
              <span className="visually-hidden">Шаг {n}</span>
            </li>
          ))}
        </ol>

        <form className="crm-quiz__form" noValidate onSubmit={(e) => void handleSubmit(e)}>
          {step === 1 ? (
            <div className="crm-quiz__panel is-current">
              <fieldset className="crm-quiz__set">
                <legend className="crm-quiz__question">Какая у вас отрасль?</legend>
                <div className="crm-quiz__choices">
                  {(
                    [
                      ['services', '/assets/crm-quiz-kind-services.webp', 'Услуги'],
                      ['shop', '/assets/crm-quiz-kind-shop.webp', 'Магазин'],
                      ['booking', '/assets/crm-quiz-kind-booking.webp', 'Запись клиентов'],
                      ['stock', '/assets/crm-quiz-kind-stock.webp', 'Склад и учёт'],
                      ['other', '/assets/crm-quiz-team-other.webp', 'Другое'],
                    ] as const
                  ).map(([value, icon, label]) => (
                    <label key={value} className="crm-quiz__choice">
                      <input
                        type="radio"
                        name="kind"
                        value={value}
                        checked={kind === value}
                        onChange={() => goNextFromRadio('kind', setKind, value)}
                      />
                      <QuizPic src={icon} alt="" />
                      <span className="crm-quiz__choice-lab">{label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="crm-quiz__panel is-current">
              <fieldset className="crm-quiz__set">
                <legend className="crm-quiz__question">Сколько человек работают с заказами?</legend>
                <div className="crm-quiz__choices">
                  {(
                    [
                      ['1-3', '/assets/crm-quiz-team-1-3.webp', '1–3'],
                      ['4-10', '/assets/crm-quiz-team-4-10.webp', '4–10'],
                      ['11-30', '/assets/crm-quiz-team-11-30.webp', '11–30'],
                      ['30+', '/assets/crm-quiz-team-30.webp', '30+'],
                      ['other', '/assets/crm-quiz-team-other.webp', 'Другое'],
                    ] as const
                  ).map(([value, icon, label]) => (
                    <label key={value} className="crm-quiz__choice">
                      <input
                        type="radio"
                        name="team"
                        value={value}
                        checked={team === value}
                        onChange={() => goNextFromRadio('team', setTeam, value)}
                      />
                      <QuizPic src={icon} alt="" />
                      <span className="crm-quiz__choice-lab">{label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="crm-quiz__panel is-current">
              <fieldset className="crm-quiz__set">
                <legend className="crm-quiz__question">Что сейчас занимает больше всего времени?</legend>
                <div className="crm-quiz__choices">
                  {(
                    [
                      ['leads', '/assets/crm-quiz-pain-leads.webp', 'Разбор заявок'],
                      ['schedule', '/assets/crm-quiz-pain-schedule.webp', 'Расписание'],
                      ['stock', '/assets/crm-quiz-pain-stock.webp', 'Остатки'],
                      ['reports', '/assets/crm-quiz-pain-reports.webp', 'Отчёты'],
                      ['other', '/assets/crm-quiz-team-other.webp', 'Другое'],
                    ] as const
                  ).map(([value, icon, label]) => (
                    <label key={value} className="crm-quiz__choice">
                      <input
                        type="radio"
                        name="pain"
                        value={value}
                        checked={pain === value}
                        onChange={() => goNextFromRadio('pain', setPain, value)}
                      />
                      <QuizPic src={icon} alt="" />
                      <span className="crm-quiz__choice-lab">{label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="crm-quiz__panel is-current">
              <fieldset className="crm-quiz__set">
                <legend className="crm-quiz__question">Введите номер телефона для получения результатов</legend>
                <label className="crm-quiz__phone-field">
                  <span className="visually-hidden">Телефон</span>
                  <input
                    className="crm-quiz__phone"
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
                <button className="btn btn--primary crm-quiz__submit" type="submit" disabled={!phone.complete}>
                  Отправить
                </button>
                <LegalNote />
                {error ? <p className="crm-quiz__error">{error}</p> : null}
              </fieldset>
            </div>
          ) : null}

          {step > 1 ? (
            <button
              className="crm-quiz__back"
              type="button"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
            >
              Назад
            </button>
          ) : null}
        </form>
      </div>
    </section>
  )
}

declare global {
  interface Window {
    ym?: (id: number, method: string, goal: string) => void
  }
}
