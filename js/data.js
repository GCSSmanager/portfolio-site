const projects = [
    {
        id: 1,
        title: 'Медицинский центр "Детство"',
        category: 'website',
        description:'Проект сайта для медицинского центра «Детство» — это создание в цифровом пространстве атмосферы заботы и доверия. Задача была не просто перечислить услуги, а передать ощущение спокойствия и надёжности, которое испытывают родители, приводящие сюда своих детей. Основной фокус был сделан на понятную структуру, тёплый и ясный дизайн, который не отвлекает от главного.',
        images: {
            column1: [
                'data/detstvo/1.webp',
                'data/detstvo/2.webp',
                'data/detstvo/3.webp'
            ],
            column2: [
                'data/detstvo/4.webp',
                'data/detstvo/5.webp',
                'data/detstvo/6.webp'
            ]
        },
        thumbnail: 'data/detstvo/thumbnail.webp'
    },
    {
        id: 2,
        title: 'Сайт театра "Артемида"',
        category: 'website',
        description: 'Атмосферный веб-сайт для настольной игры «Заговоры Закулисья». Сайт вымышленного театра "Артемида" — это не инструмент продаж, а декоративный элемент вселенной, созданный для погружения игроков в мир загадок и театральных легенд через минималистичный дизайн и нарратив.',
        images: {
            column1: [
                'data/artemida/4.webp',
                'data/artemida/2.webp'
            ],
            column2: [
                'data/artemida/3.webp',
                'data/artemida/1.webp'
            ]
        },
        thumbnail: 'data/artemida/thumbnail.webp'
    },
    {
        id: 3,
        title: 'Генератор карточек для "Фоллаут"',
        category: 'website',
        description: 'Генератор игрового контента для настольной RPG по Fallout. Веб-приложение даёт возможность создавать неограниченное количество тематических карт (персонажи, луты, локации), компоновать их в сеты и экспортировать в идеально сверстанный PDF-документ, готовый к отправке в типографию или домашний принтер. Инструмент экономит часы подготовки и позволяет полностью кастомизировать игровые сессии.',
        images: {
            column1: [
                'data/fallout/1.webp',
                'data/fallout/2.webp'
            ],
            column2: [
                'data/fallout/3.webp',
                'data/fallout/4.webp'
            ]
        },
        thumbnail: 'data/fallout/thumbnail.webp'
    },
    {
        id: 4,
        title: 'Сайт-калькулятор для сервиса печати на шарах',
        category: 'website',
        description: 'Инструмент для быстрого и точного расчёта стоимости печати на воздушных шарах. Позволяет клиентам самостоятельно подбирать опции, сравнивать предложения разных производителей и сразу видеть финальную стоимость заказа с разбивкой. Пример создания практичного бизнес-сервиса, который экономит время всем участникам сделки.',
        images: {
            column1: [
                'data/balloons/1.webp',
                'data/balloons/2.webp'
            ],
            column2: [
                'data/balloons/3.webp',
                'data/balloons/4.webp'
            ]
        },
        thumbnail: 'data/balloons/thumbnail.webp'
    },
    {
        id: 5,
        title: 'Визитная карточка для производителя силиконовых изделий',
        category: 'website',
        description: 'Веб-сайт даёт возможность клиентам быстро и удобно ознакомиться с продукцией, посмотреть примеры работ и связаться с производителем для заказа. Основной акцент был сделан на удобство использования и наглядность информации.',
        images: {
            column1: [
                'data/siltube/1.webp',
                'data/siltube/2.webp',
                'data/siltube/5.webp'
            ],
            column2: [
                'data/siltube/3.webp',
                'data/siltube/4.webp'
            ]
        },
        thumbnail: 'data/siltube/thumbnail.webp'
    },
    {
        id: 6,
        title: 'Дом без вредителей',
        category: 'website',
        description: 'Онлайн-визитка службы спасения от насекомых и грызунов. Лаконичный сайт, который дает четкий ответ на проблему: виды услуг, цены, контакты. Ничего лишнего — только решение.',
        images: {
            column1: [
                'data/domno/1.webp',
                'data/domno/2.webp',
                'data/domno/5.webp'
            ],
            column2: [
                'data/domno/3.webp',
                'data/domno/4.webp'
            ]
        },
        thumbnail: 'data/domno/thumbnail.webp'
    },
    {
        id: 7,
        title: 'Сайт-визитка для команды DetectiveBirdGames',
        category: 'website',
        description: 'Этот сайт — цифровой стол, за которым создатели настольной игры «Заговоры Закулисья» встречаются со своей аудиторией. Здесь нет лишних посредников, громких рекламных слоганов или сложных навигаций. Только честное и подробное объяснение сути игры, её атмосферы и состава, за которым следует простой и понятный призыв: «Вот как можно стать обладателем этой коробки с тайной».',
        images: {
            column1: [
                'data/dbgsite/1.webp',
                'data/dbgsite/2.webp',
                'data/dbgsite/3.webp'
            ],
            column2: [
                'data/dbgsite/4.webp',
                'data/dbgsite/5.webp',
                'data/dbgsite/6.webp'
            ]
        },
        thumbnail: 'data/dbgsite/thumbnail.webp'
    },
    {
        id: 8,
        title: 'Интеграция в Excel WB статистики заказов, остатков и расходов',
        category: 'excel',
        description: 'Интеграция в Excel WB статистики заказов, остатков и расходов. Позволяет автоматически загружать данные из WB в Excel и анализировать их. Реализована интеграция с помощью API WB.',
        images: {
            column1: [
                'data/wbstat/1.webp',
                'data/wbstat/3.webp'
            ],
            column2: [
                'data/wbstat/2.webp',
                'data/wbstat/4.webp',
                'data/wbstat/5.webp'
            ]
        },
        thumbnail: 'data/wbstat/thumbnail.webp'
    },
    {
        id: 9,
        title: 'Telegram-бот для группы компаний MATI',
        category: 'tg_bot',
        description: 'Telegram-бот для MATI group, работающий как автономный представитель бренда. Он знакомит с многолетней историей компании, наглядно демонстрирует её ключевое преимущество — сервис «под ключ» — и предоставляет портфолио проектов. Завершает общение прямым призывом к действию, предлагая моментально позвонить или написать в студию, превращая интерес клиента в контакт.',
        images: {
            column1: [
                'data/mati/1.webp',
                'data/mati/2.webp'
            ],
            column2: [
                'data/mati/3.webp',
                'data/mati/4.webp',
            ]
        },
        thumbnail: 'data/mati/thumbnail.webp'
    },
    {
        id: 10,
        title: 'Telegram-бот для поиска водителей и заказов',
        category: 'tg_bot',
        description: 'Telegram-бот для организации рынка труда в сфере перевозок. Выступает цифровым диспетчером, где перевозчики регистрируют вакансии по адресам складов, а водители находят работу в нужных районах по подписке. Особенность — встроенный модуль репутации: участники могут подавать и проверять жалобы по конкретным случаям, что создает прозрачную среду и помогает фильтровать недобросовестных контрагентов.',
        images: {
            column1: [
                'data/truckbot/1.webp',
                'data/truckbot/2.webp',
                'data/truckbot/4.webp'
            ],
            column2: [
                'data/truckbot/3.webp',
                'data/truckbot/5.webp'
            ]
        },
        thumbnail: 'data/truckbot/thumbnail.webp'
    },
    {
        id: 11,
        title: 'Бот-ведущий настольной детективной игры "Заговоры Закулисья"',
        category: 'tg_bot',
        description: 'Telegram-бот выполняет роль ведущего: задаёт команде ключевые вопросы по сюжету, предоставляет подсказки по запросу и проверяет правильность ответов. Завершает игру, автоматически рассчитывая и выдавая рейтинг каждого игрока на основе времени прохождения, количества использованных подсказок и допущенных ошибок.',
        images: {
            column1: [
                'data/dbgbot/1.webp',
                'data/dbgbot/2.webp',
                'data/dbgbot/3.webp'
            ],
            column2: [
                'data/dbgbot/4.webp',
                'data/dbgbot/5.webp',
                'data/dbgbot/6.webp'
            ]
        },
        thumbnail: 'data/dbgbot/thumbnail.webp'
    },
    {
        id: 12,
        title: 'Telegram-бот для компании ESB',
        category: 'tg_bot',
        description: 'Telegram-бот как анонимная образовательная биржа. Он создаёт связь между заказчиком и исполнителем через приватный чат, где участники общаются, оставаясь полностью невидимыми друг для друга. Это позволяет безопасно обсуждать условия и детали, не раскрывая личность до момента принятия решения.',
        images: {
            column1: [
                'data/esbbot/1.webp',
                'data/esbbot/2.webp',
                'data/esbbot/3.webp',
                'data/esbbot/4.webp'
            ],
            column2: [
                'data/esbbot/5.webp',
                'data/esbbot/6.webp',
                'data/esbbot/7.webp',
                'data/esbbot/8.webp'
            ]
        },
        thumbnail: 'data/esbbot/thumbnail.webp'
    }
]

const categoryLabels = {
    'tg_bot': 'Телеграм боты',
    'website': 'Вебсайты',
    'excel': 'Excel'
};

