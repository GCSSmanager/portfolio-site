import type { CrmGuideProps } from '@/crm/section-props'
import { PhoneLeadForm } from '@/components/crm/PhoneLeadForm'
import { CRM_FAQ, FREE_FAQ_OVERRIDES } from '@/data/crm-faq'
import { PHONE_TEL } from '@/lib/contacts'

export function CrmGuide({ faqVariant }: CrmGuideProps) {
  const plain = faqVariant === 'free'

  return (
    <section
      className={`crm-guide${plain ? ' crm-guide--plain' : ''}`}
      id="guide"
      aria-labelledby="crm-guide-title"
    >
      <div className="container">
        <div className="crm-guide__layout">
          <div className="crm-guide__intro">
            <div className="section__head">
              <p className="section__eyebrow">Коротко</p>
              <h2 className="section__title" id="crm-guide-title">
                Частые вопросы
              </h2>
            </div>
            <p className="crm-guide__lead">
              Не нашли ответа на свой вопрос —{' '}
              <a href={PHONE_TEL}>звоните нам</a>
              !
            </p>
            <div className="crm-guide__action">
              {!plain ? <span className="crm-guide__deal-bg" aria-hidden="true">−10%</span> : null}
              <PhoneLeadForm
                phoneLeadId="guide-phone"
                leadName="Бесплатная консультация"
                leadSource="guide-consult"
                submitLabel="Бесплатная консультация"
                phoneLeadBtnClass="btn--lure-dark crm-guide__cta"
              />
            </div>
          </div>

          <div className="crm-guide__list">
            {CRM_FAQ.map((item) => (
              <details key={item.q} className="crm-guide__item">
                <summary className="crm-guide__q">{item.q}</summary>
                <p className="crm-guide__a">
                  {plain && FREE_FAQ_OVERRIDES[item.q] ? FREE_FAQ_OVERRIDES[item.q] : item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
