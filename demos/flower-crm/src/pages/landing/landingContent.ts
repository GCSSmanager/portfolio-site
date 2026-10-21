export type LandingSlide = {
  id: string
  kicker: string
  title: string
  hook: string
  imageSrc: string
  imageFallback: string
  badge: { value: string; label: string }
}

export const LANDING_HERO = {
  eyebrow: 'Учётная система для цветочного магазина',
  line1: 'Меньше списаний —',
  line2: 'больше прибыли',
  sub: 'FlowerFlow ведёт склад, продажи и деньги магазина за вас. Продали букет — остаток и маржа пересчитались сами. К вечеру касса сходится без таблиц.',
  ctaPrimary: 'Создать магазин',
  ctaSecondary: 'Посмотреть, как работает',
  trust: '14 дней бесплатно · Без карты · Настройка за 10 минут',
  imageSrc: '/landing/00-hero.webp',
  imageFallback: 'https://picsum.photos/id/292/1600/1000',
  imageAlt: 'Интерфейс FlowerFlow',
  chips: [
    { value: '−30%', label: 'списаний' },
    { value: '0', label: 'таблиц Excel' },
    { value: '10 мин', label: 'на запуск' },
  ],
} as const

export const LANDING_MARQUEE = [
  'остатки',
  'маржа по букету',
  'продажи',
  'поставки',
  'себестоимость',
  'списания',
  'флористы',
  'инвентаризация',
] as const

export type ProblemIcon = 'waste' | 'stock' | 'clock' | 'margin' | 'lock' | 'chat'

export const LANDING_PROBLEMS = {
  title: 'Знакомо?',
  sub: 'Большинство цветочных теряют деньги не на продажах, а на учёте.',
  items: [
    { icon: 'waste' as ProblemIcon, text: 'Списываете цветы пачками, а почему — непонятно' },
    { icon: 'stock' as ProblemIcon, text: 'Остатки в таблице не сходятся с холодильником' },
    { icon: 'clock' as ProblemIcon, text: 'Каждый вечер вручную сводите кассу' },
    { icon: 'margin' as ProblemIcon, text: 'Маржу считаете «на глаз»' },
    { icon: 'lock' as ProblemIcon, text: 'Флористы видят закупочные цены' },
    { icon: 'chat' as ProblemIcon, text: 'Поставки и брак теряются в переписке' },
  ],
} as const

export const LANDING_STEPS = {
  title: 'Запуск — три шага',
  sub: 'Без внедрения, без обучения на неделю. Начинаете работать сегодня.',
  items: [
    {
      num: '01',
      title: 'Заведите склад',
      text: 'Загрузите цветы и остатки. Импорт из таблицы — за пару минут.',
    },
    {
      num: '02',
      title: 'Продавайте как обычно',
      text: 'Букет, розница, заказ. Каждая продажа сама списывает склад.',
    },
    {
      num: '03',
      title: 'Смотрите на прибыль',
      text: 'Маржа, расходы и тренды по видам считаются в реальном времени.',
    },
  ],
} as const

export const LANDING_SLIDES: LandingSlide[] = [
  {
    id: 'home',
    kicker: 'Главная',
    title: 'Утро — один список дел',
    hook: 'Вместо чатов и блокнота — задачи смены на одном экране.',
    imageSrc: '/landing/01-home.webp',
    imageFallback: 'https://picsum.photos/seed/ff-home/1200/800',
    badge: { value: 'Смена', label: 'начата за 1 касание' },
  },
  {
    id: 'warehouse',
    kicker: 'Склад',
    title: 'Остаток у каждого цветка',
    hook: 'Цена, фото, партии и сроки — там же, где работает смена.',
    imageSrc: '/landing/02-warehouse.png',
    imageFallback: 'https://picsum.photos/seed/ff-warehouse/1200/800',
    badge: { value: '124 шт', label: 'в наличии сейчас' },
  },
  {
    id: 'sales',
    kicker: 'Продажи',
    title: 'Продали — склад обновился',
    hook: 'Букет, розница, списание — в одной цепочке, без двойного ввода.',
    imageSrc: '/landing/03-sales.png',
    imageFallback: 'https://picsum.photos/seed/ff-sales/1200/800',
    badge: { value: '−5 роз', label: 'списано автоматически' },
  },
  {
    id: 'suppliers',
    kicker: 'Поставки',
    title: 'Заказ → приёмка → остаток',
    hook: 'Брак и недостача фиксируются в системе, а не в переписке.',
    imageSrc: '/landing/04-suppliers.png',
    imageFallback: 'https://picsum.photos/seed/ff-suppliers/1200/800',
    badge: { value: '3 / 3', label: 'поставки приняты' },
  },
  {
    id: 'economy',
    kicker: 'Деньги',
    title: 'Видно, куда уходит маржа',
    hook: 'Выручка, себестоимость и расходы — на одной шкале.',
    imageSrc: '/landing/05-economy.png',
    imageFallback: 'https://picsum.photos/seed/ff-economy/1200/800',
    badge: { value: '62%', label: 'маржа за день' },
  },
  {
    id: 'team',
    kicker: 'Команда',
    title: 'Роли без хаоса',
    hook: 'Флорист работает с телефона. Закупочные цены — только у владельца.',
    imageSrc: '/landing/06-team.png',
    imageFallback: 'https://picsum.photos/seed/ff-team/1200/800',
    badge: { value: 'Доступ', label: 'настроен по ролям' },
  },
]

