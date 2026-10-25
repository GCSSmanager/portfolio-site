import { WireOverlay } from '@/components/wires/WireOverlay'
import { useAboutSnakeWires } from '@/hooks/useAboutSnakeWires'

export function AboutCrmExample() {
  const { rootRef, setNodeRef, tgDy, width, height, paths } = useAboutSnakeWires()

  return (
      <div className="container crm-article__body">
              <section className="crm-article__sec" id="about-example" aria-labelledby="about-example-title">
                <header className="section__head crm-article__sec-head">
                  <p className="section__eyebrow">02 · Пример</p>
                  <h2 className="section__title" id="about-example-title">Как проходит одна сделка</h2>
                </header>
      
                <div ref={rootRef} className="crm-article__snake" aria-label="Путь сделки: заявка, чат, звонок, метрика, работа, оплата. Данные вымышленные.">
                  <p className="crm-article__snake-crm-name">CRM</p>
                  <WireOverlay
                    className="crm-article__snake-wires"
                    groupClassName="crm-article__snake-wires-g"
                    markerId="crm-snake-ah"
                    width={width}
                    height={height}
                    paths={paths}
                  />
                  <div className="crm-article__snake-crm">
                  <article ref={setNodeRef('d1')} className="crm-article__snake-crm-deal crm-article__snake-crm-deal--new">
                    <p className="crm-article__snake-crm-kicker">TEST-001 · новая</p>
                    <p className="crm-article__snake-crm-who">Иван</p>
                    <p className="crm-article__snake-crm-phone"><span>+7 (777)</span><span>777-77-77</span></p>
                    <p className="crm-article__snake-crm-meta">с test-site.ru</p>
                  </article>
                  <article ref={setNodeRef('d2')} className="crm-article__snake-crm-deal crm-article__snake-crm-deal--wait">
                    <p className="crm-article__snake-crm-kicker">TEST-001</p>
                    <p className="crm-article__snake-crm-who">Иван</p>
                    <p className="crm-article__snake-crm-phone"><span>+7 (777)</span><span>777-77-77</span></p>
                    <p className="crm-article__snake-crm-meta">ул. Тестовая, д. 14</p>
                    <p className="crm-article__snake-crm-meta">сб 10:00</p>
                    <p className="crm-article__snake-crm-flag"><span>мастер</span><span>не назначен !</span></p>
                  </article>
                  <article ref={setNodeRef('d3')} className="crm-article__snake-crm-deal crm-article__snake-crm-deal--ok">
                    <p className="crm-article__snake-crm-kicker">TEST-001</p>
                    <p className="crm-article__snake-crm-who">Иван</p>
                    <p className="crm-article__snake-crm-phone"><span>+7 (777)</span><span>777-77-77</span></p>
                    <p className="crm-article__snake-crm-meta">ул. Тестовая, д. 14</p>
                    <p className="crm-article__snake-crm-meta">сб 10:00</p>
                    <p className="crm-article__snake-crm-flag crm-article__snake-crm-flag--ok"><span>мастер назначен</span><span>Алексей</span></p>
                  </article>
                  <article ref={setNodeRef('d4')} className="crm-article__snake-crm-deal crm-article__snake-crm-deal--done">
                    <p className="crm-article__snake-crm-kicker">TEST-001</p>
                    <p className="crm-article__snake-crm-who">Иван</p>
                    <p className="crm-article__snake-crm-phone"><span>+7 (777)</span><span>777-77-77</span></p>
                    <p className="crm-article__snake-crm-meta">ул. Тестовая, д. 14</p>
                    <p className="crm-article__snake-crm-flag crm-article__snake-crm-flag--done">заказ завершён</p>
                    <p className="crm-article__snake-crm-meta crm-article__snake-crm-cash"><span>сдано в кассу</span><span>60 000 ₽</span></p>
                  </article>
                  </div>
      
                  <article ref={setNodeRef('site')} className="crm-article__snake-node crm-article__snake-node--site crm-article__snake-node--l1">
                    <div className="crm-article__snake-pic" aria-hidden="true">
                      <span className="crm-article__snake-chrome">
                        <i></i><i></i><i></i>
                        <span className="crm-article__snake-url">test-site.ru</span>
                      </span>
                      <p className="crm-article__snake-form-title">Заявка на работу</p>
                      <p className="crm-article__snake-field">Иван</p>
                      <p className="crm-article__snake-field">+7 (777) 777-77-77</p>
                      <p className="crm-article__snake-field">ул. Тестовая, д. 14</p>
                      <span className="crm-article__snake-send">
                        <span className="crm-article__snake-chip">Отправить</span>
                        <span className="crm-article__snake-cursor">
                          <svg className="crm-article__snake-flash" viewBox="0 0 32 32" aria-hidden="true">
                            <path d="M16 0.8 17.61 11.05 24.29 4.59 19.72 13.3 31.03 11.12 21.8 16 28.74 20.14 19.96 18.88 24.82 28.14 17.67 21.14 16 30.6 14.15 21.71 6.6 28.94 12.44 18.59 2.88 20.26 10.4 16 1.35 11.24 11.95 13.06 7.77 4.67 14.24 10.58Z"/>
                          </svg>
                          <svg className="crm-article__snake-mouse" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M4.2 2.4v16.4l4.4-4.2 3.1 7.3 2.6-1.1-3.1-7.2h6.8Z"/>
                          </svg>
                        </span>
                      </span>
                    </div>
                  </article>
                  <article
                    ref={setNodeRef('tg')}
                    className="crm-article__snake-node crm-article__snake-node--tg crm-article__snake-node--l2"
                    style={tgDy ? { translate: `0 ${tgDy}px` } : undefined}
                  >
                    <div className="crm-article__snake-pic">
                      <div className="crm-article__snake-tg-head">
                        <img
                          className="crm-article__snake-tg-logo"
                          src="/assets/telegram.webp"
                          alt=""
                          width={256}
                          height={256}
                          decoding="async"
                         />
                        <div>
                          <p className="crm-article__snake-tg-name">Заявки</p>
                          <p className="crm-article__snake-tg-count">13 участников</p>
                        </div>
                      </div>
                      <div className="crm-article__snake-tg-msg">
                        <p className="crm-article__snake-tg-title">Новая заявка</p>
                        <p>сб 10:00</p>
                        <p>ул. Тестовая, д. 14</p>
                        <p>Иван · +7 (777) 777-77-77</p>
                        <span className="crm-article__snake-tg-take">Взять</span>
                      </div>
                    </div>
                  </article>
                  <article ref={setNodeRef('call')} className="crm-article__snake-node crm-article__snake-node--call crm-article__snake-node--r1">
                    <div className="crm-article__snake-pic">
                      <div className="crm-article__snake-dial">
                        <div className="crm-article__snake-agent">
                          <span className="crm-article__snake-agent-face" aria-hidden="true"></span>
                          <p>оператор Анна</p>
                        </div>
                        <p className="crm-article__snake-dial-dir">исходящий</p>
                        <p className="crm-article__snake-dial-num">+7 (777) 777-77-77</p>
                        <p className="crm-article__snake-dial-who">Иван</p>
                      </div>
                    </div>
                  </article>
                  <article ref={setNodeRef('met')} className="crm-article__snake-node crm-article__snake-node--met crm-article__snake-node--r2">
                    <div className="crm-article__snake-pic">
                      <img
                        className="crm-article__snake-met-logo"
                        src="/assets/yandex-metrika.webp"
                        alt="Яндекс Метрика"
                        width={375}
                        height={284}
                        decoding="async"
                       />
                      <div className="crm-article__snake-met-chart">
                        <svg viewBox="0 0 200 100" overflow="visible" aria-hidden="true">
                          <defs>
                            <linearGradient id="crm-met-fill" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#3B7BFF" stopOpacity=".3"/>
                              <stop offset="100%" stopColor="#3B7BFF" stopOpacity="0"/>
                            </linearGradient>
                          </defs>
                          <line x1="0" y1="32" x2="200" y2="32" stroke="#e8eaef" />
                          <line x1="0" y1="56" x2="200" y2="56" stroke="#e8eaef" />
                          <line x1="0" y1="80" x2="200" y2="80" stroke="#e8eaef" />
                          <path fill="url(#crm-met-fill)" d="M6 96 6 84h38V72h38V60h38V48h38V96Z"/>
                          <path fill="none" stroke="#3B7BFF" strokeWidth="2.2" strokeLinejoin="miter" strokeLinecap="square" d="M6 84h38V72h38V60h38V48h38V34"/>
                          <circle cx="158" cy="34" r="3" fill="#fff" stroke="#3B7BFF" strokeWidth="1.8"/>
                          <text className="crm-article__snake-met-plus" x="164" y="31">+1</text>
                        </svg>
                      </div>
                      <p className="crm-article__snake-met-goal">цель «Заявка»</p>
                    </div>
                  </article>
                  <article ref={setNodeRef('job')} className="crm-article__snake-node crm-article__snake-node--job crm-article__snake-node--r3">
                    <div className="crm-article__snake-pic">
                      <div className="crm-article__snake-job">
                        <div className="crm-article__snake-job-who">
                          <span className="crm-article__snake-job-face crm-article__snake-job-face--master" aria-hidden="true"></span>
                          <p>мастер</p>
                          <p>Алексей</p>
                        </div>
                        <div className="crm-article__snake-job-ex">
                          <div className="crm-article__snake-job-flow">
                            <span className="crm-article__snake-job-oval">услуга</span>
                            <span className="crm-article__snake-job-dir" aria-hidden="true"></span>
                          </div>
                          <div className="crm-article__snake-job-flow crm-article__snake-job-flow--back">
                            <span className="crm-article__snake-job-dir" aria-hidden="true"></span>
                            <span className="crm-article__snake-job-oval crm-article__snake-job-oval--pay">100 000 ₽</span>
                          </div>
                        </div>
                        <div className="crm-article__snake-job-who">
                          <span className="crm-article__snake-job-face crm-article__snake-job-face--client" aria-hidden="true"></span>
                          <p>клиент</p>
                          <p>Иван</p>
                        </div>
                      </div>
                    </div>
                  </article>
                  <article ref={setNodeRef('bank')} className="crm-article__snake-node crm-article__snake-node--bank crm-article__snake-node--l3">
                    <div className="crm-article__snake-pic">
                      <div className="crm-article__snake-bank">
                        <img
                          className="crm-article__snake-bank-ico"
                          src="/assets/bank.webp"
                          alt=""
                          width={280}
                          height={194}
                          decoding="async"
                         />
                        <div className="crm-article__snake-bank-body">
                          <p className="crm-article__snake-bank-app">Мой банк</p>
                          <p className="crm-article__snake-bank-kind">Пополнение счёта</p>
                          <p className="crm-article__snake-bank-sum">+60 000 ₽</p>
                        </div>
                      </div>
                    </div>
                  </article>
                  <article ref={setNodeRef('stat')} className="crm-article__snake-node crm-article__snake-node--stat crm-article__snake-node--r4">
                    <div className="crm-article__snake-pic">
                      <div className="crm-article__snake-stat">
                        <div className="crm-article__snake-stat-chart" aria-hidden="true"></div>
                        <p className="crm-article__snake-stat-title">статистика<br />и отчёты</p>
                        <div className="crm-article__snake-stat-doc" aria-hidden="true">
                          <i></i><i></i><i></i>
                          <img
                            className="crm-article__snake-stat-logo"
                            src="/assets/ms-word.webp"
                            alt=""
                            width={256}
                            height={256}
                            decoding="async"
                           />
                        </div>
                      </div>
                    </div>
                  </article>
                </div>
      
                <div className="crm-article__snake-cta">
                  <button className="btn btn--primary" type="button" data-order-open data-order-source="about-example-try" data-order-deal="off">
                    Попробовать бесплатно
                  </button>
                </div>
      
              </section>
            </div>
  )
}
