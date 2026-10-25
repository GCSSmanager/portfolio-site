export function CrmKit() {
  return (
    <section className="crm-kit" aria-labelledby="crm-kit-title">
      <div className="container">
        <div className="section__head crm-kit__head">
          <p className="section__eyebrow">Бесплатный пакет</p>
          <h2 className="section__title" id="crm-kit-title">
            Что входит
          </h2>
          <p className="section__lead">База, сделки и задачи — чтобы вести продажи в одном месте.</p>
        </div>

        <div className="crm-kit__stage">
          <ul className="crm-kit__grid" role="list">
            <li className="crm-kit__item crm-kit__item--rose">
              <div className="crm-kit__top">
                <div className="crm-kit__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <circle cx="9" cy="8.2" r="2.6" />
                    <path d="M4.6 17.6c.7-3 2.4-4.4 4.4-4.4s3.7 1.4 4.4 4.4" />
                    <rect x="13.2" y="6.4" width="6.6" height="8.4" rx="1.4" />
                    <path d="M14.8 9.2h3.4M14.8 11.6h2.4" />
                  </svg>
                </div>
                <h3 className="crm-kit__name">Клиенты</h3>
              </div>
              <p className="crm-kit__text">Контакты и карточки в одной базе.</p>
            </li>
            <li className="crm-kit__item crm-kit__item--green">
              <div className="crm-kit__top">
                <div className="crm-kit__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <path d="M4.5 7.2h5.2L11.4 10H19.5v8.2H4.5V7.2Z" strokeLinejoin="round" />
                    <path d="M7.4 13.4h9.2M7.4 16h6.4" strokeLinecap="round" />
                  </svg>
                </div>
                <h3 className="crm-kit__name">Сделки</h3>
              </div>
              <p className="crm-kit__text">Воронка и статусы по каждому клиенту.</p>
            </li>
            <li className="crm-kit__item crm-kit__item--blue">
              <div className="crm-kit__top">
                <div className="crm-kit__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <rect x="6.2" y="4.6" width="11.6" height="15.2" rx="1.8" />
                    <path d="M9.2 4.6V3.8a2 2 0 0 1 2-1.6h1.6a2 2 0 0 1 2 1.6v.8" strokeLinecap="round" />
                    <path d="M8.8 11.2 10.6 13l3.4-3.6" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M8.8 16.4h6.4" strokeLinecap="round" />
                  </svg>
                </div>
                <h3 className="crm-kit__name">Задачи</h3>
              </div>
              <p className="crm-kit__text">Напоминания, чтобы ничего не потерялось.</p>
            </li>
            <li className="crm-kit__item crm-kit__item--terra">
              <div className="crm-kit__top">
                <div className="crm-kit__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <circle cx="9" cy="8.4" r="2.5" />
                    <path d="M4.8 17.8c.7-3.2 2.4-4.6 4.2-4.6s3.5 1.4 4.2 4.6" />
                    <circle cx="16" cy="8.8" r="2.1" />
                    <path d="M13.6 17.8c.5-2.6 1.8-3.8 3.2-3.8 1.8 0 3.2 1.4 3.8 3.8" />
                  </svg>
                </div>
                <h3 className="crm-kit__name">Команда</h3>
              </div>
              <p className="crm-kit__text">Общая база для тех, кто продаёт.</p>
            </li>
          </ul>

          <div className="crm-kit__action">
            <button
              className="btn btn--primary btn--lure-dark"
              type="button"
              data-order-open
              data-order-source="kit-free"
              data-order-deal="off"
            >
              Получить бесплатно
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
