export function AboutCrmMast() {
  return (
    <header className="crm-article__mast">
              <div className="crm-article__mast-arts" aria-hidden="true">
                <img
                  className="crm-article__mast-art crm-article__mast-art--left"
                  src="/assets/crm-about-art-left.webp"
                  alt=""
                  width={864}
                  height={1152}
                  decoding="async"
                 />
                <img
                  className="crm-article__mast-art crm-article__mast-art--right"
                  src="/assets/crm-about-art-right.webp"
                  alt=""
                  width={864}
                  height={1152}
                  decoding="async"
                 />
              </div>
              <div className="container crm-article__mast-inner">
                <h1 className="crm-article__title reveal" id="about-title">
                  Что такое <span className="crm-article__mark">CRM</span>
                </h1>
                <div className="crm-article__deck reveal">
                  <p>
                    <abbr title="Customer Relationship Management">CRM</abbr> — программа, где ведут клиентов и продажи. Пришла заявка или звонок — у человека появляется карточка: телефон, переписка, на каком этапе сделка, что сделать дальше.
                  </p>
                  <p>
                    Несколько менеджеров не переспрашивают друг друга «а что вы ему обещали» — история в карточке. Руководитель смотрит воронку: сколько заявок, кто завис, кому просрочена задача.
                  </p>
                </div>
                <div className="crm-article__mast-actions reveal">
                  <button className="btn btn--primary" type="button" data-order-open data-order-source="about-mast-consult" data-order-deal="off">
                    Бесплатная консультация
                  </button>
                  <button className="crm-article__mark crm-article__mast-demo" type="button" data-demo-picker-open>
                    <span>Бесплатное интерактивное демо</span>
                    <svg viewBox="2.6 4.5 9.3 7" fill="none" aria-hidden="true">
                      <path
                        d="M3.5 8h7.5M8.5 5.5 11 8l-2.5 2.5"
                        stroke="currentColor"
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              </div>
    </header>
  )
}
