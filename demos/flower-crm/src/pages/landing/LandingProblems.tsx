import { motion } from 'framer-motion'
import { LandingDecor } from './LandingDecor'
import { LANDING_PROBLEMS } from './landingContent'
import { ProblemIcon } from './ProblemIcon'

export function LandingProblems() {
  return (
    <section className="lp-problems" aria-labelledby="problems-title">
      <LandingDecor variant="bloom" className="lp-decor--float" style={{ top: '12px', right: '3%', width: '150px' }} />
      <LandingDecor
        variant="sprig"
        className="lp-decor--float-slow"
        style={{ bottom: '12px', left: '1%', width: '120px', transform: 'rotate(-18deg)' }}
      />
      <div className="lp-problems__inner">
        <motion.span
          className="lp-eyebrow"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-10%' }}
          transition={{ duration: 0.5 }}
        >
          Боль каждого магазина
        </motion.span>
        <motion.h2
          id="problems-title"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-10%' }}
          transition={{ duration: 0.6, delay: 0.05 }}
        >
          {LANDING_PROBLEMS.title}
        </motion.h2>
        <motion.p
          className="lp-problems__sub"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-10%' }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          {LANDING_PROBLEMS.sub}
        </motion.p>

        <motion.ul
          className="lp-problems__grid"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-8%' }}
          variants={{ show: { transition: { staggerChildren: 0.1 } } }}
        >
          {LANDING_PROBLEMS.items.map((item) => (
            <motion.li
              key={item.text}
              variants={{
                hidden: { opacity: 0, y: 56, scale: 0.9 },
                show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
              }}
            >
              <span className="lp-problems__icon" aria-hidden>
                <ProblemIcon name={item.icon} />
              </span>
              <span className="lp-problems__pain">{item.text}</span>
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </section>
  )
}
