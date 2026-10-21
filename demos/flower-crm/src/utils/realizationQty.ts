/** Подсказка при частичной приёмке (как на бэкенде до явного поля). */
export function scaledRealizationQty(planned: number, ordered: number, onStock: number): number {
  if (onStock <= 0 || planned <= 0) return 0
  if (ordered <= 0) return Math.min(planned, onStock)
  return Math.min(onStock, Math.ceil((planned * onStock) / ordered))
}
