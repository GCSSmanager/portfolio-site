import { formatUnitCostInput, type TaxonQtyLineRow } from '../../../pages/warehouse/TaxonPickQtyRow'
import { emptyRealizationLine } from '../../../pages/warehouse/SaleTermsFields'
import { parseStoredMoney } from '../../../utils/crmInput'
import { isPieceUnit } from '../../../utils/consumableMeters'
import { isConsumableStockHit, isFlowerStockHit, type FlowerStockSearchHit, type ConsumableStockSearchHit } from '../../../utils/stockSearchQuery'
import type { BouquetConsumableRecipeLineRow, BouquetRecipeLineRow } from '../stock/types'

let lineKeySeq = 1000

export function bouquetUnitPriceDraft(unitPrice: string | null | undefined): string {
  const n = parseStoredMoney(unitPrice ?? null)
  if (n == null || n <= 0) return ''
  return formatUnitCostInput(n)
}

function recipeLineToTaxon(rl: BouquetRecipeLineRow): FlowerStockSearchHit {
  return {
    stock_kind: 'flower',
    id: rl.store_flower_id,
    store_flower_id: rl.store_flower_id,
    name: rl.display_name,
    display_name: rl.display_name,
    latin_name: null,
    rank: '',
    rank_label: 'Цветок',
    photo_url: rl.photo_url ?? null,
  }
}

function consumableRecipeLineToTaxon(rl: BouquetConsumableRecipeLineRow): ConsumableStockSearchHit {
  return {
    stock_kind: 'consumable',
    id: rl.consumable_id,
    consumable_id: rl.consumable_id,
    name: rl.display_name,
    display_name: rl.display_name,
    rank_label: 'Расходник',
    unit_kind: rl.unit_kind,
    unit_label: rl.unit_label,
    photo_url: rl.photo_url ?? null,
  }
}

export function recipeLinesToTaxonRows(recipeLines: BouquetRecipeLineRow[]): TaxonQtyLineRow[] {
  if (recipeLines.length === 0) {
    return []
  }
  return recipeLines.map((rl) => ({
    key: lineKeySeq++,
    taxon: recipeLineToTaxon(rl),
    qty: String(rl.quantity),
    unitCost: '',
    ...emptyRealizationLine(),
  }))
}

export function consumableRecipeLinesToTaxonRows(
  lines: BouquetConsumableRecipeLineRow[],
): TaxonQtyLineRow[] {
  if (lines.length === 0) {
    return []
  }
  return lines.map((rl) => ({
    key: lineKeySeq++,
    taxon: consumableRecipeLineToTaxon(rl),
    qty: rl.quantity.replace(/\.?0+$/, '').replace(/\.$/, '') || rl.quantity,
    unitCost: '',
    ...emptyRealizationLine(),
  }))
}

export function newBouquetRecipeLine(): TaxonQtyLineRow {
  return { key: lineKeySeq++, taxon: null, qty: '1', unitCost: '', ...emptyRealizationLine() }
}

export function newBouquetConsumableRecipeLine(): TaxonQtyLineRow {
  return { key: lineKeySeq++, taxon: null, qty: '50', unitCost: '', ...emptyRealizationLine() }
}

export function bouquetRecipeLineIsUnfilled(ln: TaxonQtyLineRow): boolean {
  return ln.taxon == null
}

export type BouquetRecipeLinesValidation =
  | {
      ok: true
      flowerLines: { store_flower_id: number; quantity: number }[]
      consumableLines: { consumable_id: number; quantity: string }[]
    }
  | { ok: false; error: string }

export function validateBouquetRecipeLines(
  flowerLines: TaxonQtyLineRow[],
  consumableLines: TaxonQtyLineRow[],
): BouquetRecipeLinesValidation {
  const lines: { store_flower_id: number; quantity: number }[] = []
  for (const ln of flowerLines) {
    if (!ln.taxon || !isFlowerStockHit(ln.taxon)) {
      return { ok: false, error: 'Выберите цветок в каждой строке или удалите пустую.' }
    }
    const stems = Number.parseInt(ln.qty.trim(), 10)
    if (!Number.isFinite(stems) || stems < 1) {
      return { ok: false, error: 'В каждой строке цветов укажите число штук не меньше 1.' }
    }
    lines.push({ store_flower_id: ln.taxon.store_flower_id ?? ln.taxon.id, quantity: stems })
  }

  const parsedConsumables: { consumable_id: number; quantity: string }[] = []
  for (const ln of consumableLines) {
    if (!ln.taxon || !isConsumableStockHit(ln.taxon)) {
      return { ok: false, error: 'Выберите расходник в каждой строке или удалите пустую.' }
    }
    const q = Number.parseFloat(ln.qty.replace(',', '.'))
    if (!Number.isFinite(q) || q <= 0) {
      return { ok: false, error: 'В каждой строке расходника укажите количество больше 0.' }
    }
    if (isPieceUnit(ln.taxon.unit_kind) && !Number.isInteger(q)) {
      return { ok: false, error: 'Для штучного расходника укажите целое число.' }
    }
    parsedConsumables.push({
      consumable_id: ln.taxon.consumable_id,
      quantity: String(q),
    })
  }

  if (lines.length === 0 && parsedConsumables.length === 0) {
    return { ok: false, error: 'Добавьте цветы и/или расходники в состав.' }
  }

  return { ok: true, flowerLines: lines, consumableLines: parsedConsumables }
}
