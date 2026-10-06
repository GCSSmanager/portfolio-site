import type { DemoShellConfig, DemoTipContent, DemoTipSlide } from "./types";

function slides(...items: DemoTipSlide[]): DemoTipSlide[] {
  return items;
}

function tip(title: string, slideItems: DemoTipSlide[]): DemoTipContent {
  return { title, slides: slideItems };
}

function textTip(title: string, body: string, ctaLabel?: string): DemoTipContent {
  return { title, body, ctaLabel };
}

/** Контент оболочки клиники — слайды = выгода для бизнеса + место под gif. */
export const clinicDemoShell: DemoShellConfig = {
  id: "clinic",
  muteKey: "clinic-demo.tipsMuted",
  seenPrefix: "clinic-demo.tipSeen.",
  welcome: textTip(
    "Интерактивное демо",
    "Здесь можно свободно менять записи, клиентов, справочники и настройки — всё сохраняется только у вас в браузере.\n\nСправа снизу логотип ГКСС открывает меню: подсказка текущей страницы с короткими роликами, включение и выключение подсказок, сброс демо и выход.",
  ),
  pages: {
    "/": tip("Расписание", slides(
      {
        headline: "Весь день клиники на одном экране — администратор сразу видит, кто свободен, и закрывает больше записей за смену",
        media: {
          kind: "gif",
          src: "tips/schedule-overview.gif",
          alt: "Обзор расписания клиники",
        },
      },
      {
        headline: "Автоподбор свободного окна за секунды — клиент записывается с первого звонка, а не «уходит подумать»",
        media: {
          kind: "gif",
          src: "tips/schedule-autoslot.gif",
          alt: "Запись и автоподбор слота",
        },
      },
      {
        headline: "Перенос записи с проверкой занятости — без двойных записей и скандалов у кабинета",
        media: {
          kind: "gif",
          src: "tips/schedule-drag.gif",
          alt: "Перенос записи и занятость",
        },
      },
      {
        headline: "Печать расписания смены за клик — ресепшен и кабинеты работают без утреннего Excel",
        media: {
          kind: "gif",
          src: "tips/schedule-print.gif",
          alt: "Печать расписания",
        },
      },
    )),
    "/client-schedule": tip("Расписание клиента", slides(
      {
        headline: "Создание и перенос занятий в карточке клиента — курс собирается за минуты, без звонков «куда поставить»",
        media: {
          kind: "gif",
          src: "tips/client-schedule-edit.gif",
          alt: "Создание и перенос в расписании клиента",
        },
      },
      {
        headline: "Копирование слотов на неделю вперёд — администратор не набивает одно и то же вручную каждый день",
        media: {
          kind: "gif",
          src: "tips/client-schedule-copypaste.gif",
          alt: "Копирование слотов расписания клиента",
        },
      },
    )),
    "/analytics": tip("Аналитика", slides(
      {
        headline: "Загрузка специалистов на цифрах — видно, кого дозагрузить и где не нужен лишний найм",
        media: {
          kind: "gif",
          src: "tips/analytics-employees.gif",
          alt: "Аналитика специалистов",
        },
      },
      {
        headline: "Клиенты по визитам и категориям — спрос и состав базы без ручных сводок",
        media: {
          kind: "gif",
          src: "tips/analytics-clients.gif",
          alt: "Аналитика клиентов",
        },
      },
    )),
    "/diagnostics": tip("Диагностика", slides(
      {
        headline: "Периоды, окна и запись на комиссию в одном месте — обычное расписание специалистов не ломается",
        media: {
          kind: "gif",
          src: "tips/diagnostics.gif",
          alt: "Диагностика: периоды и интервалы",
        },
      },
    )),
    "/document-route": tip("Маршрутизация", slides(
      {
        headline: "Чек-лист документов по курсу — видно, кто на курсе, кто заканчивает и кто уже закрыт",
        media: {
          kind: "gif",
          src: "tips/document-route.gif",
          alt: "Маршрутизация документов",
        },
      },
    )),
    "/documents": tip("Документы", slides(
      {
        headline: "Пакет Word заполняется из карточки клиента за минуты — без ручного копирования ФИО и дат",
        media: {
          kind: "gif",
          src: "tips/documents.gif",
          alt: "Заполнение документов",
        },
      },
    )),
    "/directories": tip("Справочники", slides(
      {
        headline: "Карточка клиента под рукой — телефон, курс и история без блокнотов и переписки в чатах",
        media: {
          kind: "gif",
          src: "tips/directories-clients.gif",
          alt: "Справочник клиентов",
        },
      },
      {
        headline: "Специалисты с графиком и кабинетами — смена сразу видит, кого можно записать",
        media: {
          kind: "gif",
          src: "tips/directories-employees.gif",
          alt: "Справочник специалистов",
        },
      },
    )),
    "/users": tip("Пользователи", slides(
      {
        headline: "Свои роли со своими доступами — администратор, специалист и директор видят только своё",
        media: {
          kind: "gif",
          src: "tips/users.gif",
          alt: "Роли и доступы пользователей",
        },
      },
    )),
  },
};
