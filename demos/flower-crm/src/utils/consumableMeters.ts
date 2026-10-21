/** Парсинг, подписи и отображение расходников (учёт в м или в шт). */

import type { ConsumableUnitKind } from '../components/crm/stock/types'

export function parseConsumableMeters(raw: string | null | undefined): number | null {
  if (raw == null || raw === '') return null
  const n = Number.parseFloat(String(raw).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export function formatConsumableQuantity(raw: string | null | undefined): string {
  const n = parseConsumableMeters(raw)
  if (n == null) return '0'
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 3 })
}

/** @deprecated use formatConsumableQuantity */
export const formatConsumableMeters = formatConsumableQuantity

/** Единица остатка на складе и в рецепте букета. */
export function consumableUnitLabel(unitKind: ConsumableUnitKind | string | undefined): string {
  return unitKind === 'piece' ? 'шт' : 'см'
}

/** Метров в катушке при приходе (ввод пользователя). */
export function consumableIntakePackUnitLabel(unitKind: ConsumableUnitKind | string | undefined): string {
  return unitKind === 'piece' ? 'шт' : 'м'
}

export function isPieceUnit(unitKind: ConsumableUnitKind | string | undefined): boolean {
  return unitKind === 'piece'
}

/** Сколько м или шт в одной катушке / упаковке (поле прихода). */
export function consumablePackVolumeFieldLabel(unitKind: ConsumableUnitKind | string | undefined): string {
  return isPieceUnit(unitKind) ? 'Штук в упаковке' : 'Метров в катушке'
}

/** Короткая подсказка: «м в катушке» / «шт в упаковке». */
export function consumablePackVolumeHint(unitKind: ConsumableUnitKind | string | undefined): string {
  return isPieceUnit(unitKind) ? 'шт в упаковке' : 'м в катушке'
}

export function consumablePackCountFieldLabel(unitKind: ConsumableUnitKind | string | undefined): string {
  return isPieceUnit(unitKind) ? 'Упаковок' : 'Катушек / рулонов'
}

/** Подпись поля цены: «Цена за упаковку, ₽/уп» / «Цена за катушку, ₽/кат». */
export function consumablePackPriceFieldLabel(unitKind: ConsumableUnitKind | string | undefined): string {
  const suffix = consumablePackPriceSuffix(unitKind)
  return isPieceUnit(unitKind) ? `Цена за упаковку, ${suffix}` : `Цена за катушку, ${suffix}`
}

/** Короткая подпись над полем цены в строке прихода. */
export function consumablePackPriceShortLabel(unitKind: ConsumableUnitKind | string | undefined): string {
  return isPieceUnit(unitKind) ? 'Цена за упаковку' : 'Цена за катушку'
}

export function consumablePackPriceSuffix(unitKind: ConsumableUnitKind | string | undefined): string {
  return isPieceUnit(unitKind) ? '₽/уп' : '₽/кат'
}

/** @deprecated */
export const consumableRollCostSuffix = consumablePackPriceSuffix
/** @deprecated */
export const consumableUnitCostSuffix = consumablePackPriceSuffix
/** @deprecated */
export const consumablePackUnitLabel = consumablePackVolumeHint

export function consumableIntakeHint(unitKind: ConsumableUnitKind | string | undefined): string {
  if (isPieceUnit(unitKind)) {
    return 'На складе учитываются штуки. Укажите, сколько шт в одной упаковке, число упаковок и цену за упаковку — остаток посчитается сам.'
  }
  return 'На складе учёт в сантиметрах. Укажите, сколько метров в катушке при приходе, число катушек и цену — остаток в см посчитается сам.'
}

/** Короткая подсказка в строке «Нового прихода». */
export function consumableIntakeBatchHint(unitKind: ConsumableUnitKind | string | undefined): string {
  if (isPieceUnit(unitKind)) {
    return 'Сколько шт в одной упаковке, сколько упаковок привезли и цена за упаковку — остаток на складе посчитается сам.'
  }
  return 'Сколько метров в катушке, сколько катушек и цена — на склад запишутся сантиметры.'
}

/** Подпись количества расходника в рецепте букета. */
export function consumableBouquetRecipeQtyLabel(unitKind: ConsumableUnitKind | string | undefined): string {
  return isPieceUnit(unitKind) ? 'Штук в букете' : 'Сантиметров в букете'
}

/** Короткий суффикс у поля «число упаковок/катушек». */
export function consumablePackCountInlineSuffix(unitKind: ConsumableUnitKind | string | undefined): string {
  return isPieceUnit(unitKind) ? 'уп.' : 'кат.'
}

export function consumablePriceRequiredError(unitKind: ConsumableUnitKind | string | undefined): string {
  return isPieceUnit(unitKind) ? 'Укажите цену за упаковку' : 'Укажите цену за катушку'
}

export function consumablePackVolumeRequiredError(unitKind: ConsumableUnitKind | string | undefined): string {
  return isPieceUnit(unitKind)
    ? 'Укажите, сколько шт в одной упаковке (больше 0)'
    : 'Укажите, сколько метров в одной катушке (больше 0)'
}

export function consumablePackCountRequiredError(unitKind: ConsumableUnitKind | string | undefined): string {
  return isPieceUnit(unitKind) ? 'Укажите число упаковок не меньше 1' : 'Укажите число катушек не меньше 1'
}

export function consumableEmptyPartiesLabel(unitKind: ConsumableUnitKind | string | undefined): string {
  return isPieceUnit(unitKind) ? 'нет упаковок' : 'нет катушек'
}

export function formatPackSizeLabel(
  packSize: string,
  unitKind: ConsumableUnitKind | string | undefined,
): string {
  const n = parseConsumableMeters(packSize)
  const unit = consumableUnitLabel(unitKind)
  if (n == null) return `— ${unit}`
  return `${n.toLocaleString('ru-RU', { maximumFractionDigits: 3 })} ${unit} ${consumablePackVolumeHint(unitKind)}`
}

function rollsLabelMeters(count: number): string {
  const n = Math.max(0, Math.floor(count))
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 14) return `${n} катушек`
  if (mod10 === 1) return `${n} катушка`
  if (mod10 >= 2 && mod10 <= 4) return `${n} катушки`
  return `${n} катушек`
}

export function partiesLabel(count: number, unitKind: ConsumableUnitKind | string | undefined): string {
  if (isPieceUnit(unitKind)) {
    const n = Math.max(0, Math.floor(count))
    const mod10 = n % 10
    const mod100 = n % 100
    if (mod100 >= 11 && mod100 <= 14) return `${n} упаковок`
    if (mod10 === 1) return `${n} упаковка`
    if (mod10 >= 2 && mod10 <= 4) return `${n} упаковки`
    return `${n} упаковок`
  }
  return rollsLabelMeters(count)
}

export function intakePreviewQuantity(
  packSize: string,
  rollsCount: number,
  unitKind: ConsumableUnitKind | string | undefined,
): string | null {
  const pack = parseConsumableMeters(packSize)
  if (pack == null || pack <= 0 || !Number.isFinite(rollsCount) || rollsCount < 1) return null
  const total = isPieceUnit(unitKind) ? pack * rollsCount : pack * rollsCount * 100
  const unit = consumableUnitLabel(unitKind)
  return `+${total.toLocaleString('ru-RU', { maximumFractionDigits: 3 })} ${unit}`
}