export const LANDING_COMPARE = {
  title: 'Два способа вести магазин',
  sub: 'Один забирает вечера и деньги. Второй — возвращает их.',
  before: {
    label: 'Excel и блокнот',
    items: [
      'Таблицу никто не ведёт до конца',
      'Остатки — «примерно»',
      'Маржа неизвестна до конца месяца',
      'Вечерние сверки кассы вручную',
      'Списания без причины',
      'Закупочные видит вся смена',
    ],
  },
  after: {
    label: 'FlowerFlow',
    items: [
      'Один склад — одна правда',
      'Остаток обновляется при каждой продаже',
      'Маржа по каждому букету',
      'Касса сходится сама',
      'Видно, откуда именно потери',
      'Закупочные — только у владельца',
    ],
  },
} as const

export type MetricItem = {
  id: string
  prefix: string
  to: number
  suffix: string
  bar: number
  label: string
}

export const LANDING_METRICS = {
  title: 'Что меняется в цифрах',
  sub: 'Так выглядит магазин уже в первый месяц на FlowerFlow.',
  items: [
    { id: 'waste', prefix: '−', to: 30, suffix: '%', bar: 30, label: 'списаний за счёт контроля сроков и остатков' },
    { id: 'margin', prefix: '+', to: 15, suffix: '%', bar: 15, label: 'к марже — видно, на чём вы зарабатываете' },
    { id: 'time', prefix: '−', to: 75, suffix: '%', bar: 75, label: 'времени на сверки, отчёты и учёт' },
    { id: 'system', prefix: '', to: 100, suffix: '%', bar: 100, label: 'продаж и движений в одной системе' },
  ] as MetricItem[],
} as const

export const LANDING_TESTIMONIALS = {
  title: 'Так говорят владельцы магазинов',
  sub: 'Реальные истории тех, кто перестал вести учёт в тетради.',
  items: [
    {
      quote:
        'Раньше я закрывала магазин в 23:00 со сверками и калькулятором. Теперь склад и касса сходятся сами — ухожу вовремя и точно знаю маржу каждого букета.',
      author: 'Анна',
      role: 'владелица магазина, Казань',
      avatar: '/landing/people/anna.webp',
      avatarFallback: 'https://i.pravatar.cc/160?img=47',
    },
    {
      quote:
        'Списания упали почти на треть. Система показывает сроки, и я заказываю ровно столько, сколько успеваю продать. Цветы больше не уходят в мусор пачками.',
      author: 'Марина',
      role: 'флорист-предприниматель, Самара',
      avatar: '/landing/people/marina.webp',
      avatarFallback: 'https://i.pravatar.cc/160?img=32',
    },
    {
      quote:
        'У меня три точки. Теперь вижу маржу по каждой в реальном времени и спокоен, что флористы не видят закупочные цены. Контроль без слежки.',
      author: 'Игорь',
      role: 'сеть из 3 магазинов, Уфа',
      avatar: '/landing/people/igor.webp',
      avatarFallback: 'https://i.pravatar.cc/160?img=12',
    },
  ],
} as const

export const LANDING_FAQ = {
  title: 'Частые вопросы',
  items: [
    {
      q: 'Нужно ли переносить данные вручную?',
      a: 'Нет. Остатки и каталог импортируются из таблицы за пару минут — дальше система ведёт всё сама.',
    },
    {
      q: 'Это не сложно для флористов?',
      a: 'Интерфейс рассчитан на работу прямо у рабочего стола со смартфона. Продажа и списание — в пару касаний.',
    },
    {
      q: 'А если у меня несколько точек?',
      a: 'Каждая точка ведёт свой склад и кассу, а владелец видит общую картину и маржу по всем магазинам.',
    },
    {
      q: 'Кто видит закупочные цены?',
      a: 'Только владелец. Флористы работают с остатками и продажами, не видя себестоимости и наценки.',
    },
    {
      q: 'Сколько это стоит?',
      a: '14 дней полного доступа бесплатно и без карты. Дальше — простой тариф, который окупается экономией на списаниях.',
    },
  ],
} as const

export const LANDING_CTA = {
  title: 'Запустите магазин сегодня',
  sub: '14 дней полного доступа. Без карты. Проверьте на своих розах.',
  button: 'Создать магазин',
  note: 'Настройка занимает около 10 минут',
} as const
