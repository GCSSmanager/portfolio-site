import type { DemoDb } from './types'
import { usesMergedWarehouseCards } from './warehouseMode'

/** Продвинутый склад: одна сборка на остаток букета без партий (миграция старых демо-БД). */
export function ensureBouquetAssembliesForAdvanced(db: DemoDb): boolean {
  let changed = false
  for (const owner of db.users.filter((u) => u.role === 'owner')) {
    if (usesMergedWarehouseCards(owner.warehouse_mode)) continue
    const shopUid = owner.id
    for (const b of db.bouquets.filter((x) => x.user_id === shopUid && x.quantity > 0)) {
      const hasAsm = db.bouquetAssemblies.some((a) => a.bouquet_id === b.id && a.quantity > 0)
      if (hasAsm) continue
      const asmId = db.nextNumericId
      db.nextNumericId += 1
      db.bouquetAssemblies.push({
        id: asmId,
        bouquet_id: b.id,
        user_id: shopUid,
        quantity: b.quantity,
        assembled_at: b.assembled_at ?? `${db.demoDay}T12:00:00.000Z`,
        last_trim_at: b.last_trim_at,
        last_water_change_at: b.last_water_change_at,
      })
      changed = true
    }
  }
  return changed
}
