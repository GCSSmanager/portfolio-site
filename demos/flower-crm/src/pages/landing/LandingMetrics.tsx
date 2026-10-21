import { animate, motion, useInView, useMotionValue, useTransform } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { LandingDecor } from './LandingDecor'
import { LANDING_METRICS, type MetricItem } from './landingContent'

function MetricCard({ item, index }: { item: MetricItem; index: number }) {
  const ref = useRef<HTMLLIElement>(null)
  const inView = useInView(ref, { once: true, margin: '-12%' })
  const count = useMotionValue(0)
  const text = useTransform(count, (v) => `${item.prefix}${Math.round(v)}${item.suffix}`)
  useEffect(() => {
    if (!inView) return
    const controls = animate(count, item.to, { duration: 1.4, delay: 0.2, ease: [0.16, 1, 0.3, 1] })
    return () => controls.stop()
  }, [inView, count, item.to])

  return (
    <motion.li
      ref={ref}
      className="lp-metrics__card"
      initial={{ opacity: 0, y: 56, scale: 0.92 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-8%' }}
      transition={{ duration: 0.7, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
    >
      <span className="lp-metrics__icon" aria-hidden>
        <img
          src={`/landing/metrics/${item.id}.svg`}
          alt=""
          width={24}
          height={24}
          loading="lazy"
          decoding="async"
        />
      </span>
      <motion.strong>{text}</motion.strong>
      <div className="lp-metrics__bar" aria-hidden>
        <motion.span
          initial={{ width: 0 }}
          whileInView={{ width: `${item.bar}%` }}
          viewport={{ once: true, margin: '-8%' }}
          transition={{ duration: 1.2, delay: 0.3 + index * 0.08, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
      <span className="lp-metrics__label">{item.label}</span>
    </motion.li>
  )
}

export function LandingMetrics() {
  return (
    <section className="lp-metrics" aria-labelledby="metrics-title">
      <LandingDecor
        variant="eucalyptus"
        className="lp-decor--float-slow"
        style={{ top: '12px', left: '1%', width: '160px' }}
      />
      <LandingDecor
        variant="bloom"
        className="lp-decor--float"
        style={{ bottom: '12px', right: '4%', width: '130px' }}
      />

      <div className="lp-metrics__inner">
        <motion.div
          className="lp-metrics__head"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-10%' }}
          transition={{ duration: 0.6 }}
        >
          <span className="lp-eyebrow">Результат</span>
          <h2 id="metrics-title">{LANDING_METRICS.title}</h2>
          <p>{LANDING_METRICS.sub}</p>
        </motion.div>

        <ul className="lp-metrics__grid">
          {LANDING_METRICS.items.map((item, i) => (
            <MetricCard key={item.id} item={item} index={i} />
          ))}
        </ul>
      </div>
    </section>
  )
}
