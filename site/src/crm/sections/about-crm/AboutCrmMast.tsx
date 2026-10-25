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
                <h1 className="crm-article__title" id="about-title">
                  Что такое <span className="crm-article__mark">CRM</span>
                </h1>
                <div className="crm-article__deck">
                  <p>
                    <abbr title="Customer Relationship Management">CRM</abbr> — программа, где ведут клиентов и продажи. Пришла заявка или звонок — у человека появляется карточка: телефон, переписка, на каком этапе сделка, что сделать дальше.
                  </p>
                  <p>
                    Несколько менеджеров не переспрашивают друг друга «а что вы ему обещали» — история в карточке. Руководитель смотрит воронку: сколько заявок, кто завис, кому просрочена задача.
                  </p>
                </div>
                <div className="crm-article__mast-actions">
                  <button className="btn btn--primary" type="button" data-order-open data-order-source="about-mast-consult" data-order-deal="off">
                    Бесплатная консультация
                  </button>
                </div>
              </div>
    </header>
  )
}
