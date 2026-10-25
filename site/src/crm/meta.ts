import { crmRouteSeo } from '@/seo/routeMeta'
import type { CrmPageMeta } from '@/types/crm'

export const crmPages: Record<string, CrmPageMeta> = {
  custom: {
    ...crmRouteSeo.custom,
    solution: 'custom',
    dealAlways: true,
    assistChips: ['Сколько это стоит?', 'Сколько длится запуск?', 'Заказать CRM'],
    brandHref: '/crm/custom/',
  },
  free: {
    ...crmRouteSeo.free,
    solution: 'free',
    assistChips: ['Сколько это стоит?', 'Получить бесплатно', 'Почему нет ежемесячной оплаты?'],
    brandHref: '/crm/free/',
  },
  integrations: {
    ...crmRouteSeo.integrations,
    solution: 'integrations',
    dealAlways: true,
    assistChips: ['Сколько это стоит?', 'Заявки с сайта попадут сами?', 'Заказать CRM'],
    brandHref: '/crm/integrations/',
  },
  about: {
    ...crmRouteSeo.about,
    solution: 'about',
    assistChips: ['Чья будет программа?', 'Что будет после запуска?', 'Сколько длится запуск?'],
    brandHref: '/crm/about/',
  },
}
