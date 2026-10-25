export function CrmIntegrations() {
  return (
    <section className="crm-bridges" id="integrations" aria-labelledby="crm-bridges-title">
      <div className="container">
        <div className="section__head">
          <p className="section__eyebrow">Интеграции</p>
          <h2 className="section__title" id="crm-bridges-title">
            Куда попадает заявка
          </h2>
        </div>

        <ul className="crm-bridges__list" role="list">
          <li className="crm-bridge crm-bridge--direct">
            <div className="crm-bridge__stage" aria-hidden="true">
              <div className="crm-bridge__node">
                <img
                  className="crm-bridge__icon"
                  src="/assets/crm-bridge-direct.webp"
                  alt=""
                  width={96}
                  height={96}
                  decoding="async"
                />
                <span className="crm-bridge__label">Директ</span>
              </div>
              <span className="crm-bridge__arrow" />
              <div className="crm-bridge__node">
                <img
                  className="crm-bridge__icon"
                  src="/assets/crm-bridge-card.webp"
                  alt=""
                  width={96}
                  height={96}
                  decoding="async"
                />
                <span className="crm-bridge__label">Карточка</span>
              </div>
            </div>
            <h3 className="crm-bridge__title">Заявки из Директа в карточку клиента</h3>
          </li>

          <li className="crm-bridge crm-bridge--chat">
            <div className="crm-bridge__stage" aria-hidden="true">
              <div className="crm-bridge__node">
                <img
                  className="crm-bridge__icon"
                  src="/assets/crm-bridge-lead.webp"
                  alt=""
                  width={96}
                  height={96}
                  decoding="async"
                />
                <span className="crm-bridge__label">Заявка</span>
              </div>
              <span className="crm-bridge__arrow" />
              <div className="crm-bridge__node">
                <img
                  className="crm-bridge__icon"
                  src="/assets/crm-bridge-telegram.webp"
                  alt=""
                  width={96}
                  height={96}
                  decoding="async"
                />
                <span className="crm-bridge__label">Telegram</span>
              </div>
            </div>
            <h3 className="crm-bridge__title">Уведомление о заявке в Telegram</h3>
          </li>

          <li className="crm-bridge crm-bridge--inbox">
            <div className="crm-bridge__stage crm-bridge__stage--duo" aria-hidden="true">
              <div className="crm-bridge__from-duo">
                <div className="crm-bridge__node crm-bridge__node--mini">
                  <img
                    className="crm-bridge__icon"
                    src="/assets/crm-bridge-site.webp"
                    alt=""
                    width={80}
                    height={80}
                    decoding="async"
                  />
                  <span className="crm-bridge__label">Сайт</span>
                </div>
                <div className="crm-bridge__node crm-bridge__node--mini">
                  <img
                    className="crm-bridge__icon"
                    src="/assets/crm-bridge-phone.webp"
                    alt=""
                    width={80}
                    height={80}
                    decoding="async"
                  />
                  <span className="crm-bridge__label">Звонок</span>
                </div>
              </div>
              <span className="crm-bridge__arrow" />
              <div className="crm-bridge__node">
                <img
                  className="crm-bridge__icon"
                  src="/assets/crm-bridge-inbox.webp"
                  alt=""
                  width={96}
                  height={96}
                  decoding="async"
                />
                <span className="crm-bridge__label">Одно окно</span>
              </div>
            </div>
            <h3 className="crm-bridge__title">Заявки с сайта и телефонии в одно окно</h3>
          </li>

          <li className="crm-bridge crm-bridge--pay">
            <div className="crm-bridge__stage" aria-hidden="true">
              <div className="crm-bridge__node">
                <img
                  className="crm-bridge__icon"
                  src="/assets/crm-bridge-pay.webp"
                  alt=""
                  width={96}
                  height={96}
                  decoding="async"
                />
                <span className="crm-bridge__label">Оплата</span>
              </div>
              <span className="crm-bridge__arrow" />
              <div className="crm-bridge__node">
                <img
                  className="crm-bridge__icon"
                  src="/assets/crm-bridge-sheet.webp"
                  alt=""
                  width={96}
                  height={96}
                  decoding="async"
                />
                <span className="crm-bridge__label">Таблица</span>
              </div>
            </div>
            <h3 className="crm-bridge__title">В таблицу попадает только оплаченная заявка</h3>
          </li>
        </ul>

        <div className="crm-bridges__close">
          <p className="crm-bridges__pitch">
            Больше 1000 успешных интеграций: реклама, мессенджеры, телефония, оплаты. Напишите, как у
            вас приходят заявки — обсудим и соберём связку под ваш процесс.
          </p>
          <button
            className="btn btn--primary btn--lure-dark crm-bridges__cta"
            type="button"
            data-order-open
            data-order-source="integrations-estimate"
          >
            Оценить задачу
            <span className="crm-card__deal" aria-hidden="true">
              −10%
            </span>
          </button>
        </div>
      </div>
    </section>
  )
}
