import type { CrmPlanKey, CrmPlansProps } from '@/crm/section-props'

function showPlan(planKeys: CrmPlanKey[] | undefined, key: CrmPlanKey): boolean {
  return !planKeys || planKeys.includes(key)
}

export function CrmPlans({
  plansEyebrow = 'Решения',
  plansTitle = 'Какие бывают CRM?',
  planKeys,
  showPricing = true,
}: CrmPlansProps) {
  const single = planKeys?.length === 1

  return (
    <section className="crm-plans" id="tariffs" aria-labelledby="crm-plans-title">
      <div className="container">
        <div className="section__head">
          <p className="section__eyebrow">{plansEyebrow}</p>
          <h2 className="section__title" id="crm-plans-title">
            {plansTitle}
          </h2>
        </div>

        <div className={`crm-cards${single ? ' crm-cards--single' : ''}`}>
          {showPlan(planKeys, 'custom') ? (
            <article className="crm-card crm-card--featured">
              <header className="crm-card__head">
                <p className="crm-card__eyebrow">Рекомендуем</p>
                <h3 className="crm-card__title">Индивидуальная CRM</h3>
                <p className="crm-card__lead">
                  Система под вашу модель продаж и процессы — без компромиссов под чужой сервис.
                </p>
              </header>
              <ul className="crm-card__list" role="list">
                <li>Полная персонализация: экраны, кнопки, внешний вид</li>
                <li>Любая логика, отчёты и интеграции</li>
                <li>Разовая оплата — продукт остаётся Вашим</li>
                <li>Растёт вместе с компанией</li>
              </ul>
              <footer className="crm-card__foot">
                <p className="crm-card__price">от 10.000 ₽</p>
                <button
                  className="btn btn--primary btn--lure-light crm-card__btn"
                  type="button"
                  data-order-open
                  data-order-source="plan-custom-estimate"
                >
                  Оценить задачу
                  <span className="crm-card__deal" aria-hidden="true">
                    −10%
                  </span>
                </button>
              </footer>
            </article>
          ) : null}

          {showPlan(planKeys, 'catalog') ? (
            <article className="crm-card crm-card--popular">
              <header className="crm-card__head">
                <p className="crm-card__eyebrow">Популярное</p>
                <h3 className="crm-card__title">Решение из каталога</h3>
                <p className="crm-card__lead">
                  Готовая система под типовой бизнес из нашего каталога.
                </p>
              </header>
              <ul className="crm-card__list" role="list">
                <li>Продукт проверен на конкретном бизнесе</li>
                <li>Единоразовая оплата, без подписок</li>
                <li className="crm-card__list-item--con">Подходит для конкретной отрасли</li>
                <li className="crm-card__list-item--con">Меньше гибкости, чем индивидуальная</li>
              </ul>
              <footer className="crm-card__foot">
                <p className="crm-card__price">от 5.000 ₽</p>
                <button
                  className="btn btn--ghost btn--lure-dark crm-card__btn"
                  type="button"
                  data-order-open
                  data-order-source="plan-catalog-details"
                >
                  Узнать подробнее
                  <span className="crm-card__deal" aria-hidden="true">
                    −10%
                  </span>
                </button>
              </footer>
            </article>
          ) : null}
        </div>

        {showPricing ? (
          <p className="crm-plans__pricing-link">
            <a href="#pricing">
              <span className="crm-plans__pricing-link-text">Подробнее о ценах</span>
              <svg
                className="crm-plans__pricing-link-icon"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M8 3v9.5M4.5 9.5 8 13l3.5-3.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
          </p>
        ) : null}
      </div>
    </section>
  )
}
