import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { CrmButton } from '../components/ui/CrmButton'
import { LandingCompare } from './landing/LandingCompare'
import { LandingDecor } from './landing/LandingDecor'
import { LandingFaq } from './landing/LandingFaq'
import { LandingFeatures } from './landing/LandingFeatures'
import { LandingHero } from './landing/LandingHero'
import { LandingMarquee } from './landing/LandingMarquee'
import { LandingMetrics } from './landing/LandingMetrics'
import { LandingProblems } from './landing/LandingProblems'
import { LandingSteps } from './landing/LandingSteps'
import { LandingTestimonial } from './landing/LandingTestimonial'
import { LANDING_CTA } from './landing/landingContent'
import './landingPage.css'

export function LandingPage() {
  const navigate = useNavigate()
  const openLogin = useCallback(() => navigate('/login'), [navigate])

  return (
    <div className="landing-page">
      <header className="landing-page__header">
        <a className="landing-page__brand" href="/">
          Flower<span>Flow</span>
        </a>
        <div className="landing-page__nav">
          <CrmButton variant="landingAuth" onClick={openLogin}>
            Войти
          </CrmButton>
          <CrmButton variant="landingCta" className="landing-page__nav-cta" onClick={openLogin}>
            Создать магазин
          </CrmButton>
        </div>
      </header>

      <main>
        <LandingHero />
        <LandingMarquee />
        <LandingProblems />
        <LandingFeatures />
        <LandingCompare />
        <LandingMetrics />
        <LandingTestimonial />
        <LandingFaq />
        <LandingSteps />

        <section className="lp-cta" aria-labelledby="cta-title">
          <LandingDecor
            variant="branch"
            lime
            className="lp-decor--lime lp-decor--float-slow"
            style={{ top: '30px', left: '1%', width: '210px' }}
          />
          <LandingDecor
            variant="eucalyptus"
            className="lp-decor--float"
            style={{ bottom: '20px', right: '1%', width: '160px', transform: 'scaleX(-1)' }}
          />
          <div className="lp-cta__inner">
            <h2 id="cta-title">{LANDING_CTA.title}</h2>
            <p>{LANDING_CTA.sub}</p>
            <CrmButton variant="landingCta" onClick={openLogin}>
              {LANDING_CTA.button}
            </CrmButton>
            <span className="lp-cta__note">{LANDING_CTA.note}</span>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <span className="landing-footer__brand">
          Flower<span>Flow</span>
        </span>
        <span className="landing-footer__tagline">Учёт для цветочного магазина</span>
        <a href="/login">Войти</a>
      </footer>
    </div>
  )
}
