/** Входные цены в блоке «Решения». */
export const CRM_CATALOG_FROM_RUB = 39_000
export const CRM_INDIVIDUAL_FROM_RUB = 47_000

export type CrmLaunchExample = {
  id: string
  image: string
  priceRub: number
  term: string
  includes: string[]
}

export function formatExamplePriceRub(value: number) {
  return `${String(value).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}\u00a0₽`
}

/** Примеры из смет — мало пунктов в начале, больше в конце. */
export const CRM_LAUNCH_EXAMPLES: CrmLaunchExample[] = [
  {
    id: 'start',
    image: '/assets/crm-estimate-start.webp',
    priceRub: 39_000,
    term: '12 дней',
    includes: ['Клиенты и одна воронка', 'Запись по слотам', 'Роли сотрудников'],
  },
  {
    id: 'leads-one',
    image: '/assets/crm-estimate-leads-one.webp',
    priceRub: 47_000,
    term: '15 дней',
    includes: [
      'Сделки и этапы воронки',
      'Заявки с сайта или Telegram',
      'Ответственный по сделке',
      'Отчёт руководителю',
    ],
  },
  {
    id: 'leads-two',
    image: '/assets/crm-estimate-leads-two.webp',
    priceRub: 58_000,
    term: '16 дней',
    includes: [
      'Два канала заявок',
      'Распределение новых сделок',
      'Задачи и напоминания',
      'Отчёт по источникам',
      'Календарь менеджеров',
    ],
  },
  {
    id: 'automation',
    image: '/assets/crm-estimate-automation.webp',
    priceRub: 72_000,
    term: '20 дней',
    includes: [
      'Правила перехода между этапами',
      'История изменений по сделке',
      'Автозадачи при смене этапа',
      'Дашборд руководителя',
      'Онлайн-чат с сайта в карточку клиента',
    ],
  },
  {
    id: 'commerce-analytics',
    image: '/assets/crm-estimate-commerce.webp',
    priceRub: 94_000,
    term: '22 дня',
    includes: [
      'Позиции и сумма в сделке',
      'Остатки и резерв под заказ',
      'Статус оплаты в карточке',
      'Заявки с сайта и Flexbe',
      'Roistat и Яндекс.Метрика',
      'Заявки из Яндекс.Директа',
    ],
  },
  {
    id: 'scale',
    image: '/assets/crm-estimate-scale.webp',
    priceRub: 118_000,
    term: '28 дней',
    includes: [
      'Несколько воронок',
      'Единая база клиентов',
      'Отчёты по отделам и филиалам',
      'Права доступа по структуре компании',
      'Telegram-бот для клиентов и сотрудников',
      'Синхронизация с Google Календарём',
      'Выгрузка данных в 1С',
    ],
  },
]
