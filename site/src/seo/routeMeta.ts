/** Единый источник SEO для prerender (HTML) и PageMeta (клиент). */

export const SITE_ORIGIN = 'https://gcss-portfolio.ru'
export const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/assets/crm-hero.webp`

export type RouteSeo = {
  title: string
  description: string
  canonical: string
  robots?: string
}

export const crmRouteSeo = {
  custom: {
    title: 'Разработка CRM под ключ — индивидуальная CRM без подписки | ГКСС',
    description: 'CRM под ваш процесс. Скидка 10% при заказе с сайта.',
    canonical: `${SITE_ORIGIN}/crm/custom/`,
  },
  free: {
    title: 'Бесплатная CRM с установкой — без ежемесячной оплаты | ГКСС',
    description:
      'Бесплатная CRM для любого бизнеса: магазин, услуги, запись клиентов. Заявки и продажи в одном месте.',
    canonical: `${SITE_ORIGIN}/crm/free/`,
  },
  integrations: {
    title: 'CRM на заказ — интеграции с Директом, сайтом и Telegram | ГКСС',
    description: 'Заявки из Директа, с сайта и из звонков сразу в карточку, Telegram или таблицу.',
    canonical: `${SITE_ORIGIN}/crm/integrations/`,
  },
  about: {
    title: 'Что такое CRM — своя система вместо таблицы и Битрикс | ГКСС',
    description:
      'Что такое CRM: кому нужна — крупный бизнес, интеграции, рост; чем отличается от таблицы и чата; когда не нужна.',
    canonical: `${SITE_ORIGIN}/crm/about/`,
  },
} as const satisfies Record<string, RouteSeo>

export const legalRouteSeo = {
  privacy: {
    title: 'Политика конфиденциальности | ГКСС',
    description: 'Политика обработки персональных данных ГКСС.',
    canonical: `${SITE_ORIGIN}/legal/privacy/`,
  },
  consent: {
    title: 'Согласие на обработку ПДн | ГКСС',
    description: 'Согласие на обработку персональных данных.',
    canonical: `${SITE_ORIGIN}/legal/consent/`,
  },
} as const satisfies Record<string, RouteSeo>

export const kpRouteSeo: RouteSeo = {
  title: 'Генератор КП — ГКСС',
  description: 'Коммерческое предложение: редактор и PDF.',
  canonical: `${SITE_ORIGIN}/crm/kp/`,
  robots: 'noindex, nofollow',
}

export const notFoundRouteSeo: RouteSeo = {
  title: 'Страница не найдена — ГКСС',
  description: 'Упс, такой страницы нет.',
  canonical: `${SITE_ORIGIN}/crm/custom/`,
  robots: 'noindex, nofollow',
}

/** Ключ — pathname с trailing slash, как в React Router. */
export const routeSeoByPath: Record<string, RouteSeo> = {
  '/crm/custom/': crmRouteSeo.custom,
  '/crm/free/': crmRouteSeo.free,
  '/crm/integrations/': crmRouteSeo.integrations,
  '/crm/about/': crmRouteSeo.about,
  '/crm/kp/': kpRouteSeo,
  '/crm/': crmRouteSeo.custom,
  '/legal/privacy/': legalRouteSeo.privacy,
  '/legal/consent/': legalRouteSeo.consent,
}

export function seoForPathname(pathname: string): RouteSeo | undefined {
  if (routeSeoByPath[pathname]) return routeSeoByPath[pathname]
  const withSlash = pathname.endsWith('/') ? pathname : `${pathname}/`
  return routeSeoByPath[withSlash]
}

const CRM_SERVICE_PATHS = new Set(['/crm/custom/', '/crm/free/', '/crm/integrations/', '/crm/'])

/** JSON-LD for client navigations; prerender uses the same rules. */
export function jsonLdForPathname(pathname: string): { includeService: boolean } | null {
  const normalized = pathname.endsWith('/') ? pathname : `${pathname}/`
  const seo = routeSeoByPath[normalized]
  if (!seo || seo.robots?.includes('noindex')) return null
  if (CRM_SERVICE_PATHS.has(normalized)) return { includeService: true }
  if (normalized.startsWith('/crm/') || normalized.startsWith('/legal/')) return { includeService: false }
  return null
}
