import type {
  BatchRow,
  BouquetRow,
  RetailProductRow,
  SaleLineKey,
} from '../../components/crm/stock/types'
import type { CrmListSearchOption } from './CrmListSearch'

export type SaleStockOption = {
  key: SaleLineKey
  kind: 'batch' | 'sf' | 'retail' | 'bouquet' | 'custom_bouquet'
  label: string
  name: string
  qty: number
  unit_price: string | null
  photo_url?: string | null
  /** Остаток «на реализации» по выбранной позиции (цветы). */
  realizationAvailable?: number
  batchId?: number
  storeFlowerId?: number
  retailId?: number
  bouquetId?: number
}

/** Позиции с ненулевым остатком для продажи (склад + букеты + товары). */
export function buildSaleStockOptions(
  batchesInStock: BatchRow[],
  retailForSale: RetailProductRow[],
  bouquetsForSale: BouquetRow[],
): SaleStockOption[] {
  const sfGroups = new Map<number, BatchRow[]>()
  const flowerBatchRows: BatchRow[] = []
  for (const b of batchesInStock) {
    if (b.line_kind === 'basic' && b.store_flower_id != null) {
      const list = sfGroups.get(b.store_flower_id) ?? []
      list.push(b)
      sfGroups.set(b.store_flower_id, list)
    } else {
      flowerBatchRows.push(b)
    }
  }
  const flowerFromSf: SaleStockOption[] = [...sfGroups.entries()].map(([sfId, rows]) => {
    const name = rows[0]?.display_name ?? ''
    const qty = rows.reduce((s, r) => s + r.quantity, 0)
    const realization = rows.reduce((s, r) => s + (r.realization_quantity ?? 0), 0)
    const unit_price = rows.find((r) => r.unit_price)?.unit_price ?? null
    return {
      key: `sf:${sfId}` as SaleLineKey,
      kind: 'sf' as const,
      label: `${name} · ${qty} шт.`,
      name,
      qty,
      unit_price,
      photo_url: rows[0]?.photo_url ?? null,
      realizationAvailable: realization > 0 ? realization : undefined,
      storeFlowerId: sfId,
    }
  })
  const flowerFromBatch = flowerBatchRows.map((b) => ({
    key: `batch:${b.id}` as SaleLineKey,
    kind: 'batch' as const,
    label: `#${b.id} · ${b.display_name} · ${b.quantity} шт.`,
    name: b.display_name,
    qty: b.quantity,
    unit_price: b.unit_price ?? null,
    photo_url: b.photo_url ?? null,
    realizationAvailable:
      (b.realization_quantity ?? 0) > 0 ? (b.realization_quantity ?? 0) : undefined,
    batchId: b.id,
  }))
  const flower = [...flowerFromSf, ...flowerFromBatch]
  const hasAssemblableFlowers = flowerFromSf.some(
    (o) => o.qty - (o.realizationAvailable ?? 0) > 0,
  )
  const custom: SaleStockOption[] = hasAssemblableFlowers
    ? [
        {
          key: 'custom_bouquet',
          kind: 'custom_bouquet',
          label: 'Букет на заказ · свой состав',
          name: 'Букет на заказ',
          qty: 9999,
          unit_price: null,
        },
      ]
    : []
  const retail = retailForSale.map((p) => ({
    key: `retail:${p.id}` as SaleLineKey,
    kind: 'retail' as const,
    label: `${p.name} · ${p.quantity} шт.`,
    name: p.name,
    qty: p.quantity,
    unit_price: p.unit_price ?? null,
    photo_url: p.photo_url ?? null,
    realizationAvailable:
      (p.realization_quantity ?? 0) > 0 ? (p.realization_quantity ?? 0) : undefined,
    retailId: p.id,
  }))
  const bouquetOpts = bouquetsForSale.map((b) => ({
    key: `bouquet:${b.id}` as SaleLineKey,
    kind: 'bouquet' as const,
    label: `${b.name} · ${b.quantity} шт.`,
    name: b.name,
    qty: b.quantity,
    unit_price: b.unit_price ?? null,
    photo_url: b.photo_url ?? null,
    bouquetId: b.id,
  }))
  return [...custom, ...bouquetOpts, ...flower, ...retail]
}

export function saleStockOptionMeta(line: SaleStockOption): string {
  const kind =
    line.kind === 'batch'
      ? `партия #${line.batchId}`
      : line.kind === 'sf'
        ? 'вид на складе'
        : line.kind === 'bouquet'
          ? 'букет'
          : line.kind === 'custom_bouquet'
            ? 'букет на заказ'
            : 'товар без срока'
  return kind
}

export function saleStockOptionsToListSearch(options: SaleStockOption[]): CrmListSearchOption[] {
  return options.map((o) => {
    const kind = saleStockOptionMeta(o)
    return {
      key: o.key,
      title:
        o.kind === 'custom_bouquet'
          ? o.name
          : `${o.name} · ${o.qty.toLocaleString('ru-RU')} шт.`,
      meta: kind,
      /** Для поиска по слову «букет» и виду позиции. */
      searchText: `${o.name} ${kind} ${o.label}`,
    }
  })
}
