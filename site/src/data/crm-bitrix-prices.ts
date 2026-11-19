import { formatExamplePriceRub } from '@/data/crm-system-examples'

export type BitrixPriceItem = {
  id: string
  name: string
  detail?: string
  rub: number
  note?: string
}

/** Исходные суммы ×3. В прайсе у каждой позиции «от». */
export const BITRIX_PRICE_ITEMS: BitrixPriceItem[] = [
  {
    id: 'base',
    name: 'Базовая настройка CRM',
    detail: 'Воронка, стадии, карточки сделок',
    rub: 9_000,
  },
  { id: 'funnel', name: 'Дополнительная воронка', rub: 3_000 },
  { id: 'roles', name: 'Роли и права доступа', rub: 3_000 },
  {
    id: 'messengers',
    name: 'Мессенджеры и открытая линия',
    detail: 'Telegram, WhatsApp, Авито',
    rub: 4_500,
  },
  {
    id: 'phone',
    name: 'Телефония',
    detail: 'Распределение звонков по менеджерам',
    rub: 6_000,
  },
  {
    id: 'robots',
    name: 'Роботы и автоматизация',
    detail: 'Задачи, уведомления, обязательные поля, запрет переноса по этапам',
    rub: 6_000,
  },
  { id: 'site', name: 'Заявки с сайта и формы', rub: 4_500 },
  { id: 'import', name: 'Импорт базы клиентов', rub: 3_000 },
  { id: 'manual', name: 'Инструкция для менеджеров', rub: 4_500 },
  { id: 'reports', name: 'Отчёты и аналитика', rub: 4_500 },
  {
    id: 'integrations',
    name: 'Интеграции',
    detail: '1С, API, боты',
    rub: 15_000,
  },
]

export function bitrixPriceLabel(item: BitrixPriceItem) {
  return `от\u00a0${formatExamplePriceRub(item.rub)}`
}
