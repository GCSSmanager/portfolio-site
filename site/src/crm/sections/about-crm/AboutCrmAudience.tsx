import { PhoneLeadForm } from '@/components/crm/PhoneLeadForm'

export function AboutCrmAudience() {
  return (
      <section className="crm-article__sec crm-article__sec--fit-band" id="about-audience" aria-labelledby="about-audience-title">
              <div className="container crm-article__sec-inner">
                <header className="section__head crm-article__sec-head">
                  <p className="section__eyebrow">03 · Кому</p>
                  <h2 className="section__title" id="about-audience-title">Кому это надо и кому не надо</h2>
                </header>
      
                <ul className="crm-article__fit" role="list">
                  <li>
                    <svg className="crm-article__fit-mark" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                      <circle cx="32" cy="16" r="6"/>
                      <path d="M20 38c1.2-6.2 6-9.2 12-9.2s10.8 3 12 9.2"/>
                      <circle cx="13" cy="22" r="4.2"/>
                      <path d="M5 40c.9-4.4 4.2-6.6 8.2-6.6"/>
                      <circle cx="51" cy="22" r="4.2"/>
                      <path d="M59 40c-.9-4.4-4.2-6.6-8.2-6.6"/>
                    </svg>
                    <div>
                      <p className="crm-article__fit-yes">
                        <svg className="crm-article__fit-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                          <path d="M5 12.5 9.2 17 19 7"/>
                        </svg>
                        <span>Сложные внутренние процессы и собственная логика работы: этапы, зоны ответственности и регламенты, которые команда проходит каждый день.</span>
                      </p>
                      <p className="crm-article__fit-no">
                        <svg className="crm-article__fit-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                          <path d="M7 7l10 10M17 7 7 17"/>
                        </svg>
                        <span>Процессы линейные, ролей немного, регламент умещается в одном документе.</span>
                      </p>
                    </div>
                  </li>
                  <li>
                    <svg className="crm-article__fit-mark" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                      <circle cx="16" cy="34" r="8"/>
                      <circle cx="40" cy="16" r="8"/>
                      <circle cx="48" cy="46" r="8"/>
                      <path d="M23 29.5 33.5 20.5M23 37.5 41 44"/>
                    </svg>
                    <div>
                      <p className="crm-article__fit-yes">
                        <svg className="crm-article__fit-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                          <path d="M5 12.5 9.2 17 19 7"/>
                        </svg>
                        <span>Внешние интеграции уже в модели работы: сайт, учёт, телефония и склад передают данные в единый процесс.</span>
                      </p>
                      <p className="crm-article__fit-no">
                        <svg className="crm-article__fit-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                          <path d="M7 7l10 10M17 7 7 17"/>
                        </svg>
                        <span>Внешних систем нет, обмен данными не требуется.</span>
                      </p>
                    </div>
                  </li>
                  <li>
                    <svg className="crm-article__fit-mark" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                      <circle cx="20" cy="34" r="5.5"/>
                      <path d="M10 52c1-5.4 4.6-8 10-8s9 2.6 10 8"/>
                      <circle cx="42" cy="24" r="7"/>
                      <path d="M28 52c1.4-7.6 6.2-11.2 14-11.2S54.6 44.4 56 52"/>
                    </svg>
                    <div>
                      <p className="crm-article__fit-yes">
                        <svg className="crm-article__fit-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                          <path d="M5 12.5 9.2 17 19 7"/>
                        </svg>
                        <span>В планах масштабирование: загрузкой сотрудников и сроками управляют расчётливо, без ручной координации на каждом этапе.</span>
                      </p>
                      <p className="crm-article__fit-no">
                        <svg className="crm-article__fit-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                          <path d="M7 7l10 10M17 7 7 17"/>
                        </svg>
                        <span>Масштабирование не запланировано, текущей организации ресурсов и времени достаточно.</span>
                      </p>
                    </div>
                  </li>
                </ul>
      
                <div className="crm-article__fit-cta">
                  <p>
                    Опишите,{' '}
                    <span className="crm-article__mark">как устроена работа сейчас</span>. На{' '}
                    <span className="crm-article__mark">консультации</span> определим, нужна ли{' '}
                    <span className="crm-article__mark">CRM вашей модели</span>, и предложим,{' '}
                    <span className="crm-article__mark">с чего начать</span>.
                  </p>
                  <div className="crm-article__fit-form">
                    <PhoneLeadForm
                      phoneLeadId="about-audience-phone"
                      leadName="Бесплатная консультация"
                      leadSource="about-audience-consult"
                      submitLabel="Бесплатная консультация"
                      phoneLeadClass="crm-article__fit-lead"
                      phoneLeadBtnClass="btn--lure-light"
                    />
                  </div>
                </div>
              </div>
            </section>
  )
}
