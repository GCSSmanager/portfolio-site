import { useLocation } from 'react-router-dom'
import type { CrmHeroProps } from '@/crm/section-props'
import { PhoneLeadForm } from '@/components/crm/PhoneLeadForm'

function PerksDemoButton() {
  return (
    <button type="button" className="crm-hero__perks-demo" data-demo-picker-open>
      <span className="crm-hero__perks-demo-text">Бесплатное интерактивное портфолио</span>
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

function TitleShade({ title, yellow }: { title: string; yellow?: string }) {
  if (!yellow) return <span className="crm-hero__shade">{title}</span>
  const at = title.indexOf(yellow)
  if (at < 0) return <span className="crm-hero__shade">{title}</span>
  const before = title.slice(0, at).trimEnd()
  const after = title.slice(at + yellow.length).trimStart()
  return (
    <>
      {before ? <span className="crm-hero__shade">{before}</span> : null}
      {before ? ' ' : null}
      <span className="crm-hero__mark">{yellow}</span>
      {after ? ' ' : null}
      {after ? <span className="crm-hero__shade">{after}</span> : null}
    </>
  )
}

function heroAriaLabel(props: CrmHeroProps): string {
  if (props.showStockTitle === false && props.heroTitle) {
    return props.heroMark ? `${props.heroTitle}. ${props.heroMark}` : props.heroTitle
  }
  const lead = props.heroLead ?? 'Аналог amoCRM и Битрикс24'
  if (props.heroMark && props.heroTitle) return `${lead}. ${props.heroTitle} ${props.heroMark}`
  if (props.heroTitle) return `${lead}. ${props.heroTitle}`
  return `${lead}. Бесплатная программа для учёта клиентов`
}

export function CrmHero(props: CrmHeroProps) {
  const {
    heroLead,
    heroTitle,
    heroYellow,
    heroMark,
    heroCta = 'Получить бесплатно',
    heroMore = 'аренда и риелторы, автосервис, ресторан, ремонт техники, и многие другие',
    showStockTitle = true,
    demoHref,
    dealAlways,
    showPortfolio = true,
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
            {showStockTitle ? (
              <h1 className="crm-hero__title">{heroLead ?? <>Аналог amoCRM и&nbsp;Битрикс</>}</h1>
            ) : null}
            {showStockTitle ? (
              <p className="crm-hero__sub">
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
              </p>
            ) : (
              <h1 className="crm-hero__sub">
                {heroTitle ? <TitleShade title={heroTitle} yellow={heroYellow} /> : null}
                {heroTitle && heroMark ? <br /> : null}
                {heroMark ? <span className="crm-hero__mark">{heroMark}</span> : null}
              </h1>
            )}
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
                  <span className="crm-hero__perk-value">от{'\u00a0'}1{'\u00a0'}недели</span>
                  <span className="crm-hero__perk-label">запуск</span>
                </li>
                <li>
                  <span className="crm-hero__perk-value">бессрочно</span>
                  <span className="crm-hero__perk-label">поддержка</span>
                </li>
              </ul>
              {showPortfolio ? (
                <div className="crm-hero__perks-foot">
                  <PerksDemoButton />
                </div>
              ) : null}
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
