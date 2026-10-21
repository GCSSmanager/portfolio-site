import { addCalendarDaysLocal } from './calendarDay'
import type { DemoBatch, DemoDb, DemoUser } from './types'

/** Календарный цикл общего ухода открыт (как FlowerFlow basic_shop_periodic_due). */
export function basicShopPeriodicDue(owner: DemoUser, todayIso: string): boolean {
  if (owner.warehouse_mode !== 'basic') return false
  const today = todayIso.slice(0, 10)
  const nxt = owner.basic_next_care_date
  if (!nxt) return false
  if (today < nxt) {
    const anchor = owner.basic_care_cycle_anchor_date
    if (!anchor) return false
    return today >= anchor.slice(0, 10)
  }
  const anchor = owner.basic_care_cycle_anchor_date
  if (anchor) return today >= anchor.slice(0, 10)
  return true
}

/** Нужен уход по принятым партиям в текущем окне (как basic_periodic_need_cleared_only). */
export function basicPeriodicNeedClearedOnly(
  owner: DemoUser,
  clearedBatches: DemoBatch[],
  todayIso: string,
): boolean {
  if (!clearedBatches.length) return false
  if (!basicShopPeriodicDue(owner, todayIso)) return false
  const gate = owner.basic_care_cycle_anchor_date ?? owner.basic_next_care_date
  if (!gate) return false
  const gateDay = gate.slice(0, 10)
  for (const b of clearedBatches) {
    const lt = b.last_trim_at
    if (!lt) return true
    if (lt.slice(0, 10) < gateDay) return true
  }
  return false
}

/** Когда наступила basic_next_care_date — якорь цикла и сдвиг следующей даты (как advance_basic_shop_calendar_if_due). */
export function advanceBasicShopCalendarIfDue(db: DemoDb, shopUid: number): boolean {
  const owner = db.users.find((u) => u.id === shopUid && u.role === 'owner')
  if (!owner || owner.warehouse_mode !== 'basic') return false
  const today = db.demoDay.slice(0, 10)
  let nxt = owner.basic_next_care_date?.slice(0, 10)
  if (!nxt) return false
  const interval = Math.max(1, Math.min(owner.basic_care_interval_days || 3, 90))
  let changed = false
  while (today >= nxt) {
    owner.basic_care_cycle_anchor_date = nxt
    nxt = addCalendarDaysLocal(nxt, interval)
    changed = true
  }
  if (changed) {
    owner.basic_next_care_date = nxt
  }
  return changed
}

export function applyBasicShopPeriodicCare(
  db: DemoDb,
  shopUid: number,
): { error?: string; code?: string; owner?: DemoUser } {
  const owner = db.users.find((u) => u.id === shopUid && u.role === 'owner')
  if (!owner) return { code: 'no_user', error: 'Магазин не найден.' }
  if (owner.warehouse_mode !== 'basic') {
    return { code: 'wrong_mode', error: 'Доступно только в базовом режиме склада.' }
  }
  if (!basicShopPeriodicDue(owner, db.demoDay)) {
    return {
      code: 'not_due',
      error: 'Общий уход по графику сегодня не запланирован (проверьте дату в настройках).',
    }
  }
  const interval = Math.max(1, Math.min(owner.basic_care_interval_days || 3, 90))
  owner.basic_next_care_date = addCalendarDaysLocal(db.demoDay, interval)
  owner.basic_care_cycle_anchor_date = null
  const now = new Date().toISOString()
  for (const care of db.basicCare.filter((c) => c.user_id === shopUid)) {
    const hasCleared = db.batches.some(
      (b) =>
        b.store_flower_id === care.store_flower_id &&
        b.quantity > 0 &&
        !b.intake_pending,
    )
    if (!hasCleared) continue
    const batches = db.batches.filter(
      (b) => b.user_id === shopUid && b.store_flower_id === care.store_flower_id && b.quantity > 0,
    )
    if (!batches.length) continue
    care.last_trim_at = now
    care.last_water_change_at = now
    for (const b of batches) {
      if (b.intake_pending) continue
      b.last_trim_at = now
      b.last_water_change_at = now
    }
  }
  return { owner }
}
