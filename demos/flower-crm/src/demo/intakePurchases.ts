import { parseMoney } from './money'
import type { DemoDb } from './types'

export function flowerIntakePurchaseTotal(
  db: DemoDb,
  shopUid: number,
  start_d: string,
  end_d: string,
): number {
  let total = 0
  for (const b of db.batches) {
    if (b.user_id !== shopUid) continue
    const d = b.received_at.slice(0, 10)
    if (d < start_d || d > end_d) continue
    const q = b.quantity
    if (q <= 0) continue
    total += (parseMoney(b.unit_cost) ?? 0) * q
  }
  return Math.round(total * 100) / 100
}

export function retailIntakePurchaseTotal(
  db: DemoDb,
  shopUid: number,
  start_d: string,
  end_d: string,
): number {
  let total = 0
  for (const row of db.retailIntakes ?? []) {
    if (row.user_id !== shopUid) continue
    const d = row.purchased_at.slice(0, 10)
    if (d < start_d || d > end_d) continue
    total += parseMoney(row.amount_rub) ?? 0
  }
  return Math.round(total * 100) / 100
}

export function consumableIntakePurchaseTotal(
  db: DemoDb,
  shopUid: number,
  start_d: string,
  end_d: string,
): number {
  let total = 0
  for (const row of db.consumableIntakes ?? []) {
    if (row.user_id !== shopUid) continue
    const d = row.purchased_at.slice(0, 10)
    if (d < start_d || d > end_d) continue
    total += parseMoney(row.amount_rub) ?? 0
  }
  return Math.round(total * 100) / 100
}

export function intakePurchasesForPeriod(
  db: DemoDb,
  shopUid: number,
  start_d: string,
  end_d: string,
) {
  const purchase_flowers = flowerIntakePurchaseTotal(db, shopUid, start_d, end_d)
  const purchase_retail = retailIntakePurchaseTotal(db, shopUid, start_d, end_d)
  const purchase_consumables = consumableIntakePurchaseTotal(db, shopUid, start_d, end_d)
  const purchase = Math.round((purchase_flowers + purchase_retail + purchase_consumables) * 100) / 100
  return { purchase_flowers, purchase_retail, purchase_consumables, purchase }
}
