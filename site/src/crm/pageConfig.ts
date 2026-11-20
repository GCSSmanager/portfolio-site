import { crmPages } from '@/crm/meta'
import type { CrmPageMeta } from '@/types/crm'

export type CrmPageId = 'custom' | 'free' | 'integrations' | 'about' | 'bitrix'

export type CrmSectionId =
  | 'hero'
  | 'about-us'
  | 'fears'
  | 'partners'
  | 'plans'
  | 'kit'
  | 'integrations'
  | 'about'
  | 'process'
  | 'reviews'
  | 'cases'
  | 'examples'
  | 'pricing'
  | 'guide'
  | 'quiz'
  | 'contacts'

export type CrmPageConfig = CrmPageMeta & {
  sections: CrmSectionId[]
  heroLead?: string
  heroTitle?: string
  heroYellow?: string
  heroMark?: string
  heroCta?: string
  showStockTitle?: boolean
  demoHref?: string
  showPortfolio?: boolean
  showPricing?: boolean
  faqVariant?: 'free'
  showContactsDeal?: boolean
}

export const crmPageConfig: Record<CrmPageId, CrmPageConfig> = {
  custom: {
    ...crmPages.custom,
    sections: ['hero', 'about-us', 'fears', 'plans', 'process', 'reviews', 'cases', 'examples', 'guide', 'quiz', 'partners', 'contacts'],
    heroTitle: 'Программа учёта клиентов и заявок',
    heroMark: 'без ежемесячной оплаты',
    heroCta: 'Оценить задачу',
    showPricing: true,
    showContactsDeal: true,
  },
  free: {
    ...crmPages.free,
    sections: ['hero', 'about-us', 'fears', 'kit', 'reviews', 'cases', 'guide', 'partners', 'contacts'],
    demoHref: '/crm/demo/free/',
    faqVariant: 'free',
    showContactsDeal: true,
  },
  integrations: {
    ...crmPages.integrations,
    sections: ['hero', 'about-us', 'fears', 'integrations', 'process', 'reviews', 'cases', 'guide', 'quiz', 'partners', 'contacts'],
    heroTitle: 'Интеграции под Ваш процесс',
    heroMark: 'без ежемесячной оплаты',
    heroCta: 'Оценить задачу',
    showContactsDeal: true,
  },
  about: {
    ...crmPages.about,
    sections: ['about', 'partners', 'contacts'],
    showContactsDeal: false,
  },
  bitrix: {
    ...crmPages.bitrix,
    sections: ['hero', 'about-us', 'pricing', 'process', 'reviews', 'cases', 'quiz', 'partners', 'contacts'],
    heroLead: 'от\u00a03000\u00a0рублей',
    heroTitle: 'Настройка Битрикс24 и amoCRM для вашего бизнеса под ключ',
    heroYellow: 'под ключ',
    showStockTitle: false,
    heroCta: 'Оценить задачу',
    showContactsDeal: true,
  },
}
