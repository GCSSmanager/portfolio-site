import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef, type CSSProperties } from 'react'
import { LandingDecor } from './LandingDecor'
import { LANDING_SLIDES, type LandingSlide } from './landingContent'

type ClusterCard = {
  key: string
  src: string
  alt: string
  /** позиция/размер карточки в % внутри прямоугольника-контейнера */
  left: number
  top: number
  width: number
  zIndex?: number
  /** параметры покачивания */
  amp: number
  rot: number
  dur: number
  delay: number
}

const CLUSTERS: Record<string, ClusterCard[]> = {
  home: [
    { key: 'tasks', src: '/landing/home-tasks.webp', alt: 'Список дел смены', left: 8, top: 13, width: 36, zIndex: 3, amp: 14, rot: -1.2, dur: 6, delay: 0 },
    { key: 'supply', src: '/landing/home-supply.webp', alt: 'Поставка от поставщика', left: 11, top: 46, width: 35, zIndex: 4, amp: 18, rot: 1.4, dur: 7.2, delay: -2.4 },
    { key: 'stock', src: '/landing/home-stock.webp', alt: 'Инвентаризация склада', left: 56, top: 12, width: 37, amp: 13, rot: 1.2, dur: 5.4, delay: -1.2 },
    { key: 'flower', src: '/landing/home-flower.webp', alt: 'Карточка цветка', left: 55, top: 45, width: 35, amp: 16, rot: -1.4, dur: 6.6, delay: -3.3 },
  ],
  warehouse: [
    { key: 'menu', src: '/landing/wh-menu.webp', alt: 'Разделы склада', left: 6, top: 24, width: 33, zIndex: 2, amp: 15, rot: -1.2, dur: 6.4, delay: 0 },
    { key: 'supply', src: '/landing/wh-supply.webp', alt: 'Поставка к приёму', left: 30, top: 8, width: 62, zIndex: 5, amp: 11, rot: 0.8, dur: 5.6, delay: -2 },
    { key: 'rose', src: '/landing/wh-rose.webp', alt: 'Карточка розы «Ред Наоми»', left: 52, top: 26, width: 40, zIndex: 4, amp: 16, rot: 1.4, dur: 7, delay: -1 },
    { key: 'mix', src: '/landing/wh-mix.webp', alt: 'Букет «Полевой микс»', left: 54, top: 50, width: 40, zIndex: 3, amp: 18, rot: -1.4, dur: 6.8, delay: -3.4 },
    { key: 'gift', src: '/landing/wh-gift.webp', alt: 'Товар «Подарочный пакет»', left: 50, top: 71, width: 38, zIndex: 6, amp: 14, rot: 1.2, dur: 5.2, delay: -1.8 },
  ],
  sales: [
    { key: 'pay', src: '/landing/sale-pay.webp', alt: 'Окно оплаты', left: 6, top: 16, width: 32, zIndex: 3, amp: 16, rot: -1.2, dur: 6.6, delay: 0 },
    { key: 'writeoff', src: '/landing/sale-writeoff.webp', alt: 'Списание со склада', left: 52, top: 24, width: 40, zIndex: 2, amp: 14, rot: 1.2, dur: 7, delay: -2.5 },
    { key: 'actions', src: '/landing/sale-actions.webp', alt: 'Кнопки продажи и списания', left: 40, top: 7, width: 17, zIndex: 6, amp: 20, rot: -2, dur: 5, delay: -1.2 },
  ],
  suppliers: [
    { key: 'order', src: '/landing/sup-order.webp', alt: 'Создание поставки', left: 4, top: 20, width: 30, zIndex: 2, amp: 14, rot: -1.2, dur: 6.8, delay: 0 },
    { key: 'income', src: '/landing/sup-income.webp', alt: 'Новый приход', left: 37, top: 40, width: 28, zIndex: 4, amp: 16, rot: 1.2, dur: 6, delay: -2.2 },
    { key: 'accept', src: '/landing/sup-accept.webp', alt: 'Приёмка поставки', left: 66, top: 13, width: 30, zIndex: 3, amp: 13, rot: -1, dur: 7.2, delay: -1.4 },
    { key: 'actions', src: '/landing/sup-actions.webp', alt: 'Кнопки поставки и прихода', left: 39, top: 10, width: 24, zIndex: 6, amp: 20, rot: 1.6, dur: 5, delay: -3 },
  ],
  economy: [
    { key: 'chart', src: '/landing/eco-chart.webp', alt: 'Динамика выручки и прибыли', left: 2, top: 2, width: 46, zIndex: 3, amp: 14, rot: -1, dur: 6.8, delay: 0 },
    { key: 'types', src: '/landing/eco-types.webp', alt: 'Прибыль по видам', left: 2, top: 60, width: 46, zIndex: 4, amp: 16, rot: 1, dur: 6.4, delay: -2.6 },
    { key: 'costs', src: '/landing/eco-costs.webp', alt: 'Расходы за период', left: 51, top: 2, width: 46, zIndex: 2, amp: 13, rot: 1.2, dur: 7.2, delay: -1 },
    { key: 'kpi', src: '/landing/eco-kpi.webp', alt: 'Чеки, выручка, прибыль', left: 51, top: 60, width: 26, zIndex: 6, amp: 18, rot: -1.4, dur: 5.6, delay: -1.5 },
  ],
  team: [
    { key: 'add', src: '/landing/team-add.webp', alt: 'Добавление флориста', left: 3, top: 8, width: 33, zIndex: 3, amp: 14, rot: -1.2, dur: 6.8, delay: 0 },
    { key: 'user', src: '/landing/team-user.webp', alt: 'Карточка сотрудника', left: 38, top: 26, width: 30, zIndex: 4, amp: 18, rot: 1.2, dur: 6, delay: -2.2 },
    { key: 'nav', src: '/landing/team-nav.webp', alt: 'Навигация по ролям', left: 3, top: 62, width: 46, zIndex: 3, amp: 12, rot: -1, dur: 7.4, delay: -1.4 },
    { key: 'task', src: '/landing/team-task.webp', alt: 'Новая задача', left: 70, top: 9, width: 26, zIndex: 2, amp: 13, rot: 1, dur: 7.2, delay: -1 },
  ],
}

