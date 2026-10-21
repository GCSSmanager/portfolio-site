/** Парсинг и проверка полей CRM: суммы и целые количества. */

const MONEY_INPUT_RE = /^\d+(?:[.,]\d{0,2})?$/

/** Убирает пробелы группировки (в т.ч. узкий неразрывный из ru-RU Intl). */
export function stripMoneyGrouping(raw: string): string {
  return raw.trim().replace(/[\s\u00a0\u202f]/g, '')
}

/** Значение для поля цены/суммы без разделителя тысяч — корректно парсится обратно. */
export function formatMoneyInputValue(value: number): string {
  if (!Number.isFinite(value)) return ''
  const rounded = Math.round(value * 100) / 100
  if (Number.isInteger(rounded)) return String(rounded)
  return rounded.toFixed(2).replace('.', ',')
}

export function parseMoneyInput(raw: string): number | null | 'bad' {
  const t = stripMoneyGrouping(raw)
  if (!t) return null
  if (!MONEY_INPUT_RE.test(t)) return 'bad'
  const normalized = t.replace(',', '.')
  const n = Number.parseFloat(normalized)
  if (!Number.isFinite(n) || n < 0) return 'bad'
  return n
}

export function isMoneyInputBad(raw: string): boolean {
  const t = raw.trim()
  if (!t) return false
  return parseMoneyInput(t) === 'bad'
}

export function isRequiredMoneyReady(raw: string): boolean {
  const p = parseMoneyInput(raw)
  return p !== null && p !== 'bad'
}

export function parseQtyInput(raw: string, min = 0): number | null | 'bad' {
  const t = raw.trim()
  if (!t) return null
  if (!/^\d+$/.test(t)) return 'bad'
  const q = Number.parseInt(t, 10)
  if (!Number.isFinite(q) || q < min) return 'bad'
  return q
}

export function isQtyInputBad(raw: string, min = 0): boolean {
  const t = raw.trim()
  if (!t) return false
  return parseQtyInput(t, min) === 'bad'
}

export function isRequiredQtyReady(raw: string, min = 0): boolean {
  const p = parseQtyInput(raw, min)
  return p !== null && p !== 'bad'
}

export function withCrmFieldInvalid(invalid: boolean, baseClass = 'crm-field'): string {
  return `${baseClass}${invalid ? ' crm-field--invalid' : ''}`.trim()
}

export function moneyNearlyEqual(a: number | null, b: number | null): boolean {
  if (a === null && b === null) return true
  if (a === null || b === null) return false
  return Math.abs(a - b) < 1e-6
}

export function parseStoredMoney(iso: string | null | undefined): number | null {
  if (iso == null || iso === '') return null
  const n = Number.parseFloat(iso.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}
