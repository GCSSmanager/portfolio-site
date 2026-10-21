/** Состояние для Link на /catalog: откуда пришли и подпись для стрелки «назад». */
export type CatalogNavState = { from: string; label: string }

function catalogBackLabel(pathname: string): string {
  if (pathname === '/') return 'На главную'
  if (pathname === '/warehouse') return 'На склад'
  if (pathname === '/warehouse/inventory') return 'К инвентаризации'
  if (pathname === '/statistics') return 'К статистике'
  if (pathname === '/prices') return 'К ценам'
  if (pathname === '/suppliers') return 'К поставщикам'
  if (pathname === '/delivery-services') return 'К сервисам доставки'
  if (pathname === '/expenses') return 'К расходам'
  if (pathname === '/sales') return 'К продажам'
  if (pathname.startsWith('/flowers/')) return 'К карточке'
  return 'Назад'
}

export function catalogNavState(pathname: string): CatalogNavState | undefined {
  if (pathname === '/catalog') return undefined
  return { from: pathname, label: catalogBackLabel(pathname) }
}

/** Состояние для ссылки с каталога на карточку: «назад» ведёт в каталог. */
export const flowerLinkStateFromCatalog: CatalogNavState = {
  from: '/catalog',
  label: 'К каталогу',
}

export function isSafeInternalReturnPath(path: string): boolean {
  return path.startsWith('/') && !path.startsWith('//') && !path.includes(':')
}

export function parseCatalogNavState(state: unknown): CatalogNavState | undefined {
  if (!state || typeof state !== 'object') return undefined
  const from = (state as { from?: unknown }).from
  const label = (state as { label?: unknown }).label
  if (typeof from !== 'string' || !isSafeInternalReturnPath(from)) return undefined
  return {
    from,
    label: typeof label === 'string' && label.trim() ? label.trim() : catalogBackLabel(from),
  }
}
