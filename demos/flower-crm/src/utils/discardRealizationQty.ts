/** Минимум шт. с реализации, чтобы после операции на реализации не было больше, чем на складе. */
export function minRealizationFromPool(poolSize: number, stockAfterSink: number): number {
  return Math.max(0, poolSize - stockAfterSink)
}

export function realizationBalanceError(minRequired: number): string {
  return `Минимум ${minRequired} шт. с реализации`
}

/**
 * Списание / инвентаризация: n — на складе, m — на реализации, k — списать, r — с реализации.
 * r ≤ m, r ≤ k, k ≤ n, (k − r) ≤ (n − m).
 */
export function validateDiscardRealizationQty(
  discardQty: number,
  realizationQty: number,
  maxOnRealization: number,
  stockQty: number,
): string | null {
  if (maxOnRealization <= 0) return null
  if (!Number.isFinite(realizationQty) || realizationQty < 0) {
    return 'Укажите целое число ≥ 0.'
  }
  if (realizationQty > discardQty) {
    return 'С реализации в утиль не больше общего списания.'
  }
  if (realizationQty > maxOnRealization) {
    return `С реализации доступно не больше ${maxOnRealization} шт.`
  }
  const minFromRealization = minRealizationFromPool(maxOnRealization, stockQty - discardQty)
  if (realizationQty < minFromRealization) {
    return realizationBalanceError(minFromRealization)
  }
  return null
}

/**
 * Приёмка: m — реал. в накладной, d — брак, g — на склад (принято − брак), r — брак из реализации.
 * r ≤ m, r ≤ d, (m − r) ≤ g.
 */
export function validateReceiveRealizationDefectQty(
  defectFromRealization: number,
  defect: number,
  plannedRealization: number,
  goodQty: number,
): string | null {
  if (plannedRealization <= 0) return null
  if (!Number.isFinite(defectFromRealization) || defectFromRealization < 0) {
    return 'Укажите целое число ≥ 0.'
  }
  if (defectFromRealization > defect) {
    return 'Брак из реализации не больше брака.'
  }
  if (defectFromRealization > plannedRealization) {
    return 'Брак из реализации не больше, чем в накладной.'
  }
  const minFromRealization = minRealizationFromPool(plannedRealization, goodQty)
  if (defectFromRealization < minFromRealization) {
    return realizationBalanceError(minFromRealization)
  }
  return null
}
