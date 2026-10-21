import type { SaleStockOption } from '../../../pages/warehouse/saleStockOptions'
import type { StoreFlowerStockBreakdown } from '../../../utils/bouquetAssembleRealization'
import { isFlowerStockHit } from '../../../utils/stockSearchQuery'
import { parseMoneyInput } from '../../../utils/crmInput'
import {
  customBouquetCompositionComplete,
  maxCustomBouquetSaleQty,
} from './CustomBouquetSaleFields'
import type { SaleModalLineRow } from './saleModalLines'

function isSaleModalLineComplete(
  row: SaleModalLineRow,
  line: SaleStockOption | undefined,
  stockBySf: Map<number, StoreFlowerStockBreakdown>,
): boolean {
  if (!line) return false

  if (line.kind === 'custom_bouquet') {
    if (!customBouquetCompositionComplete(row.customComposition)) return false
    const maxQty = maxCustomBouquetSaleQty(row.customComposition ?? [], stockBySf)
    if (maxQty < 1) return false
    const qty = Number.parseInt(row.qty.trim(), 10)
    if (!Number.isFinite(qty) || qty < 1 || qty > maxQty) return false
    const priceParsed = parseMoneyInput(row.unitPrice)
    return priceParsed !== null && priceParsed !== 'bad' && priceParsed > 0
  }

  if (line.qty < 1) return false

  const qty = Number.parseInt(row.qty.trim(), 10)
  if (!Number.isFinite(qty) || qty < 1 || qty > line.qty) return false

  const priceParsed = parseMoneyInput(row.unitPrice)
  if (priceParsed === null || priceParsed === 'bad' || priceParsed <= 0) return false

  const realizationCap = line.realizationAvailable ?? 0
  if (realizationCap > 0) {
    const raw = row.realizationQty.trim()
    const saleRq = raw === '' ? 0 : Number.parseInt(raw, 10)
    if (!Number.isFinite(saleRq) || saleRq < 0) return false
    if (saleRq > qty || saleRq > realizationCap) return false
  }

  return true
}

/** Неверное «с реализации»: не число, < 0 или больше допустимого. Пустое поле — ок (0). */
export function isSaleModalLineRealizationInvalid(
  row: SaleModalLineRow,
  line: SaleStockOption | undefined,
): boolean {
  if (!line) return false
  const realizationCap = line.realizationAvailable ?? 0
  if (realizationCap <= 0) return false

  const raw = row.realizationQty.trim()
  if (raw === '') return false

  const qty = Number.parseInt(row.qty.trim(), 10)
  const saleN = Number.isFinite(qty) && qty >= 1 ? qty : 0
  const saleRq = Number.parseInt(raw, 10)
  if (!Number.isFinite(saleRq) || saleRq < 0) return true
  if (saleRq > realizationCap) return true
  if (saleN >= 1 && saleRq > saleN) return true
  return false
}

export function areAllSaleModalLinesComplete(
  rows: SaleModalLineRow[],
  saleStockOptions: SaleStockOption[],
  stockBySf: Map<number, StoreFlowerStockBreakdown>,
): boolean {
  if (rows.length === 0) return false
  return rows.every((row) => {
    const line = saleStockOptions.find((o) => o.key === row.lineKey)
    return isSaleModalLineComplete(row, line, stockBySf)
  })
}

export function buildStockLineApiBody(
  line: SaleStockOption,
  row: SaleModalLineRow,
  stockBySf: Map<number, StoreFlowerStockBreakdown> = new Map(),
): Record<string, unknown> | { error: string } {
  const qty = Number.parseInt(row.qty.trim(), 10)
  if (!Number.isFinite(qty) || qty < 1) {
    return { error: 'Укажите количество ≥ 1.' }
  }

  const priceParsed = parseMoneyInput(row.unitPrice)
  if (priceParsed === null || priceParsed === 'bad' || priceParsed <= 0) {
    return { error: 'Укажите цену.' }
  }

  if (line.kind === 'custom_bouquet') {
    if (!customBouquetCompositionComplete(row.customComposition)) {
      return { error: 'Укажите состав букета.' }
    }
    const maxQty = maxCustomBouquetSaleQty(row.customComposition ?? [], stockBySf)
    if (maxQty < 1) {
      return { error: 'Недостаточно цветов на складе для такого состава.' }
    }
    if (qty > maxQty) {
      return { error: `Недостаточно цветов (макс. ${maxQty} букет(ов)).` }
    }
    return {
      quantity: qty,
      unit_price: priceParsed,
      bouquet_name: row.customName?.trim() || 'Букет на заказ',
      composition: (row.customComposition ?? []).flatMap((c) => {
        if (!c.taxon || !isFlowerStockHit(c.taxon)) return []
        return [
          {
            store_flower_id: c.taxon.store_flower_id ?? c.taxon.id,
            quantity: Number.parseInt(c.qty.trim(), 10),
          },
        ]
      }),
    }
  }

  if (qty > line.qty) {
    return { error: `Недостаточно на складе (макс. ${line.qty}).` }
  }

  const realizationCap = line.realizationAvailable ?? 0
  let saleRq = 0
  if (realizationCap > 0) {
    const raw = row.realizationQty.trim()
    saleRq = raw === '' ? 0 : Number.parseInt(raw, 10)
    if (!Number.isFinite(saleRq) || saleRq < 0) {
      return { error: 'Укажите «с реализации» (0 или больше).' }
    }
    if (saleRq > qty || saleRq > realizationCap) {
      return {
        error: `С реализации — не больше ${Math.min(realizationCap, qty)} шт.`,
      }
    }
  }

  const realizationPart =
    realizationCap > 0 && saleRq > 0 ? { realization_quantity: saleRq } : {}

  if (line.kind === 'batch') {
    return { batch_id: line.batchId, quantity: qty, unit_price: priceParsed, ...realizationPart }
  }
  if (line.kind === 'sf') {
    return {
      store_flower_id: line.storeFlowerId,
      quantity: qty,
      unit_price: priceParsed,
      ...realizationPart,
    }
  }
  if (line.kind === 'bouquet') {
    return { bouquet_id: line.bouquetId, quantity: qty, unit_price: priceParsed, ...realizationPart }
  }
  return {
    retail_product_id: line.retailId,
    quantity: qty,
    unit_price: priceParsed,
    ...realizationPart,
  }
}
