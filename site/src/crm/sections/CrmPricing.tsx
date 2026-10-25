import { useMemo, useState } from 'react'
import { LegalNote } from '@/components/crm/LegalNote'
import { CRM_PRICE_COLUMNS, CRM_PRICE_ITEM_BY_VALUE } from '@/data/crm-pricing-items'
import { usePhoneMask } from '@/hooks/usePhoneMask'
import { sendCrmLead } from '@/lib/leads'

function formatPriceRub(value: number) {
  return `${String(value).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}\u00a0₽`
}

export function CrmPricing() {
  const [checked, setChecked] = useState<Set<string>>(() => new Set())
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [locked, setLocked] = useState(false)
  const phone = usePhoneMask()

  const selection = useMemo(() => {
    let from = 0
    let to = 0
    const names: string[] = []
    checked.forEach((value) => {
      const item = CRM_PRICE_ITEM_BY_VALUE[value]
      if (!item) return
      from += item.from
      to += item.to
      names.push(item.name)
    })
    return { from, to, names }
  }, [checked])

  const totalLabel =
    selection.names.length === 0
      ? 'Отметьте услуги — появится диапазон'
      : `От ${formatPriceRub(selection.from)} до ${formatPriceRub(selection.to)}`

  const toggle = (value: string) => {
    if (locked) return
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return next
    })
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    if (!phone.complete) {
      setError('Введите номер полностью: +7 (___) ___-__-__')
      return
    }
    const range = selection.names.length
      ? `Диапазон: от ${formatPriceRub(selection.from)} до ${formatPriceRub(selection.to)}.`
      : 'Услуги не отмечены.'
    const names = selection.names.length ? `Интересует: ${selection.names.join(', ')}.` : ''
    try {
      await sendCrmLead({
        name: 'Смета с сайта',
        phone: phone.value,
        source: 'pricing-estimate',
        message: [names, range, 'Точную сумму уточним после разбора задачи.'].filter(Boolean).join(' '),
      })
      if (typeof window.ym === 'function') {
        window.ym(112716152, 'reachGoal', 'crm-form')
      }
      setSubmitted(true)
      setLocked(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить заявку.')
    }
  }

  return (
    <section className="crm-pricing" id="pricing" aria-labelledby="crm-pricing-title">
      <div className="container">
        <div className="section__head">
          <p className="section__eyebrow">Стоимость</p>
          <h2 className="section__title" id="crm-pricing-title">
            Соберите смету
          </h2>
        </div>

        <div className="crm-price-grid">
          {CRM_PRICE_COLUMNS.map((column) => (
            <article key={column.title} className="crm-price-col">
              <h3 className="crm-price-col__title">{column.title}</h3>
              <ul className="crm-price-list" role="list">
                {column.items.map((item) => (
                  <li key={item.value}>
                    <label className="crm-price-list__item">
                      <input
                        type="checkbox"
                        name="price-item"
                        value={item.value}
                        checked={checked.has(item.value)}
                        disabled={locked}
                        onChange={() => toggle(item.value)}
                      />
                      <span className="crm-price-list__name">{item.name}</span>
                      <span className="crm-price-list__sum">{item.sumLabel}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <form className="crm-pricing__foot" noValidate onSubmit={(e) => void handleSubmit(e)}>
          <p className="crm-pricing__total">{totalLabel}</p>
          {!submitted ? (
            <>
              <p className="crm-pricing__note">Точную сумму назовём после разбора задачи.</p>
              <div className="crm-pricing__send">
                <label className="crm-pricing__phone-wrap">
                  <span className="visually-hidden">Телефон</span>
                  <input
                    className="crm-pricing__phone"
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
                <button className="btn btn--primary crm-pricing__cta" type="submit" disabled={!phone.complete}>
                  Заказать звонок
                  <span className="crm-pricing__deal" aria-hidden="true">
                    −10%
                  </span>
                </button>
              </div>
              <LegalNote />
              {error ? <p className="crm-pricing__error">{error}</p> : null}
            </>
          ) : (
            <p className="crm-pricing__done">Свяжемся в течение часа.</p>
          )}
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
