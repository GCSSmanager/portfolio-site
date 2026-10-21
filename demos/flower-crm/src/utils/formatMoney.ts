/** Парсинг денежной строки API (запятая или точка). */
export function parseAmount(s: string): number {
  const n = Number.parseFloat(String(s).replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

export function formatRub(amountStr: string, maximumFractionDigits = 0): string {
  const n = parseAmount(amountStr)
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits,
    minimumFractionDigits: maximumFractionDigits > 0 ? 2 : 0,
  }).format(maximumFractionDigits > 0 ? n : Math.round(n))
}

/** Сумма в рублях с копейками (строки итога в модалках). */
export function formatRubFixed2(n: number): string {
  return `${n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽`
}

export function formatRubNumber(n: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits,
    minimumFractionDigits: maximumFractionDigits > 0 ? 2 : 0,
  }).format(maximumFractionDigits > 0 ? n : Math.round(n))
}

export function formatRubBriefFromString(s: string | undefined | null): string {
  if (s == null || s === '') return '—'
  return formatRubNumber(parseAmount(s))
}

export function formatPct(n: number): string {
  return `${n.toLocaleString('ru-RU', { maximumFractionDigits: 1, minimumFractionDigits: 0 })}%`
}

export function formatQty(n: number): string {
  return n.toLocaleString('ru-RU')
}
