export type CrmPriceItem = {
  value: string
  from: number
  to: number
  name: string
  sumLabel: string
}

export type CrmPriceColumn = {
  title: string
  items: CrmPriceItem[]
}

export const CRM_PRICE_COLUMNS: CrmPriceColumn[] = [
  {
    title: 'Подключение',
    items: [
      { value: 'hosting', from: 2500, to: 8000, name: 'Развёртывание на хостинге', sumLabel: '2.500–8.000\u00a0₽' },
      { value: 'auth', from: 4000, to: 12000, name: 'Права сотрудников', sumLabel: '4.000–12.000\u00a0₽' },
      { value: 'excel-in', from: 3500, to: 15000, name: 'Перенос из Excel', sumLabel: '3.500–15.000\u00a0₽' },
      { value: 'training', from: 4000, to: 14000, name: 'Обучение сотрудников', sumLabel: '4.000–14.000\u00a0₽' },
    ],
  },
  {
    title: 'Клиенты и сделки',
    items: [
      { value: 'clients', from: 5000, to: 18000, name: 'Карточки клиентов', sumLabel: '5.000–18.000\u00a0₽' },
      { value: 'funnel', from: 6000, to: 20000, name: 'Воронка и статусы', sumLabel: '6.000–20.000\u00a0₽' },
      { value: 'booking', from: 6000, to: 20000, name: 'Календарь и запись', sumLabel: '6.000–20.000\u00a0₽' },
      { value: 'tasks', from: 4000, to: 12000, name: 'Задачи и напоминания', sumLabel: '4.000–12.000\u00a0₽' },
      { value: 'assign', from: 4500, to: 14000, name: 'Распределение заявок', sumLabel: '4.500–14.000\u00a0₽' },
    ],
  },
  {
    title: 'Заявки и реклама',
    items: [
      { value: 'direct', from: 7500, to: 25000, name: 'Яндекс Директ', sumLabel: '7.500–25.000\u00a0₽' },
      { value: 'site-leads', from: 5000, to: 15000, name: 'Заявки с сайта', sumLabel: '5.000–15.000\u00a0₽' },
      { value: 'telegram', from: 5000, to: 12000, name: 'Telegram-бот', sumLabel: '5.000–12.000\u00a0₽' },
      { value: 'telephony', from: 7500, to: 28000, name: 'Телефония', sumLabel: '7.500–28.000\u00a0₽' },
      { value: 'mailings', from: 5000, to: 18000, name: 'Рассылки', sumLabel: '5.000–18.000\u00a0₽' },
    ],
  },
  {
    title: 'Учёт и отчёты',
    items: [
      { value: 'stock', from: 6000, to: 22000, name: 'Склад и остатки', sumLabel: '6.000–22.000\u00a0₽' },
      { value: 'excel-out', from: 2500, to: 8000, name: 'Выгрузка в Excel', sumLabel: '2.500–8.000\u00a0₽' },
      { value: 'dashboard', from: 6000, to: 22000, name: 'Дашборд руководителя', sumLabel: '6.000–22.000\u00a0₽' },
      { value: 'metrika', from: 4000, to: 12000, name: 'Яндекс Метрика', sumLabel: '4.000–12.000\u00a0₽' },
      { value: 'roistat', from: 6000, to: 18000, name: 'Roistat', sumLabel: '6.000–18.000\u00a0₽' },
      { value: 'owner-report', from: 5000, to: 16000, name: 'Отчёт руководителю', sumLabel: '5.000–16.000\u00a0₽' },
    ],
  },
]

export const CRM_PRICE_ITEM_BY_VALUE = Object.fromEntries(
  CRM_PRICE_COLUMNS.flatMap((col) => col.items.map((item) => [item.value, item])),
) as Record<string, CrmPriceItem>
