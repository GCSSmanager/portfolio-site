import type { StoreFlowerSearchHit } from './storeFlowerSearchQuery'

export type RetailStockSearchHit = {
  stock_kind: 'retail'
  id: number
  retail_product_id: number
  display_name: string
  name: string
  rank_label: string
  photo_url?: string | null
}

export type FlowerStockSearchHit = StoreFlowerSearchHit & { stock_kind: 'flower' }

export type BouquetStockSearchHit = {
  stock_kind: 'bouquet'
  id: number
  bouquet_id: number
  display_name: string
  name: string
  rank_label: string
  photo_url?: string | null
  quantity: number
}

export type ConsumableStockSearchHit = {
  stock_kind: 'consumable'
  id: number
  consumable_id: number
  display_name: string
  name: string
  rank_label: string
  unit_kind: 'meter' | 'piece'
  unit_label: string
  photo_url?: string | null
}

export type StockSearchHit =
  | FlowerStockSearchHit
  | RetailStockSearchHit
  | BouquetStockSearchHit
  | ConsumableStockSearchHit

export function isRetailStockHit(h: StockSearchHit): h is RetailStockSearchHit {
  return h.stock_kind === 'retail'
}

export function isFlowerStockHit(h: StockSearchHit): h is FlowerStockSearchHit {
  return h.stock_kind === 'flower'
}

export function isBouquetStockHit(h: StockSearchHit): h is BouquetStockSearchHit {
  return h.stock_kind === 'bouquet'
}

export function isConsumableStockHit(h: StockSearchHit): h is ConsumableStockSearchHit {
  return h.stock_kind === 'consumable'
}
