import type { SaleLineKey } from '../stock/types'
import { type TaxonQtyLineRow } from '../../../pages/warehouse/TaxonPickQtyRow'
import { newBouquetRecipeLine } from './bouquetRecipeForm'

export type CustomBouquetCompRow = TaxonQtyLineRow

let saleModalLineKeySeq = 0

export function newCustomBouquetCompRow(): CustomBouquetCompRow {
  return newBouquetRecipeLine()
}

export type SaleModalLineRow = {
  key: number
  lineKey: SaleLineKey | ''
  qty: string
  unitPrice: string
  realizationQty: string
  customName?: string
  customComposition?: CustomBouquetCompRow[]
}

export function newSaleModalLine(defaultLineKey: SaleLineKey | '' = ''): SaleModalLineRow {
  saleModalLineKeySeq += 1
  return {
    key: saleModalLineKeySeq,
    lineKey: defaultLineKey,
    qty: '1',
    unitPrice: '',
    realizationQty: '',
    customName: '',
    customComposition: [newCustomBouquetCompRow()],
  }
}
