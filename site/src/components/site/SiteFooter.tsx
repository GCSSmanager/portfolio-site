import { Link } from 'react-router-dom'
import { EMAIL, EMAIL_MAILTO, PHONE_DISPLAY, PHONE_TEL, TELEGRAM_URL, TELEGRAM_USERNAME } from '@/lib/contacts'

type SiteFooterProps = {
  variant?: 'home' | 'crm'
  brandHref?: string
}

export function SiteFooter({ variant = 'home', brandHref = '/' }: SiteFooterProps) {
  const year = new Date().getFullYear()

  return (
    <footer className={`footer${variant === 'crm' ? ' footer--crm' : ''}`}>
      <div className="container">
        <div className="footer__inner">
          <div className="footer__brand-block">
            <Link className="brand-lockup footer__brand" to={brandHref}>
              <img className="brand-lockup__mark" src="/assets/gcss-logo.webp" alt="" width={64} height={64} />
              <span className="brand-lockup__text">
                <span className="brand-lockup__tagline">Гибкие корпоративные системы и сервисы</span>
              </span>
            </Link>
            <p className="footer__copy">&copy; {year} ГКСС</p>
            <p className="footer__legal">
              Луговский Сергей Алексеевич · самозанятый (НПД) · ИНН 673109224083
            </p>
            <ul className="footer__docs" role="list">
              <li>
                <Link to="/legal/privacy/">Политика конфиденциальности</Link>
              </li>
              <li>
                <Link to="/legal/consent/">Согласие на обработку ПДн</Link>
              </li>
            </ul>
          </div>
          <ul className="footer__contacts" role="list">
            {variant === 'crm' ? (
              <>
                <li>
                  <span className="footer__link footer__link--static" title="Часы работы">
                    <ClockIcon />
                    <span>07:00–23:00</span>
                  </span>
                </li>
                <li>
                  <a
                    className="footer__link"
                    href="https://yandex.ru/maps/?text=Москва%2C%20Ярославская%20улица%2C%2015к3"
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Адрес"
                  >
                    <PinIcon />
                    <span>Ярославская, 15к3</span>
                  </a>
                </li>
                <li>
                  <a className="footer__link" href={PHONE_TEL} title="Телефон">
                    <PhoneIcon />
                    <span>{PHONE_DISPLAY}</span>
                  </a>
                </li>
              </>
            ) : null}
            <li>
              <a className="footer__link" href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" title="Telegram">
                <TelegramIcon />
                <span>@{TELEGRAM_USERNAME}</span>
              </a>
            </li>
            {variant === 'crm' ? (
              <li>
                <a className="footer__link" href={EMAIL_MAILTO} title="Эл. почта">
                  <MailIcon />
                  <span>{EMAIL}</span>
                </a>
              </li>
            ) : null}
          </ul>
        </div>
      </div>
    </footer>
  )
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4.5l3 1.5" />
    </svg>
  )
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.25" />
    </svg>
  )
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M8.2 4.8c.4-.4.9-.6 1.4-.5l2 .4c.6.1 1 .7.9 1.3l-.4 2.1a1.2 1.2 0 0 1-.7.9l-1.2.5a11.5 11.5 0 0 0 5.3 5.3l.5-1.2c.2-.4.5-.7.9-.7l2.1-.4c.6-.1 1.2.3 1.3.9l.4 2c.1.5-.1 1-.5 1.4l-1.1 1.1c-.4.4-1 .6-1.6.5C9.8 18.7 5.3 14.2 4.3 7.5c-.1-.6.1-1.2.5-1.6l1.4-1.1z" />
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
