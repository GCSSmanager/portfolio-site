import { motion } from 'framer-motion'
import { LandingDecor } from './LandingDecor'
import { LANDING_FAQ } from './landingContent'

export function LandingFaq() {
  return (
    <section className="lp-faq" aria-labelledby="faq-title">
      <LandingDecor
        variant="eucalyptus"
        className="lp-decor--float"
        style={{ top: '12px', right: '1%', width: '150px' }}
      />
      <LandingDecor
        variant="tulip"
        className="lp-decor--float-slow"
        style={{ bottom: '20px', left: '3%', width: '110px' }}
      />
      <div className="lp-faq__inner">
        <motion.h2
          id="faq-title"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-10%' }}
          transition={{ duration: 0.6 }}
        >
          {LANDING_FAQ.title}
        </motion.h2>

        <div className="lp-faq__list">
          {LANDING_FAQ.items.map((item, i) => (
            <motion.details
              key={item.q}
              className="lp-faq__item"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-6%' }}
              transition={{ duration: 0.6, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
            >
              <summary>
                <span>{item.q}</span>
                <span className="lp-faq__chevron" aria-hidden>
                  +
                </span>
              </summary>
              <p>{item.a}</p>
            </motion.details>
          ))}
        </div>
      </div>
    </section>
  )
}
