import { crmPages } from '@/crm/meta'
import type { CrmPageMeta } from '@/types/crm'

export type CrmPageId = 'custom' | 'free' | 'integrations' | 'about'

export type CrmSectionId =
  | 'hero'
  | 'partners'
  | 'plans'
  | 'kit'
  | 'integrations'
  | 'about'
  | 'process'
  | 'reviews'
  | 'cases'
  | 'examples'
  | 'guide'
  | 'quiz'
  | 'contacts'

export type CrmPageConfig = CrmPageMeta & {
  sections: CrmSectionId[]
  heroTitle?: string
  heroMark?: string
  heroCta?: string
  heroMore?: string
  demoHref?: string
  showPricing?: boolean
  faqVariant?: 'free'
  showContactsDeal?: boolean
}

export const crmPageConfig: Record<CrmPageId, CrmPageConfig> = {
  custom: {
    ...crmPages.custom,
    sections: ['hero', 'plans', 'process', 'reviews', 'cases', 'examples', 'guide', 'quiz', 'partners', 'contacts'],
    heroTitle: 'Программа учёта клиентов и заявок',
    heroMark: 'без ежемесячной оплаты',
    heroCta: 'Оценить задачу',
    showPricing: true,
    showContactsDeal: true,
  },
  free: {
    ...crmPages.free,
    sections: ['hero', 'kit', 'reviews', 'cases', 'guide', 'partners', 'contacts'],
    heroMore: 'Автосервис, ресторан, ремонт, риелторы и другие. Ставим мы, файл скачивать не нужно.',
    demoHref: '/crm/demo/free/',
    faqVariant: 'free',
    showContactsDeal: true,
  },
  integrations: {
    ...crmPages.integrations,
    sections: ['hero', 'integrations', 'process', 'reviews', 'cases', 'guide', 'quiz', 'partners', 'contacts'],
    heroTitle: 'Интеграции под ваш процесс',
    heroMark: 'без ежемесячной оплаты',
    heroCta: 'Оценить задачу',
    showContactsDeal: true,
  },
  about: {
    ...crmPages.about,
    sections: ['about', 'partners', 'contacts'],
    showContactsDeal: false,
  },
}
