import { motion, useScroll, useTransform } from 'framer-motion'
import { useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { CrmButton } from '../../components/ui/CrmButton'
import { LANDING_HERO } from './landingContent'

export function LandingHero() {
  const navigate = useNavigate()
  const openLogin = useCallback(() => navigate('/login'), [navigate])
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const rotateY = useTransform(scrollYProgress, [0, 1], [8, -14])
  const rotateX = useTransform(scrollYProgress, [0, 1], [6, -4])
  const lift = useTransform(scrollYProgress, [0, 1], [0, 48])

  return (
    <section ref={ref} className="lp-hero" aria-labelledby="hero-title">
      <div className="lp-hero__bg" aria-hidden>
        <span className="lp-hero__glow lp-hero__glow--a" />
        <span className="lp-hero__glow lp-hero__glow--b" />
        <span className="lp-hero__blob" />
      </div>

      <motion.div
        className="lp-hero__copy"
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        <p className="lp-hero__eyebrow">{LANDING_HERO.eyebrow}</p>
        <h1 id="hero-title">
          {LANDING_HERO.line1}
          <em>{LANDING_HERO.line2}</em>
        </h1>
        <p className="lp-hero__sub">{LANDING_HERO.sub}</p>
        <div className="lp-hero__actions">
          <CrmButton variant="landingCta" onClick={openLogin}>
            {LANDING_HERO.ctaPrimary}
          </CrmButton>
          <a href="#product">{LANDING_HERO.ctaSecondary}</a>
        </div>
        <p className="lp-hero__trust">{LANDING_HERO.trust}</p>
      </motion.div>

      <div className="lp-hero__stage">
        <motion.div className="lp-hero__device" style={{ rotateY, rotateX, y: lift }}>
          <div className="lp-hero__device-shell">
            <img
              src={LANDING_HERO.imageSrc}
              alt={LANDING_HERO.imageAlt}
              fetchPriority="high"
              decoding="async"
              onError={(e) => {
                const img = e.currentTarget
                if (img.src !== LANDING_HERO.imageFallback) img.src = LANDING_HERO.imageFallback
              }}
            />
          </div>

          {LANDING_HERO.chips.map((chip, i) => (
            <motion.div
              key={chip.label}
              className={`lp-hero__chip lp-hero__chip--${i + 1}`}
              initial={{ opacity: 0, y: 16, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.6 + i * 0.15, ease: [0.16, 1, 0.3, 1] }}
            >
              <strong>{chip.value}</strong>
              <span>{chip.label}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
