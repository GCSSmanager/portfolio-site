import type { DemoShellConfig, DemoTipContent } from './types'

function textTip(title: string, body: string, ctaLabel?: string): DemoTipContent {
  return { title, body, ctaLabel }
}

/** Оболочка демо цветочного CRM: пока только welcome, без подсказок по разделам. */
export const flowerDemoShell: DemoShellConfig = {
  id: 'flower',
  muteKey: 'flower-demo.tipsMuted',
  seenPrefix: 'flower-demo.tipSeen.',
  pageTipsEnabled: false,
  welcome: textTip(
    'Демо CRM для цветочного',
    'Это интерактивная версия системы учёта для магазина: склад, продажи, поставки и задачи. Все изменения сохраняются только в вашем браузере — можно спокойно нажимать и пробовать.\n\nЛоготип ГКСС справа снизу открывает меню: сброс демо и выход на сайт.',
    'Начать',
  ),
  pages: {},
}
