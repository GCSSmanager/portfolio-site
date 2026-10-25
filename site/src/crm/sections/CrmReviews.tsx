import { useState } from 'react'
import type { CrmReviewKey, CrmReviewsProps } from '@/crm/section-props'

type Review = {
  key: CrmReviewKey
  letterSrc: string
  letterAlt: string
  shotSrc: string
  company: string
  paragraphs: [string, string]
}

const REVIEWS: Review[] = [
  {
    key: 'abris',
    letterSrc: '/assets/review-letter-abris.webp',
    letterAlt: 'Благодарственное письмо ООО «Абрис»',
    shotSrc: '/data/pest-crm/thumbnail.webp',
    company: 'ООО «Абрис»',
    paragraphs: [
      'Заявки и выезды от первого звонка до закрытого заказа: контроль мастеров и финансовая аналитика. Оператора можно соединить с клиентом прямо из карточки, если заявку не взяли вовремя.',
      'Быстрее обработка обращений, прозрачная загрузка бригад, контроль рекламы и понятная картина по деньгам.',
    ],
  },
  {
    key: 'praktika',
    letterSrc: '/assets/review-letter-praktika.webp',
    letterAlt: 'Благодарственное письмо ЛДЦ «Практика»',
    shotSrc: '/data/clinic-crm/thumbnail.webp',
    company: 'ЛДЦ «Практика»',
    paragraphs: [
      'Расписание и запись клиники: специалисты, клиенты, кабинеты и диагностические комиссии. От поиска свободного окна до печати маршрута пациента и контроля загрузки команды.',
      'Быстрее запись, меньше накладок по времени и кабинетам, спокойный контроль дня.',
    ],
  },
  {
    key: 'kamelia',
    letterSrc: '/assets/review-letter-kamelia.webp',
    letterAlt: 'Благодарственное письмо ООО «Камелия»',
    shotSrc: '/data/flower-crm/thumbnail.webp',
    company: 'ООО «Камелия»',
    paragraphs: [
      'Склад, продажи, поставки, команда и маржа. От приёмки и остатков по каждому сорту до продажи с обновлением склада и прозрачной экономики. Интерфейс спокойный и живой — под атмосферу салона, а не под заводской учёт.',
      'Склад совпадает с продажами, поставки принимаются по факту, владелец видит живую маржу и загрузку команды.',
    ],
  },
  {
    key: 'motorlab',
    letterSrc: '/assets/review-letter-motorlab.webp',
    letterAlt: 'Благодарственное письмо ООО «МоторЛаб»',
    shotSrc: '/data/motorlab-crm/thumbnail.webp',
    company: 'ООО «МоторЛаб»',
    paragraphs: [
      'Запись на ремонт, посты, мастера и запчасти в одном контуре. От заявки клиента до статуса «готово» — без переписок и бумажных листков.',
      'Меньше простоев постов, понятная загрузка смены, склад совпадает с работами.',
    ],
  },
  {
    key: 'severkuhnya',
    letterSrc: '/assets/review-letter-severkuhnya.webp',
    letterAlt: 'Благодарственное письмо ООО «СеверКухня»',
    shotSrc: '/data/severkuhnya-crm/thumbnail.webp',
    company: 'ООО «СеверКухня»',
    paragraphs: [
      'Заказы, кухня, курьеры и зоны доставки. Диспетчер видит статусы и сроки, команда работает по одной ленте без хаоса в чатах.',
      'Меньше потерянных заказов, быстрее реакция на опоздания, спокойный пиковый час.',
    ],
  },
  {
    key: 'sila',
    letterSrc: '/assets/review-letter-sila.webp',
    letterAlt: 'Благодарственное письмо студии «Сила»',
    shotSrc: '/data/sila-crm/thumbnail.webp',
    company: 'Студия «Сила»',
    paragraphs: [
      'Расписание тренеров, залы, абонементы и записи на групповые. Администратор закрывает день без Excel и пересечений.',
      'Прозрачная загрузка залов, меньше накладок по времени, клиенты записываются быстрее.',
    ],
  },
]

function visibleReviews(reviewKeys?: CrmReviewKey[]): Review[] {
  if (!reviewKeys) return REVIEWS
  return REVIEWS.filter((r) => reviewKeys.includes(r.key))
}

export function CrmReviews({ reviewKeys }: CrmReviewsProps) {
  const slides = visibleReviews(reviewKeys)
  const [index, setIndex] = useState(0)

  const show = (next: number) => {
    setIndex((next + slides.length) % slides.length)
  }

  return (
    <section className="crm-reviews" id="reviews" aria-labelledby="crm-reviews-title">
      <div className="container">
        <div className="section__head">
          <p className="section__eyebrow">Клиенты</p>
          <h2 className="section__title" id="crm-reviews-title">
            Отзывы и работы
          </h2>
        </div>

        <div className="crm-reviews__carousel">
          <div className="crm-reviews__viewport">
            {slides.map((review, i) => (
              <article key={review.key} className={`crm-review${i === index ? ' is-active' : ''}`}>
                <div className="crm-review__letter">
                  <img
                    className="crm-review__scan"
                    src={review.letterSrc}
                    alt={review.letterAlt}
                    width={864}
                    height={1152}
                  />
                </div>
                <div className="crm-review__shot">
                  <img src={review.shotSrc} alt="" width={800} height={600} />
                </div>
                <div className="crm-review__copy">
                  <h3 className="crm-review__company">{review.company}</h3>
                  <p>{review.paragraphs[0]}</p>
                  <p>{review.paragraphs[1]}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="crm-reviews__controls">
            <button
              className="crm-reviews__arrow"
              type="button"
              aria-label="Предыдущее письмо"
              onClick={() => show(index - 1)}
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                <path d="M10 3.5 5.5 8 10 12.5" />
              </svg>
            </button>
            <div className="crm-reviews__dots">
              {slides.map((slide, i) => (
                <button
                  key={slide.key}
                  type="button"
                  className={`crm-reviews__dot${i === index ? ' is-active' : ''}`}
                  aria-label={`Письмо ${i + 1}`}
                  onClick={() => show(i)}
                />
              ))}
            </div>
            <button
              className="crm-reviews__arrow crm-reviews__arrow--next"
              type="button"
              aria-label="Следующее письмо"
              onClick={() => show(index + 1)}
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                <path d="M6 3.5 10.5 8 6 12.5" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
