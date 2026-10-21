import type { SaleLineKey } from '../stock/types'

export type SaleLineDraft = {
  key: number
  lineKey: SaleLineKey | ''
  qty: string
  unitPrice: string
  realizationQty: string
}

let saleLineDraftKeySeq = 0

export function newSaleLineDraft(): SaleLineDraft {
  saleLineDraftKeySeq += 1
  return {
    key: saleLineDraftKeySeq,
    lineKey: '',
    qty: '1',
    unitPrice: '',
    realizationQty: '',
  }
}
