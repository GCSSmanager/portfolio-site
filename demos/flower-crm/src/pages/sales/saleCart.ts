import type { SaleLineKey } from '../../components/crm/stock/types'
import type { SaleStockOption } from '../warehouse/saleStockOptions'

export type SalesCartItem = {
  id: string
  lineKey: SaleLineKey
  name: string
  qty: number
  unitPrice: number
  realizationQty: number
  maxStock: number
  /** Доступно с реализации на складе (верхняя граница). */
  realizationCap: number
}

export function salesCartItemFromLine(
  line: SaleStockOption,
  qty: number,
  unitPrice: number,
  realizationQty: number,
  existingId?: string,
): SalesCartItem {
  const cap = line.realizationAvailable ?? 0
  const rq = cap > 0 ? Math.min(realizationQty, qty, cap) : 0
  return {
    id: existingId ?? `${line.key}-${Date.now()}`,
    lineKey: line.key,
    name: line.name,
    qty,
    unitPrice,
    realizationQty: rq,
    maxStock: line.qty,
    realizationCap: cap,
  }
}

export function realizationMaxForItem(item: SalesCartItem): number {
  if (item.realizationCap < 1) return 0
  return Math.min(item.realizationCap, item.qty)
}

export function buildSaleRequestBody(
  line: SaleStockOption,
  qty: number,
  unitPrice: number,
  realizationQty: number,
): Record<string, unknown> {
  const realizationPart =
    (line.realizationAvailable ?? 0) > 0 && realizationQty > 0
      ? { realization_quantity: realizationQty }
      : {}
  if (line.kind === 'batch') {
    return { batch_id: line.batchId, quantity: qty, unit_price: unitPrice, ...realizationPart }
  }
  if (line.kind === 'sf') {
    return {
      store_flower_id: line.storeFlowerId,
      quantity: qty,
      unit_price: unitPrice,
      ...realizationPart,
    }
  }
  if (line.kind === 'bouquet') {
    return { bouquet_id: line.bouquetId, quantity: qty, unit_price: unitPrice, ...realizationPart }
  }
  return {
    retail_product_id: line.retailId,
    quantity: qty,
    unit_price: unitPrice,
    ...realizationPart,
  }
}

export function cartItemsTotal(items: SalesCartItem[]): number {
  return items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0)
}

export function cartLineKeysInCart(items: SalesCartItem[]): Set<SaleLineKey> {
  return new Set(items.map((i) => i.lineKey))
}
