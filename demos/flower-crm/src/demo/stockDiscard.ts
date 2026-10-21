import { moneyStr, parseMoney } from './money'
import type { DemoDb, DemoStockDiscard } from './types'

export function recordStockDiscard(
  db: DemoDb,
  row: Omit<DemoStockDiscard, 'id'>,
  nextId: () => number,
): void {
  if (!db.stockDiscards) db.stockDiscards = []
  const total = parseMoney(row.total_cost) ?? 0
  const qty = row.quantity
  const unit = qty > 0 ? Math.round((total / qty) * 100) / 100 : 0
  db.stockDiscards.push({
    id: nextId(),
    ...row,
    unit_cost: moneyStr(unit),
    total_cost: moneyStr(total),
  })
}

export function manualDiscardCostForPeriod(
  db: DemoDb,
  shopUid: number,
  start_d: string,
  end_d: string,
): number {
  let total = 0
  for (const d of db.stockDiscards ?? []) {
    if (d.user_id !== shopUid) continue
    const day = d.discarded_at.slice(0, 10)
    if (day < start_d || day > end_d) continue
    total += parseMoney(d.total_cost) ?? 0
  }
  return Math.round(total * 100) / 100
}
