import type { BouquetConsumableRecipeLineRow, BouquetRecipeLineRow } from '../components/crm/stock/types'
import { formatConsumableQuantity, parseConsumableMeters } from './consumableMeters'

type BatchStockRow = {
  line_kind?: string
  store_flower_id?: number | null
  quantity?: number
  realization_quantity?: number
}

export type StoreFlowerStockBreakdown = {
  total: number
  realization: number
  available: number
}

export type BouquetAssembleUsageRow = {
  storeFlowerId: number
  displayName: string
  perBouquet: number
  /** null — количество букетов ещё не задано */
  needTotal: number | null
  stockTotal: number
  stockRealization: number
  stockAvailable: number
  shortage: boolean
}

export type BouquetAssembleConsumableUsageRow = {
  consumableId: number
  displayName: string
  unitLabel: string
  perBouquet: number
  needTotal: number | null
  stockAvailable: number
  shortage: boolean
}

/** Остаток по видам: сумма всех партий с store_flower_id (базовый и продвинутый склад). */
export function storeFlowerQuantityStock(batches: BatchStockRow[]): Map<number, number> {
  const m = new Map<number, number>()
  for (const b of batches) {
    if (b.store_flower_id == null) continue
    const q = b.quantity ?? 0
    if (q <= 0) continue
    m.set(b.store_flower_id, (m.get(b.store_flower_id) ?? 0) + q)
  }
  return m
}

/** На реализации по видам — сумма по всем партиям store_flower_id. */
export function storeFlowerRealizationStock(batches: BatchStockRow[]): Map<number, number> {
  const m = new Map<number, number>()
  for (const b of batches) {
    if (b.store_flower_id == null) continue
    const rq = b.realization_quantity ?? 0
    if (rq <= 0) continue
    m.set(b.store_flower_id, (m.get(b.store_flower_id) ?? 0) + rq)
  }
  return m
}

export function storeFlowerStockBreakdown(
  qtyBySf: Map<number, number>,
  realBySf: Map<number, number>,
): Map<number, StoreFlowerStockBreakdown> {
  const out = new Map<number, StoreFlowerStockBreakdown>()
  for (const [sfId, total] of qtyBySf) {
    const realization = realBySf.get(sfId) ?? 0
    out.set(sfId, {
      total,
      realization,
      available: Math.max(0, total - realization),
    })
  }
  for (const [sfId, realization] of realBySf) {
    if (out.has(sfId)) continue
    out.set(sfId, { total: 0, realization, available: 0 })
  }
  return out
}

export function formatStoreFlowerStockHint(info: StoreFlowerStockBreakdown): string {
  if (info.realization > 0) {
    return `Допустимо: ${info.available} шт. (на складе ${info.total}, на реализации ${info.realization})`
  }
  return `На складе: ${info.total} шт.`
}

export function buildAssembleRecipeUsage(
  recipe: BouquetRecipeLineRow[],
  bouquetCount: number,
  stockBySf: Map<number, StoreFlowerStockBreakdown>,
): BouquetAssembleUsageRow[] {
  const countOk = bouquetCount >= 1
  return recipe.map((rl) => {
    const needTotal = countOk ? rl.quantity * bouquetCount : null
    const stock = stockBySf.get(rl.store_flower_id) ?? { total: 0, realization: 0, available: 0 }
    const shortage = needTotal != null && needTotal > stock.available
    return {
      storeFlowerId: rl.store_flower_id,
      displayName: rl.display_name,
      perBouquet: rl.quantity,
      needTotal,
      stockTotal: stock.total,
      stockRealization: stock.realization,
      stockAvailable: stock.available,
      shortage,
    }
  })
}

export function buildAssembleConsumableUsage(
  recipe: BouquetConsumableRecipeLineRow[],
  bouquetCount: number,
  stockByConsumableId: Map<number, number>,
): BouquetAssembleConsumableUsageRow[] {
  const countOk = bouquetCount >= 1
  return recipe.map((rl) => {
    const per = parseConsumableMeters(rl.quantity) ?? 0
    const needTotal = countOk ? per * bouquetCount : null
    const stockAvailable = stockByConsumableId.get(rl.consumable_id) ?? 0
    const shortage = needTotal != null && needTotal > stockAvailable
    return {
      consumableId: rl.consumable_id,
      displayName: rl.display_name,
      unitLabel: rl.unit_label,
      perBouquet: per,
      needTotal,
      stockAvailable,
      shortage,
    }
  })
}

export function formatBouquetFlowerRecipeLine(rl: BouquetRecipeLineRow): string {
  return `${rl.display_name} ${rl.quantity} шт.`
}

export function formatBouquetConsumableRecipeLine(rl: BouquetConsumableRecipeLineRow): string {
  const q = formatConsumableQuantity(rl.quantity)
  return `${rl.display_name} ${q} ${rl.unit_label}`
}

export function formatBouquetRecipeSummary(
  recipeLines: BouquetRecipeLineRow[],
  consumableLines: BouquetConsumableRecipeLineRow[] | null | undefined,
): string {
  return listBouquetRecipeItemLabels(recipeLines, consumableLines).join(' · ')
}

export function listBouquetRecipeItemLabels(
  recipeLines: BouquetRecipeLineRow[],
  consumableLines: BouquetConsumableRecipeLineRow[] | null | undefined,
): string[] {
  return [
    ...recipeLines.map(formatBouquetFlowerRecipeLine),
    ...(consumableLines ?? []).map(formatBouquetConsumableRecipeLine),
  ]
}

export type BouquetRecipeListItem = {
  key: string
  label: string
  href?: string
  muted?: boolean
}

export function buildSaleCompositionListItems(
  composition: { display_name: string; quantity: number; store_flower_id?: number | null }[],
): BouquetRecipeListItem[] {
  return composition.map((line, idx) => ({
    key: `sf:${line.store_flower_id ?? idx}`,
    label: formatBouquetFlowerRecipeLine({
      store_flower_id: line.store_flower_id ?? idx,
      display_name: line.display_name,
      quantity: line.quantity,
    }),
    href: line.store_flower_id ? `/warehouse/flowers/${line.store_flower_id}` : undefined,
  }))
}

export function buildBouquetRecipeListItems(
  recipeLines: BouquetRecipeLineRow[],
  consumableLines: BouquetConsumableRecipeLineRow[] | null | undefined,
): BouquetRecipeListItem[] {
  const items: BouquetRecipeListItem[] = []
  for (const rl of recipeLines) {
    items.push({
      key: `f:${rl.store_flower_id ?? rl.taxon_id ?? rl.display_name}`,
      label: formatBouquetFlowerRecipeLine(rl),
      href: rl.store_flower_id
        ? `/warehouse/flowers/${rl.store_flower_id}`
        : rl.taxon_id
          ? `/flowers/${rl.taxon_id}`
          : undefined,
    })
  }
  for (const rl of consumableLines ?? []) {
    items.push({
      key: `c:${rl.consumable_id}`,
      label: formatBouquetConsumableRecipeLine(rl),
      muted: true,
    })
  }
  return items
}
