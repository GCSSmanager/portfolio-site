import { EMAIL, PHONE_TEL, TELEGRAM_URL } from '../lib/contacts.ts'
import { SITE_ORIGIN, type RouteSeo } from './routeMeta.ts'

export function buildSchemaGraph(seo: RouteSeo, includeService: boolean) {
  const graph: Record<string, unknown>[] = [
    {
      '@type': 'Organization',
      '@id': `${SITE_ORIGIN}/#organization`,
      name: 'ГКСС',
      alternateName: 'Гибкие корпоративные системы и сервисы',
      url: `${SITE_ORIGIN}/crm/custom/`,
      logo: `${SITE_ORIGIN}/assets/gcss-logo.webp`,
      email: EMAIL,
      telephone: PHONE_TEL.replace('tel:', ''),
      address: {
        '@type': 'PostalAddress',
        postalCode: '129366',
        addressLocality: 'Москва',
        streetAddress: 'ул. Ярославская, д. 15, к. 3',
        addressCountry: 'RU',
      },
      sameAs: [TELEGRAM_URL],
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_ORIGIN}/#website`,
      url: `${SITE_ORIGIN}/`,
      name: 'ГКСС',
      inLanguage: 'ru',
      publisher: { '@id': `${SITE_ORIGIN}/#organization` },
    },
    {
      '@type': 'WebPage',
      '@id': `${seo.canonical}#webpage`,
      url: seo.canonical,
      name: seo.title,
      description: seo.description,
      inLanguage: 'ru',
      isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
      publisher: { '@id': `${SITE_ORIGIN}/#organization` },
    },
  ]

  if (includeService) {
    graph.push({
      '@type': 'Service',
      '@id': `${seo.canonical}#service`,
      name: seo.title,
      description: seo.description,
      url: seo.canonical,
      provider: { '@id': `${SITE_ORIGIN}/#organization` },
      areaServed: 'RU',
    })
  }

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  }
}

export const JSON_LD_SCRIPT_SELECTOR = 'script[data-gcss-seo-jsonld]'

export function jsonLdScriptHtml(seo: RouteSeo, includeService: boolean) {
  const json = JSON.stringify(buildSchemaGraph(seo, includeService))
  return `<script type="application/ld+json" data-gcss-seo-jsonld="">${json}</script>`
}

export function syncJsonLdInDocument(seo: RouteSeo, includeService: boolean) {
  const json = JSON.stringify(buildSchemaGraph(seo, includeService))
  let el = document.querySelector<HTMLScriptElement>(JSON_LD_SCRIPT_SELECTOR)
  if (!el) {
    el = document.createElement('script')
    el.type = 'application/ld+json'
    el.setAttribute('data-gcss-seo-jsonld', '')
    document.head.appendChild(el)
  }
  el.textContent = json
}

export function removeJsonLdFromDocument() {
  document.querySelector(JSON_LD_SCRIPT_SELECTOR)?.remove()
}
