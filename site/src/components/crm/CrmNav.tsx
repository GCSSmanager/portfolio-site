import { Link, NavLink } from 'react-router-dom'
import { useCrmNav } from '@/hooks/useCrmNav'
import { EMAIL_MAILTO, PHONE_DISPLAY, PHONE_TEL, TELEGRAM_URL } from '@/lib/contacts'
import type { CrmSolution } from '@/types/crm'

type CrmNavProps = {
  solution: CrmSolution
  brandHref: string
  dealAlways?: boolean
}

const solutions: { id: CrmSolution; to: string; label: string; aria: string }[] = [
  { id: 'custom', to: '/crm/custom/', label: 'Индивидуальная', aria: 'Индивидуальная' },
  { id: 'free', to: '/crm/free/', label: 'Бесплатная', aria: 'Бесплатная' },
  { id: 'integrations', to: '/crm/integrations/', label: 'Интеграции', aria: 'Интеграции' },
  { id: 'about', to: '/crm/about/', label: 'Что такое CRM', aria: 'Что такое CRM' },
]

export function CrmNav({ solution, brandHref }: CrmNavProps) {
  const { isOpen, toggle, close, burgerLabel, burgerAria } = useCrmNav()

  return (
    <header className={`nav nav--crm${isOpen ? ' is-nav-open' : ''}`} id="crmNav">
      <div className="container nav__inner">
        <Link className="brand-lockup nav__brand" to={brandHref} aria-label="ГКСС — Гибкие корпоративные системы и сервисы">
          <img className="brand-lockup__mark" src="/assets/gcss-logo.webp" alt="" width={64} height={64} decoding="async" />
          <span className="brand-lockup__text">
            <span className="brand-lockup__tagline">Гибкие корпоративные системы и сервисы</span>
          </span>
        </Link>

        <nav className="nav__menu nav__menu--solutions" id="crmNavMenu" aria-label="Решения">
          {solutions.map((item) => (
            <NavLink
              key={item.id}
              className={({ isActive }) =>
                `nav__link nav__link--solution${isActive || solution === item.id ? ' is-current' : ''}`
              }
              to={item.to}
              aria-label={item.aria}
              onClick={close}
            >
              <SolutionIcon id={item.id} />
              <span className="nav__link-text">{item.label}</span>
            </NavLink>
          ))}
          <a className="nav__contact nav__contact--menu" href={PHONE_TEL}>
            <span>{PHONE_DISPLAY}</span>
          </a>
        </nav>

        <div className="nav__links">
          <div className="nav__reach" aria-label="Связаться">
            <a className="nav__contact nav__contact--bar" href={PHONE_TEL}>
              <span>{PHONE_DISPLAY}</span>
            </a>
            <div className="nav__channels">
              <a className="nav__channel nav__channel--phone" href={PHONE_TEL} aria-label="Позвонить">
                <PhoneIcon />
              </a>
              <a className="nav__channel" href={EMAIL_MAILTO} aria-label={`Написать на почту ${EMAIL_MAILTO.replace('mailto:', '')}`}>
                <MailIcon />
              </a>
              <a
                className="nav__channel"
                href={TELEGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Telegram @GCSSmanager"
              >
                <TelegramIcon />
              </a>
            </div>
          </div>
          <button
            className="btn btn--primary btn--lure-light nav__cta"
            type="button"
            data-order-open
            data-order-source="nav-order"
            data-order-deal="off"
          >
            Консультация
          </button>
          <button
            className="nav__burger"
            type="button"
            aria-label={burgerAria}
            aria-expanded={isOpen}
            aria-controls="crmNavMenu"
            onClick={toggle}
          >
            <span className="nav__burger-icon" aria-hidden="true">
              <span className="nav__burger-line" />
              <span className="nav__burger-line" />
              <span className="nav__burger-line" />
            </span>
            <span className="nav__burger-label">{burgerLabel}</span>
          </button>
        </div>
      </div>
    </header>
  )
}

function SolutionIcon({ id }: { id: CrmSolution }) {
  if (id === 'custom') {
    return (
      <svg className="nav__link-icon nav__link-icon--key" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
        <circle cx="7" cy="12" r="3.75" />
        <circle cx="7" cy="12" r="1.45" />
        <path d="M10.75 12h9.5" />
        <path d="M17.25 12v3" />
        <path d="M20 12v2.15" />
      </svg>
    )
  }
  if (id === 'free') {
    return (
      <svg className="nav__link-icon nav__link-icon--tag" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
        <path d="M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 0 1 0 2.828l-7 7a2 2 0 0 1-2.828 0l-7-7A1.994 1.994 0 0 1 3 12V7a4 4 0 0 1 4-4z" />
        <circle cx="9.15" cy="9.15" r="1.05" strokeWidth="1.55" />
        <circle cx="13.15" cy="13.15" r="1.05" strokeWidth="1.55" />
        <path d="M12.65 8.65 9.65 13.65" strokeWidth="1.55" />
      </svg>
    )
  }
  if (id === 'integrations') {
    return (
      <svg className="nav__link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
        <circle cx="7" cy="12" r="2.3" />
        <circle cx="17" cy="7.2" r="2.3" />
        <circle cx="17" cy="16.8" r="2.3" />
        <path d="M9.1 11.2 14.8 8.3M9.1 12.8l5.7 2.9" />
      </svg>
    )
  }
  return (
    <svg className="nav__link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <rect x="5" y="4.2" width="14" height="15.6" rx="1.6" />
      <path d="M8 9h8M8 12.2h8M8 15.4h5" />
    </svg>
  )
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.86 19.86 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.05 12.05 0 0 0 .57 2.81 2 2 0 0 1-.5 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.05 12.05 0 0 0 2.81.57A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="m4.5 7.5 7.5 6 7.5-6" />
    </svg>
  )
}

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.169 1.858-.896 6.557-1.268 8.699-.171 1.003-.508 1.338-.833 1.371-.708.064-1.246-.468-1.931-.917-1.07-.703-1.675-1.139-2.712-1.826-1.2-.78-.422-1.21.261-1.912.18-.184 3.247-2.977 3.307-3.23.007-.031.014-.15-.056-.212-.07-.062-.173-.041-.248-.024-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.008-1.252-.241-1.865-.44-.752-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635.099-.002.321.023.465.14.118.095.151.223.167.312.017.09.038.297.021.459z" />
    </svg>
  )
}
