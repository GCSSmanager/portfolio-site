import { useRef } from 'react'
import { CRM_PARTNER_LOGOS } from '@/data/crm-partners'
import { useMarqueeLoopPx } from '@/hooks/useMarqueeLoopPx'

function PartnerLogoGroup({ suffix, decorative }: { suffix: string; decorative?: boolean }) {
  return (
    <>
      {CRM_PARTNER_LOGOS.map((partner) => (
        <li key={`${partner.name}-${suffix}`} className="crm-partners__item">
          <img
            className="crm-partners__logo"
            src={partner.src}
            alt={decorative ? '' : partner.name}
            height={256}
            loading="eager"
            decoding="async"
            aria-hidden={decorative ? true : undefined}
          />
        </li>
      ))}
    </>
  )
}

export function CrmPartners() {
  const trackRef = useRef<HTMLDivElement>(null)
  const marqueeReady = useMarqueeLoopPx(trackRef)

  return (
    <section className="crm-partners" id="partners" aria-labelledby="crm-partners-title">
      <div className="container crm-partners__head">
        <div className="section__head">
          <p className="section__eyebrow">С нами сотрудничают</p>
          <h2 className="section__title" id="crm-partners-title">
            200+ довольных клиентов
          </h2>
        </div>
      </div>

      <div className="crm-partners__marquee">
        <div
          ref={trackRef}
          className={`crm-partners__track${marqueeReady ? ' is-ready' : ''}`}
        >
          <ul className="crm-partners__group" role="list" aria-label="Логотипы компаний и сервисов">
            <PartnerLogoGroup suffix="a" />
          </ul>
          <ul className="crm-partners__group" role="list" aria-hidden="true">
            <PartnerLogoGroup suffix="b" decorative />
          </ul>
        </div>
        <p className="visually-hidden">
          {CRM_PARTNER_LOGOS.map((p) => p.name).join(', ')}
        </p>
      </div>
    </section>
  )
}
