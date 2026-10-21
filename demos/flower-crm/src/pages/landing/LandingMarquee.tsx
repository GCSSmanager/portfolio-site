import { LANDING_MARQUEE } from './landingContent'

export function LandingMarquee() {
  const line = [...LANDING_MARQUEE, ...LANDING_MARQUEE]

  return (
    <div className="landing-marquee" aria-hidden>
      <div className="landing-marquee__track">
        {line.map((word, i) => (
          <span key={`${word}-${i}`} className="landing-marquee__item">
            {word}
          </span>
        ))}
      </div>
    </div>
  )
}
