import { useLocation } from 'react-router-dom'
import type { CrmHeroProps } from '@/crm/section-props'
import { PhoneLeadForm } from '@/components/crm/PhoneLeadForm'

function PerksDemoButton() {
  return (
    <button type="button" className="crm-hero__perks-demo" data-demo-picker-open>
      <span className="crm-hero__perks-demo-text">Протестировать бесплатно</span>
      <svg className="crm-hero__perks-demo-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M3.5 8h7.5M8.5 5.5 11 8l-2.5 2.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}

function heroAriaLabel(props: CrmHeroProps): string {
  if (props.heroMark && props.heroTitle) return `${props.heroTitle} ${props.heroMark}`
  if (props.heroTitle) return props.heroTitle
  return 'Бесплатная программа для учёта клиентов'
}

export function CrmHero(props: CrmHeroProps) {
  const {
    heroTitle,
    heroMark,
    heroCta = 'Получить бесплатно',
    heroMore = 'аренда и риелторы, автосервис, ресторан, ремонт техники, и многие другие',
    demoHref,
    dealAlways,
  } = props
  const location = useLocation()
  const demoUrl = demoHref
    ? `${demoHref}?from=${encodeURIComponent(`${location.pathname}${location.search}${location.hash}`)}`
    : null

  const leadName = dealAlways ? 'Скидка 10%' : 'Получить бесплатно'
  const leadSource = dealAlways ? 'hero-deal' : 'hero-free'

  return (
    <section className="crm-hero" aria-label={heroAriaLabel(props)}>
      <img
        className="crm-hero__bg"
        src="/assets/crm-hero.webp"
        alt=""
        width={3840}
        height={2160}
        fetchPriority="high"
      />
      <div className="crm-hero__scrim" aria-hidden="true" />
      <div className="crm-hero__inner">
        <div className="crm-hero__copy reveal">
          <div className="crm-hero__lede">
            <h1 className="crm-hero__title">
              {heroMark && heroTitle ? (
                <>
                  <span className="crm-hero__shade">{heroTitle}</span>
                  <br />
                  <span className="crm-hero__mark">{heroMark}</span>
                </>
              ) : heroTitle ? (
                <span className="crm-hero__shade">{heroTitle}</span>
              ) : (
                <>
                  <span className="crm-hero__mark">Бесплатная</span>{' '}
                  <span className="crm-hero__shade">программа для учёта клиентов</span>
                </>
              )}
            </h1>
            <div className="crm-hero__rule" aria-hidden="true" />
          </div>
          {dealAlways || props.heroMore != null ? (
            <p className="crm-hero__text">
              <span className="crm-hero__shade">{props.heroMore ?? heroMore}</span>
            </p>
          ) : null}
        </div>

        <div className="crm-hero__stage" aria-hidden="true" />

        <div className="crm-hero__aside reveal">
          <aside className="crm-hero__perks" aria-label="Условия">
            <div className="crm-hero__perks-card">
              <ul className="crm-hero__perks-list">
                <li>
                  <span className="crm-hero__perk-value">1 неделя</span>
                  <span className="crm-hero__perk-label">запуск из любого города</span>
                </li>
                <li>
                  <span className="crm-hero__perk-value">Бессрочно</span>
                  <span className="crm-hero__perk-label">поддержка после сдачи</span>
                </li>
                <li className="crm-hero__perks-list-item--solo">
                  <span className="crm-hero__perk-value">Работа по договору</span>
                </li>
              </ul>
              {demoUrl ? null : (
                <div className="crm-hero__perks-foot">
                  <PerksDemoButton />
                </div>
              )}
            </div>
          </aside>
          <div className="crm-hero__lead-form">
            {demoUrl ? (
              <a
                className="btn btn--primary btn--lure-light crm-hero__btn crm-hero__demo"
                href={demoUrl}
                target="_blank"
                rel="noopener"
              >
                {heroCta}
              </a>
            ) : (
              <PhoneLeadForm
                leadName={leadName}
                leadSource={leadSource}
                submitLabel={heroCta}
                phoneLeadId="heroPhone"
                phoneLeadClass="crm-hero__form"
                phoneLeadBtnClass="btn--lure-light crm-hero__btn"
                noteOnHero
                phoneInputClassName="crm-hero__phone"
                errorClassName="crm-hero__form-error crm-phone-lead__error"
                doneClassName="crm-hero__done crm-phone-lead__done"
              />
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
