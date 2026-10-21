/** Разделы, видимые в шапке у новых пользователей (остальное — только через бургер). */
export const NAV_HEADER_DEFAULT_VISIBLE = new Set(['home', 'warehouse', 'statistics'])

function defaultNavVisible(id: string): boolean {
  return NAV_HEADER_DEFAULT_VISIBLE.has(id)
}

/** Запасное меню, если API ещё не отдал nav_menu (старая сессия / сбой). */
export const DEFAULT_NAV_MENU_ITEMS: NavMenuItem[] = [
  { id: 'home', label: 'Главная', path: '/', owner_only: false, visible: defaultNavVisible('home') },
  {
    id: 'warehouse',
    label: 'Склад',
    path: '/warehouse',
    owner_only: false,
    visible: defaultNavVisible('warehouse'),
    end: true,
  },
  {
    id: 'statistics',
    label: 'Статистика',
    path: '/statistics',
    owner_only: true,
    visible: defaultNavVisible('statistics'),
  },
  { id: 'catalog', label: 'Каталог', path: '/catalog', owner_only: false, visible: defaultNavVisible('catalog') },
  { id: 'prices', label: 'Цены', path: '/prices', owner_only: true, visible: defaultNavVisible('prices') },
  {
    id: 'suppliers',
    label: 'Поставщики',
    path: '/suppliers',
    owner_only: true,
    visible: defaultNavVisible('suppliers'),
  },
  {
    id: 'delivery-services',
    label: 'Сервисы доставки',
    path: '/delivery-services',
    owner_only: true,
    visible: defaultNavVisible('delivery-services'),
  },
  { id: 'staff', label: 'Флористы', path: '/staff', owner_only: true, visible: defaultNavVisible('staff') },
  { id: 'tasks', label: 'Задачи', path: '/tasks', owner_only: true, visible: defaultNavVisible('tasks') },
  {
    id: 'inventory',
    label: 'Инвентаризация',
    path: '/warehouse/inventory',
    owner_only: true,
    visible: defaultNavVisible('inventory'),
  },
  {
    id: 'settings',
    label: 'Настройки',
    path: '/settings',
    owner_only: true,
    visible: defaultNavVisible('settings'),
  },
  { id: 'sales', label: 'Продажи', path: '/sales', owner_only: false, visible: defaultNavVisible('sales') },
  { id: 'expenses', label: 'Расходы', path: '/expenses', owner_only: false, visible: defaultNavVisible('expenses') },
]

export type NavMenuItem = {
  id: string
  label: string
  path: string
  owner_only: boolean
  visible: boolean
  end?: boolean
}

export function parseNavMenuItems(raw: unknown): NavMenuItem[] {
  if (!Array.isArray(raw)) return []
  const out: NavMenuItem[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const o = row as Record<string, unknown>
    const id = typeof o.id === 'string' ? o.id : ''
    const label = typeof o.label === 'string' ? o.label : ''
    const path = typeof o.path === 'string' ? o.path : ''
    if (!id || !label || !path) continue
    out.push({
      id,
      label,
      path,
      owner_only: o.owner_only === true,
      visible: o.visible !== false,
      end: o.end === true ? true : undefined,
    })
  }
  return out
}

export function navMenuPatchPayload(items: NavMenuItem[]): { items: { id: string; visible: boolean }[] } {
  return {
    items: items.map((x) => ({ id: x.id, visible: x.visible })),
  }
}

const NAV_BY_ID = new Map(DEFAULT_NAV_MENU_ITEMS.map((item) => [item.id, item]))
const VALID_NAV_IDS = new Set(DEFAULT_NAV_MENU_ITEMS.map((item) => item.id))

export type NavMenuPref = { id: string; visible: boolean }

function defaultNavMenuPrefs(): NavMenuPref[] {
  return DEFAULT_NAV_MENU_ITEMS.map((item) => ({
    id: item.id,
    visible: defaultNavVisible(item.id),
  }))
}

function normalizeSavedNavPrefs(raw: unknown): NavMenuPref[] | null {
  if (!Array.isArray(raw)) return null
  const out: NavMenuPref[] = []
  const seen = new Set<string>()
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const o = entry as Record<string, unknown>
    const navId = typeof o.id === 'string' ? o.id.trim() : ''
    if (!navId || !VALID_NAV_IDS.has(navId) || seen.has(navId)) continue
    seen.add(navId)
    const visible = o.visible
    out.push({
      id: navId,
      visible: visible !== undefined ? Boolean(visible) : defaultNavVisible(navId),
    })
  }
  return out.length > 0 ? out : null
}

/** Порядок разделов берётся из сохранённых prefs (как на Django). */
export function parseNavMenuPrefs(raw: unknown): NavMenuPref[] {
  const saved = normalizeSavedNavPrefs(raw)
  if (!saved) return defaultNavMenuPrefs()
  const byId = new Map(saved.map((p) => [p.id, p]))
  const orderedIds = saved.map((p) => p.id)
  for (const item of DEFAULT_NAV_MENU_ITEMS) {
    if (!byId.has(item.id)) {
      orderedIds.push(item.id)
      byId.set(item.id, { id: item.id, visible: defaultNavVisible(item.id) })
    }
  }
  return orderedIds.map((id) => byId.get(id)!)
}

export function resolveNavMenuFromPrefs(prefs: NavMenuPref[], isOwner: boolean): NavMenuItem[] {
  const result: NavMenuItem[] = []
  for (const pref of prefs) {
    const meta = NAV_BY_ID.get(pref.id)
    if (!meta) continue
    if (meta.owner_only && !isOwner) continue
    result.push({
      id: meta.id,
      label: meta.label,
      path: meta.path,
      owner_only: meta.owner_only,
      visible: pref.visible,
      end: meta.end,
    })
  }
  return result
}

export function validateNavMenuPatch(
  body: unknown,
): { ok: true; items: NavMenuPref[] } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Ожидается объект JSON.' }
  }
  const rawItems = (body as { items?: unknown }).items
  const saved = normalizeSavedNavPrefs(rawItems)
  if (!saved) {
    return { ok: false, error: 'Некорректный список разделов.' }
  }
  if (saved.length !== DEFAULT_NAV_MENU_ITEMS.length) {
    return { ok: false, error: 'Нужны все разделы меню.' }
  }
  const ids = new Set(saved.map((x) => x.id))
  if (ids.size !== VALID_NAV_IDS.size) {
    return { ok: false, error: 'Неизвестный или пропущенный раздел меню.' }
  }
  for (const id of VALID_NAV_IDS) {
    if (!ids.has(id)) {
      return { ok: false, error: 'Неизвестный или пропущенный раздел меню.' }
    }
  }
  return { ok: true, items: saved }
}
