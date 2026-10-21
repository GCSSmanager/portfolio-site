/** Ответ GET /api/me/flowers/search/?q=… (при supplier_id — закупка из SupplierOffer). */
export type StoreFlowerSearchHit = {
  id: number
  store_flower_id: number
  name: string
  display_name: string
  latin_name: string | null
  rank: string
  rank_label: string
  photo_url?: string | null
  catalog_linked?: boolean
  taxon_id?: number | null
  unit_purchase_price?: number | null
}
