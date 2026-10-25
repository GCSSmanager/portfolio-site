import type { DemoShellConfig, DemoTipContent } from './types';

function textTip(title: string, body: string, ctaLabel?: string): DemoTipContent {
  return { title, body, ctaLabel };
}

/** Как во flower: welcome можно включить позже; подсказки по страницам выключены. */
export const pestDemoShell: DemoShellConfig = {
  id: 'pest',
  muteKey: 'pest-demo.tipsMuted',
  seenPrefix: 'pest-demo.tipSeen.',
  tipsDisabled: true,
  pageTipsEnabled: false,
  welcome: textTip(
    'Демо CRM — дезинсекция',
    'Интерактивная версия: заказы, распределение, аналитика. Данные только в браузере.\n\nЛоготип ГКСС справа снизу — сброс демо и выход на сайт.',
    'Начать',
  ),
  pages: {},
};