const TALL_CLUSTERS = new Set(['economy'])

function FeatureCluster({ slideId, label }: { slideId: string; label: string }) {
  const cards = CLUSTERS[slideId]
  const tall = TALL_CLUSTERS.has(slideId)
  return (
    <div className={`lp-home${tall ? ' lp-home--tall' : ''}`} role="img" aria-label={label}>
      {cards.map((c, i) => (
        <motion.div
          key={c.key}
          className="lp-home__card"
          style={{ left: `${c.left}%`, top: `${c.top}%`, width: `${c.width}%`, zIndex: c.zIndex ?? 2 }}
          initial={{ opacity: 0, y: 46, scale: 0.86 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: '-12%' }}
          transition={{ type: 'spring', stiffness: 90, damping: 14, mass: 0.8, delay: 0.08 * i }}
        >
          <div
            className="lp-home__float"
            style={
              {
                '--amp': `${c.amp}px`,
                '--rot': `${c.rot}deg`,
                animationDuration: `${c.dur}s`,
                animationDelay: `${c.delay}s`,
              } as CSSProperties
            }
          >
            <img src={c.src} alt={c.alt} loading="lazy" decoding="async" draggable={false} />
          </div>
        </motion.div>
      ))}
    </div>
  )
}

function FeatureRow({ slide, index }: { slide: LandingSlide; index: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const flip = index % 2 === 1
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const rotateY = useTransform(scrollYProgress, [0, 0.5, 1], flip ? [16, 0, -12] : [-16, 0, 12])
  const rotateX = useTransform(scrollYProgress, [0, 0.5, 1], [8, 0, -6])
  const y = useTransform(scrollYProgress, [0, 1], [70, -70])

  return (
    <div ref={ref} className={`lp-feat__row${flip ? ' lp-feat__row--flip' : ''}`}>
      <motion.div
        className="lp-feat__copy"
        initial={{ opacity: 0, y: 60, scale: 0.96 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, margin: '-12%' }}
        transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
      >
        <span className="lp-feat__index">{String(index + 1).padStart(2, '0')}</span>
        <span className="lp-feat__kicker">{slide.kicker}</span>
        <h3>{slide.title}</h3>
        <p>{slide.hook}</p>
      </motion.div>

      <div className="lp-feat__stage">
        {CLUSTERS[slide.id] ? (
          <motion.div className="lp-feat__media lp-feat__media--home" style={{ y }}>
            <FeatureCluster slideId={slide.id} label={`${slide.kicker}: ${slide.title}`} />
          </motion.div>
        ) : (
          <motion.div className="lp-feat__media" style={{ y }}>
            <motion.div
              className="lp-feat__enter"
              initial={{ opacity: 0, x: flip ? -140 : 140, scale: 0.8, rotate: flip ? -5 : 5 }}
              whileInView={{ opacity: 1, x: 0, scale: 1, rotate: 0 }}
              viewport={{ once: true, margin: '-12%' }}
              transition={{ type: 'spring', stiffness: 70, damping: 13, mass: 0.9 }}
            >
              <motion.div className="lp-feat__device" style={{ rotateY, rotateX, transformPerspective: 1200 }}>
                <div className="lp-feat__shell">
                  <img
                    src={slide.imageSrc}
                    alt={slide.title}
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      const img = e.currentTarget
                      if (img.src !== slide.imageFallback) img.src = slide.imageFallback
                    }}
                  />
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        )}

        <motion.div
          className={`lp-feat__badge${flip ? ' lp-feat__badge--flip' : ''}`}
          initial={{ opacity: 0, y: 18, scale: 0.85 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: '-20%' }}
          transition={{ duration: 0.55, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="lp-chip lp-chip--float">
            <strong>{slide.badge.value}</strong>
            <em>{slide.badge.label}</em>
          </span>
        </motion.div>
      </div>
    </div>
  )
}

export function LandingFeatures() {
  return (
    <section id="product" className="lp-feat" aria-labelledby="feat-title">
      <LandingDecor
        variant="branch"
        className="lp-decor--float-slow"
        style={{ top: '24px', right: '1%', width: '220px' }}
      />
      <LandingDecor
        variant="eucalyptus"
        className="lp-decor--float"
        style={{ bottom: '40px', left: '1%', width: '150px', transform: 'scaleX(-1)' }}
      />
      <div className="lp-feat__inner">
        <motion.div
          className="lp-feat__head"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-12%' }}
          transition={{ duration: 0.6 }}
        >
          <span className="lp-eyebrow">Что внутри FlowerFlow</span>
          <h2 id="feat-title">Весь магазин — в одном экране</h2>
          <p>Модули, которые работают как одна система. Без переключений между таблицами и чатами.</p>
        </motion.div>

        <div className="lp-feat__rows">
          {LANDING_SLIDES.map((slide, i) => (
            <FeatureRow key={slide.id} slide={slide} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
