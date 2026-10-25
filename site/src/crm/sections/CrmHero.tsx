import type { CrmHeroProps } from '@/crm/section-props'
import { PhoneLeadForm } from '@/components/crm/PhoneLeadForm'

function heroAriaLabel(props: CrmHeroProps): string {
  if (props.heroMark && props.heroTitle) return `${props.heroTitle} ${props.heroMark}`
  if (props.heroTitle) return props.heroTitle
  return 'Бесплатная CRM-система с установкой для отслеживания продаж'
}

export function CrmHero(props: CrmHeroProps) {
  const {
    heroTitle,
    heroMark,
    heroCta = 'Получить бесплатно',
    heroMore = 'Зафиксировать скидку в 10% для вашего номера',
    dealAlways,
  } = props

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
      <div className="container crm-hero__inner">
        <div className="crm-hero__copy reveal">
          <h1 className="crm-hero__title">
            {heroMark && heroTitle ? (
              <>
                {heroTitle}
                <br />
                <span className="crm-hero__mark">{heroMark}</span>
              </>
            ) : heroTitle ? (
              heroTitle
            ) : (
              <>
                <span className="crm-hero__mark">Бесплатная</span> CRM-система с установкой для
                отслеживания продаж
              </>
            )}
          </h1>
          <div className="crm-hero__rule" aria-hidden="true" />
          {dealAlways || props.heroMore != null ? (
            <p className="crm-hero__text">{props.heroMore ?? heroMore}</p>
          ) : null}
          <PhoneLeadForm
            leadName={leadName}
            leadSource={leadSource}
            submitLabel={heroCta}
            phoneLeadId="heroPhone"
            phoneLeadClass="crm-hero__form"
            phoneLeadBtnClass="btn--lure-light crm-hero__btn"
            phoneLeadDealBtn={Boolean(dealAlways)}
            noteOnHero
            phoneInputClassName="crm-hero__phone"
            errorClassName="crm-hero__form-error crm-phone-lead__error"
            doneClassName="crm-hero__done crm-phone-lead__done"
          />
        </div>

        <aside className="crm-hero__perks reveal" aria-label="Условия">
          <ul className="crm-hero__perks-list">
            <li>
              <span className="crm-hero__perk-value">1 неделя</span>
              <span className="crm-hero__perk-label">запуск из любого города</span>
            </li>
            <li>
              <span className="crm-hero__perk-value">Бессрочно</span>
              <span className="crm-hero__perk-label">поддержка после сдачи</span>
            </li>
            <li>
              <span className="crm-hero__perk-value">Работа по договору</span>
            </li>
          </ul>
          <p className="crm-hero__demos-link">
            <button type="button" className="crm-hero__demos-link-btn" data-demo-picker-open>
              <span className="crm-hero__demos-link-text">
                Протестировать
                <br />
                бесплатно
              </span>
              <svg
                className="crm-hero__demos-link-icon"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M3.5 8h7.5M8.5 5.5 11 8l-2.5 2.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </p>
        </aside>
      </div>
    </section>
  )
}
