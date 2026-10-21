import { motion } from 'framer-motion'
import { LandingDecor } from './LandingDecor'
import { LANDING_COMPARE } from './landingContent'

export function LandingCompare() {
  return (
    <section className="lp-compare" aria-labelledby="compare-title">
      <LandingDecor
        variant="tulip"
        className="lp-decor--float"
        style={{ top: '10px', left: '4%', width: '120px' }}
      />
      <LandingDecor
        variant="sprig"
        className="lp-decor--float-slow"
        style={{ bottom: '12px', right: '3%', width: '120px', transform: 'rotate(14deg)' }}
      />
      <div className="lp-compare__inner">
        <motion.div
          className="lp-compare__head"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-10%' }}
          transition={{ duration: 0.6 }}
        >
          <h2 id="compare-title">{LANDING_COMPARE.title}</h2>
          <p>{LANDING_COMPARE.sub}</p>
        </motion.div>

        <div className="lp-compare__cols">
          <motion.div
            className="lp-compare__reveal"
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-8%' }}
            transition={{ duration: 0.55 }}
          >
            <div className="lp-compare__card lp-compare__card--before">
              <div className="lp-compare__top">
                <span className="lp-compare__mood" aria-hidden>
                  ☹
                </span>
                <span className="lp-compare__label">{LANDING_COMPARE.before.label}</span>
              </div>
              <ul>
                {LANDING_COMPARE.before.items.map((item) => (
                  <li key={item}>
                    <span className="lp-compare__icon lp-compare__icon--no" aria-hidden>
                      ✕
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>

          <motion.div
            className="lp-compare__reveal"
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-8%' }}
            transition={{ duration: 0.55, delay: 0.12 }}
          >
            <div className="lp-compare__card lp-compare__card--after">
              <div className="lp-compare__top">
                <span className="lp-compare__mood" aria-hidden>
                  ☺
                </span>
                <span className="lp-compare__label">{LANDING_COMPARE.after.label}</span>
              </div>
              <ul>
                {LANDING_COMPARE.after.items.map((item) => (
                  <li key={item}>
                    <span className="lp-compare__icon lp-compare__icon--yes" aria-hidden>
                      ✓
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
