export function CrmAboutUs() {
  return (
    <section className="crm-about-us" id="about-us" aria-label="О компании">
      <div className="container">
        <div className="crm-about-us__grid">
          <div className="crm-about-us__copy">
            <p className="section__eyebrow">О компании</p>
            <p className="crm-about-us__lead">
              ГКСС — это команда <span className="crm-about-us__blob">опытных и ответственных</span> специалистов. Мы помогаем бизнесу расти и зарабатывать, разрабатывая{' '}
              <span className="crm-about-us__blob">продающие сайты</span> и внедряя эффективные{' '}
              <span className="crm-about-us__blob">CRM-системы</span>.
            </p>
            <p className="crm-about-us__lead">
              Программисты, тестировщики, дизайнеры и менеджеры работают вместе — ради{' '}
              <span className="crm-about-us__blob">успеха Вашего бизнеса</span>.
            </p>
          </div>
          <dl className="crm-about-us__stats">
            <div>
              <dt>довольных клиентов</dt>
              <dd>200+</dd>
            </div>
            <div>
              <dt>опыта</dt>
              <dd>10 лет</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  )
}
