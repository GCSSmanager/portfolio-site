import { PhoneLeadForm } from '@/components/crm/PhoneLeadForm'
import type { CrmContactsProps } from '@/crm/section-props'
import { EMAIL, EMAIL_MAILTO, PHONE_DISPLAY, PHONE_TEL, TELEGRAM_URL, TELEGRAM_USERNAME } from '@/lib/contacts'

export function CrmContacts({ showContactsDeal = true }: CrmContactsProps) {
  return (
    <section className="crm-contacts" id="contacts" aria-labelledby="crm-contacts-title">
      <div className="container">
        <div className="section__head">
          <p className="section__eyebrow">ГКСС</p>
          <h2 className="section__title" id="crm-contacts-title">
            Контакты
          </h2>
        </div>
        <div className="crm-contacts__stage">
          <address className="crm-contacts__info">
            <p className="crm-contacts__org">ГКСС</p>
            <p className="crm-contacts__note">Гибкие корпоративные системы и сервисы</p>
            <dl className="crm-contacts__list">
              <div className="crm-contacts__row">
                <dt>
                  <span className="visually-hidden">Адрес</span>
                  <svg
                    className="crm-contacts__icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    aria-hidden="true"
                  >
                    <path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11z" />
                    <circle cx="12" cy="10" r="2.25" />
                  </svg>
                </dt>
                <dd>
                  <a
                    href="https://yandex.ru/maps/?text=Москва%2C%20Ярославская%20улица%2C%2015к3"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    129366, г. Москва,
                    <br />
                    ул. Ярославская, д. 15, к. 3
                  </a>
                </dd>
              </div>
              <div className="crm-contacts__row">
                <dt>
                  <span className="visually-hidden">Часы работы</span>
                  <svg
                    className="crm-contacts__icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="8" />
                    <path d="M12 8v4.5l3 1.5" />
                  </svg>
                </dt>
                <dd>с 07:00 – 23:00</dd>
              </div>
              <div className="crm-contacts__row">
                <dt>
                  <span className="visually-hidden">Телефон</span>
                  <svg
                    className="crm-contacts__icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    aria-hidden="true"
                  >
                    <path d="M8.2 4.8c.4-.4.9-.6 1.4-.5l2 .4c.6.1 1 .7.9 1.3l-.4 2.1a1.2 1.2 0 0 1-.7.9l-1.2.5a11.5 11.5 0 0 0 5.3 5.3l.5-1.2c.2-.4.5-.7.9-.7l2.1-.4c.6-.1 1.2.3 1.3.9l.4 2c.1.5-.1 1-.5 1.4l-1.1 1.1c-.4.4-1 .6-1.6.5C9.8 18.7 5.3 14.2 4.3 7.5c-.1-.6.1-1.2.5-1.6l1.4-1.1z" />
                  </svg>
                </dt>
                <dd>
                  <a href={PHONE_TEL} data-phone-link>
                    <span data-phone-display>{PHONE_DISPLAY}</span>
                  </a>
                </dd>
              </div>
              <div className="crm-contacts__row">
                <dt>
                  <span className="visually-hidden">Telegram</span>
                  <svg className="crm-contacts__icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.169 1.858-.896 6.557-1.268 8.699-.171 1.003-.508 1.338-.833 1.371-.708.064-1.246-.468-1.931-.917-1.07-.703-1.675-1.139-2.712-1.826-1.2-.78-.422-1.21.261-1.912.18-.184 3.247-2.977 3.307-3.23.007-.031.014-.15-.056-.212-.07-.062-.173-.041-.248-.024-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.008-1.252-.241-1.865-.44-.752-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635.099-.002.321.023.465.14.118.095.151.223.167.312.017.09.038.297.021.459z" />
                  </svg>
                </dt>
                <dd>
                  <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" data-tg-link>
                    <span data-tg-username>@{TELEGRAM_USERNAME}</span>
                  </a>
                </dd>
              </div>
              <div className="crm-contacts__row">
                <dt>
                  <span className="visually-hidden">Эл. почта</span>
                  <svg
                    className="crm-contacts__icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    aria-hidden="true"
                  >
                    <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
                    <path d="m4.5 7.5 7.5 6 7.5-6" />
                  </svg>
                </dt>
                <dd>
                  <a href={EMAIL_MAILTO}>{EMAIL}</a>
                </dd>
              </div>
            </dl>
            <div className="crm-contacts__cta">
              <PhoneLeadForm
                phoneLeadId="contacts-phone"
                leadName="Заявка — контакты"
                leadSource="contacts-phone"
                submitLabel="Оставить заявку"
                phoneLeadBtnClass="btn--lure-dark crm-contacts__btn"
                phoneLeadDealBtn={showContactsDeal}
              />
              {showContactsDeal ? (
                <p className="crm-contacts__deal">
                  <span className="crm-contacts__deal-mark">Скидка 10% при заказе с сайта</span>
                </p>
              ) : null}
            </div>
          </address>
          <div className="crm-contacts__map">
            <iframe
              title="Офис ГКСС: Москва, Ярославская улица, 15к3"
              src="https://yandex.ru/map-widget/v1/?ll=37.6462%2C55.8198&amp;z=16&amp;pt=37.6462,55.8198,pm2rdm&amp;l=map&amp;scroll=false"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
