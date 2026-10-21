export function moneyStr(n: number | string): string {
  const v = typeof n === 'number' ? n : parseFloat(String(n))
  if (!Number.isFinite(v)) return '0.00'
  return v.toFixed(2)
}

export function parseMoney(raw: unknown): number | null {
  if (raw == null || raw === '') return null
  const s = String(raw).replace(/\s/g, '').replace(',', '.')
  const v = parseFloat(s)
  if (!Number.isFinite(v)) return null
  return Math.round(v * 100) / 100
}

export function decAdd(a: number, b: number): number {
  return Math.round((a + b) * 100) / 100
}
