import { resolveDemoPhotoUrl } from './demoArtCatalog'
import { moneyStr, parseMoney } from './money'
import type { DemoConsumable, DemoDb } from './types'

export function serializeConsumableRow(c: DemoConsumable, includeFinancials: boolean) {
  return {
    id: c.id,
    kind: 'consumable' as const,
    name: c.name,
    photo_url: resolveDemoPhotoUrl('consumable', c.id, c.photo_path),
    unit_kind: c.unit_kind,
    meters_balance: c.meters_balance,
    rolls_count: c.rolls_count,
    unit_label: c.unit_kind === 'meter' ? 'м' : 'шт',
    unit_cost_per_meter: includeFinancials ? c.unit_cost_per_meter : undefined,
    unit_cost_label: includeFinancials ? (c.unit_kind === 'meter' ? '₽/м' : '₽/шт') : undefined,
  }
}

function parseUnitKind(raw: unknown): { kind?: DemoConsumable['unit_kind']; error?: string } {
  if (raw == null) return { kind: 'meter' }
  const val = String(raw).trim().toLowerCase()
  if (val === 'meter' || val === 'meters' || val === 'м' || val === 'метры') return { kind: 'meter' }
  if (val === 'piece' || val === 'pieces' || val === 'шт' || val === 'штуки') return { kind: 'piece' }
  return { error: 'unit_kind: meter (метры) или piece (штуки).' }
}

export function createConsumable(
  db: DemoDb,
  shopUid: number,
  body: Record<string, unknown>,
  nextId: () => number,
): { error?: string; consumable?: DemoConsumable } {
  const name = String(body.name ?? '').trim()
  if (!name) return { error: 'Укажите название.' }
  const uk = parseUnitKind(body.unit_kind)
  if (uk.error) return { error: uk.error }
  const c: DemoConsumable = {
    id: nextId(),
    user_id: shopUid,
    name: name.slice(0, 200),
    unit_kind: uk.kind!,
    meters_balance: '0.000',
    rolls_count: 0,
    unit_cost_per_meter: null,
    photo_path: null,
  }
  db.consumables.push(c)
  return { consumable: c }
}

export function patchConsumable(
  db: DemoDb,
  shopUid: number,
  consumableId: number,
  body: Record<string, unknown>,
): { error?: string; consumable?: DemoConsumable } {
  const c = db.consumables.find((x) => x.id === consumableId && x.user_id === shopUid)
  if (!c) return { error: 'Расходник не найден.' }
  if ('name' in body) {
    const name = String(body.name ?? '').trim()
    if (!name) return { error: 'Название не может быть пустым.' }
    c.name = name.slice(0, 200)
  }
  if ('unit_kind' in body) {
    const uk = parseUnitKind(body.unit_kind)
    if (uk.error) return { error: uk.error }
    if (uk.kind) c.unit_kind = uk.kind
  }
  return { consumable: c }
}

export function deleteConsumable(
  db: DemoDb,
  shopUid: number,
  consumableId: number,
): { error?: string; status?: number } {
  const c = db.consumables.find((x) => x.id === consumableId && x.user_id === shopUid)
  if (!c) return { error: 'Расходник не найден.', status: 404 }
  const bal = parseMoney(c.meters_balance) ?? 0
  if (bal > 0 || (c.rolls_count || 0) > 0) {
    return {
      error: 'Нельзя удалить: на складе ещё есть остаток. Сначала спишите.',
      status: 409,
    }
  }
  db.consumables = db.consumables.filter((x) => x.id !== consumableId)
  return {}
}

export function intakeConsumable(
  db: DemoDb,
  shopUid: number,
  consumableId: number,
  body: Record<string, unknown>,
  nextId: () => number,
): { error?: string; consumable?: DemoConsumable } {
  const c = db.consumables.find((x) => x.id === consumableId && x.user_id === shopUid)
  if (!c) return { error: 'Расходник не найден.' }
  const packSize = parseMoney(body.pack_size)
  if (packSize == null || packSize <= 0) {
    return { error: 'Укажите pack_size (метры или штуки в одной катушке).' }
  }
  const rolls = Number.parseInt(String(body.rolls_count ?? 1), 10)
  if (!Number.isFinite(rolls) || rolls < 1) return { error: 'rolls_count должно быть не меньше 1.' }
  const rollCost = parseMoney(body.unit_cost_per_roll ?? body.unit_cost)
  if (rollCost == null || rollCost < 0) {
    return { error: 'Укажите unit_cost (цена за одну катушку/упаковку).' }
  }
  const qtyAdded = Math.round(packSize * rolls * 1000) / 1000
  const purchaseTotal = Math.round(rollCost * rolls * 100) / 100
  const oldM = parseMoney(c.meters_balance) ?? 0
  const oldUcpm = parseMoney(c.unit_cost_per_meter) ?? 0
  const oldValue = Math.round(oldM * oldUcpm * 100) / 100
  const newM = Math.round((oldM + qtyAdded) * 1000) / 1000
  const newValue = Math.round((oldValue + purchaseTotal) * 100) / 100
  const newUcpm = newM > 0 ? Math.round((newValue / newM) * 10000) / 10000 : 0
  c.meters_balance = moneyStr(newM)
  c.rolls_count = (c.rolls_count || 0) + rolls
  c.unit_cost_per_meter = moneyStr(newUcpm)
  if (!db.consumableIntakes) db.consumableIntakes = []
  db.consumableIntakes.push({
    id: nextId(),
    user_id: shopUid,
    consumable_id: c.id,
    amount_rub: moneyStr(purchaseTotal),
    rolls_count: rolls,
    quantity_added: moneyStr(qtyAdded),
    purchased_at: new Date().toISOString(),
  })
  return { consumable: c }
}
