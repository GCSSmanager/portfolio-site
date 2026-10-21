import { motion } from 'framer-motion'
import { LandingDecor } from './LandingDecor'
import { LANDING_STEPS } from './landingContent'

export function LandingSteps() {
  return (
    <section className="lp-steps" aria-labelledby="steps-title">
      <LandingDecor
        variant="sprig"
        className="lp-decor--float"
        style={{ top: '12px', left: '4%', width: '130px' }}
      />
      <LandingDecor
        variant="bloom"
        className="lp-decor--float-slow"
        style={{ bottom: '12px', right: '1%', width: '150px' }}
      />
      <div className="lp-steps__inner">
        <motion.div
          className="lp-steps__head"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-10%' }}
          transition={{ duration: 0.6 }}
        >
          <span className="lp-eyebrow">Как это работает</span>
          <h2 id="steps-title">{LANDING_STEPS.title}</h2>
          <p>{LANDING_STEPS.sub}</p>
        </motion.div>

        <ol className="lp-steps__grid">
          {LANDING_STEPS.items.map((step, i) => (
            <motion.li
              key={step.num}
              initial={{ opacity: 0, y: 56, scale: 0.92 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: '-8%' }}
              transition={{ duration: 0.7, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="lp-steps__num">{step.num}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  )
}
