export const DEFAULT_REPORT_DAYS = 90
export const MAX_REPORT_DAYS = 365

export type ReportPeriodRange = {
  from: string
  to: string
}

export function localTodayIso(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addDaysIso(iso: string, delta: number): string {
  const d = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  d.setDate(d.getDate() + delta)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function defaultReportPeriod(): ReportPeriodRange {
  const to = localTodayIso()
  const from = addDaysIso(to, -(DEFAULT_REPORT_DAYS - 1))
  return { from, to }
}

export function rawInclusiveDayCount(from: string, to: string): number {
  const a = new Date(`${from}T12:00:00`)
  const b = new Date(`${to}T12:00:00`)
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return DEFAULT_REPORT_DAYS
  const diff = Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1
  return Math.max(1, diff)
}

export function inclusiveDayCount(from: string, to: string): number {
  return Math.min(rawInclusiveDayCount(from, to), MAX_REPORT_DAYS)
}

export function clampReportPeriod(range: ReportPeriodRange): ReportPeriodRange {
  const today = localTodayIso()
  let { from, to } = range
  if (to > today) to = today
  if (from > to) from = to
  let days = inclusiveDayCount(from, to)
  if (days > MAX_REPORT_DAYS) {
    from = addDaysIso(to, -(MAX_REPORT_DAYS - 1))
    days = MAX_REPORT_DAYS
  }
  return { from, to }
}

export function periodQueryString(range: ReportPeriodRange): string {
  const { from, to } = clampReportPeriod(range)
  return `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
}

export function formatPeriodRu(from: string, to: string): string {
  const fmt = (iso: string) => {
    const d = new Date(`${iso}T12:00:00`)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }
  return `${fmt(from)} — ${fmt(to)}`
}

export function periodSubtitle(range: ReportPeriodRange): string {
  const { from, to } = clampReportPeriod(range)
  const days = rawInclusiveDayCount(from, to)
  return `${days} ${daysLabel(days)}: ${formatPeriodRu(from, to)}`
}

/** Сообщение, если выбранный период обрезан (лимит, будущее, порядок дат). */
export function periodClampNotice(requested: ReportPeriodRange): string | null {
  const today = localTodayIso()
  let { from, to } = requested
  if (from > to) [from, to] = [to, from]
  const requestedDays = rawInclusiveDayCount(from, to)
  const clamped = clampReportPeriod(requested)
  const parts: string[] = []

  if (requested.to > today) {
    parts.push('конец периода не позже сегодня')
  }
  if (requestedDays > MAX_REPORT_DAYS) {
    parts.push(
      `выбрано ${requestedDays} ${daysLabel(requestedDays)}, максимум ${MAX_REPORT_DAYS} — показано ${formatPeriodRu(clamped.from, clamped.to)}`,
    )
  } else if (clamped.from !== from || clamped.to !== to) {
    parts.push(`показано ${formatPeriodRu(clamped.from, clamped.to)}`)
  }

  if (parts.length === 0) return null
  return parts.join('; ')
}

function daysLabel(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'день'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'дня'
  return 'дней'
}

export function lastNDaysPeriod(n: number): ReportPeriodRange {
  const to = localTodayIso()
  const from = addDaysIso(to, -(Math.max(1, Math.min(n, MAX_REPORT_DAYS)) - 1))
  return clampReportPeriod({ from, to })
}

function tickFractions(n: number, slots: number): number[] {
  const idxs = Array.from({ length: slots + 1 }, (_, k) => Math.round((k * (n - 1)) / slots))
  return [...new Set(idxs)].sort((a, b) => a - b)
}

/** Подписи оси X через один день (0, 2, 4, … + последний). */
export function chartXTickIndicesEveryOther(pointCount: number): number[] {
  const n = pointCount
  if (n <= 0) return []
  if (n === 1) return [0]
  const indices: number[] = []
  for (let i = 0; i < n; i += 2) {
    indices.push(i)
  }
  const last = n - 1
  const tail = indices[indices.length - 1]!
  if (tail === last) return indices
  if (last - tail === 1) {
    indices.pop()
  }
  indices.push(last)
  return indices
}

/** Больше подписей оси X — для прокручиваемого графика на узком экране. */
export function chartXTickIndicesDense(pointCount: number): number[] {
  const n = pointCount
  if (n <= 0) return []
  if (n === 1) return [0]
  if (n <= 7) return Array.from({ length: n }, (_, i) => i)
  const slots = Math.min(n - 1, Math.max(10, Math.ceil(n / 2)))
  return tickFractions(n, slots)
}

/** Подписи оси X графика: число меток зависит от длины периода. */
export function chartXTickIndices(pointCount: number): number[] {
  const n = pointCount
  if (n <= 0) return []
  if (n === 1) return [0]
  if (n <= 7) return Array.from({ length: n }, (_, i) => i)
  if (n <= 14) return tickFractions(n, 4)
  if (n <= 31) return tickFractions(n, 5)
  if (n <= 90) return tickFractions(n, 6)
  return tickFractions(n, 7)
}

/** Подпись на оси X — только цифры ДД.ММ (без названий месяцев и без года). */
export function formatChartXAxisLabel(iso: string): string {
  const d = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(d.getTime())) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim())
    return m ? `${m[3]}.${m[2]}` : iso.slice(5).replace('-', '.')
  }
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  return `${day}.${month}`
}

/** Дата в подсказке точки графика — с годом. */
export function formatChartTooltipDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
