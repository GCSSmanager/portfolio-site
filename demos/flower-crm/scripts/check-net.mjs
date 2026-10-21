import { createSeedDb } from '../src/demo/seed.ts'
import { buildSalesStatsRange } from '../src/demo/saleStatsRange.ts'
import { findUser } from '../src/demo/serialize.ts'

const db = createSeedDb()
const owner = findUser(db, 1)
const end = db.demoDay
const start = new Date(`${end}T12:00:00Z`)
start.setUTCDate(start.getUTCDate() - 89)
const params = new URLSearchParams({ from: start.toISOString().slice(0, 10), to: end })
const r = buildSalesStatsRange(db, 1, owner, params)
console.log(JSON.stringify({
  revenue: r.totals.total_amount,
  shop_profit: r.totals.total_profit,
  expenses: r.totals.total_expenses,
  net: r.totals.net_profit_after_expenses,
}, null, 2))
