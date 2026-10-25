import { Link } from 'react-router-dom'
import { LegalConsentArticle } from '@/pages/legal/LegalConsentArticle'
import { LegalPrivacyArticle } from '@/pages/legal/LegalPrivacyArticle'

type LegalDocumentProps = {
  slug: 'privacy' | 'consent'
}

const articles = {
  privacy: LegalPrivacyArticle,
  consent: LegalConsentArticle,
} as const

export function LegalDocument({ slug }: LegalDocumentProps) {
  const Article = articles[slug]

  return (
    <>
      <header className="nav nav--legal">
        <div className="container nav__inner">
          <Link className="brand-lockup nav__brand" to="/crm/custom/">
            <img className="brand-lockup__mark" src="/assets/gcss-logo.webp" alt="" width={64} height={64} />
            <span className="brand-lockup__text">
              <span className="brand-lockup__tagline">Гибкие корпоративные системы и сервисы</span>
            </span>
          </Link>
        </div>
      </header>
      <main className="legal-page">
        <Article />
      </main>
    </>
  )
}
