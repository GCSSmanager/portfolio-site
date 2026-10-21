import { motion } from 'framer-motion'
import { LandingDecor } from './LandingDecor'
import { LANDING_TESTIMONIALS } from './landingContent'

export function LandingTestimonial() {
  return (
    <section className="lp-quote" aria-labelledby="quote-title">
      <LandingDecor
        variant="branch"
        className="lp-decor--float-slow"
        style={{ top: '20px', left: '1%', width: '190px' }}
      />
      <LandingDecor
        variant="sprig"
        className="lp-decor--float"
        style={{ bottom: '14px', right: '3%', width: '120px', transform: 'rotate(20deg)' }}
      />

      <div className="lp-quote__inner">
        <motion.div
          className="lp-quote__head"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-10%' }}
          transition={{ duration: 0.6 }}
        >
          <span className="lp-eyebrow">Отзывы</span>
          <h2 id="quote-title">{LANDING_TESTIMONIALS.title}</h2>
          <p>{LANDING_TESTIMONIALS.sub}</p>
        </motion.div>

        <ul className="lp-quote__grid">
          {LANDING_TESTIMONIALS.items.map((item, i) => (
            <motion.li
              key={item.author}
              className="lp-quote__card"
              initial={{ opacity: 0, y: 56, scale: 0.92 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: '-8%' }}
              transition={{ duration: 0.7, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="lp-quote__mark" aria-hidden>
                “
              </span>
              <blockquote>{item.quote}</blockquote>
              <figcaption>
                <img
                  src={item.avatar}
                  alt=""
                  width={44}
                  height={44}
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    const img = e.currentTarget
                    if (img.src !== item.avatarFallback) img.src = item.avatarFallback
                  }}
                />
                <span>
                  <strong>{item.author}</strong>
                  <em>{item.role}</em>
                </span>
              </figcaption>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  )
}
