/** Локальный календарный день YYYY-MM-DD (как django localdate). */
export function calendarDayFromDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseCalendarDay(iso: string): Date {
  return new Date(`${iso.slice(0, 10)}T12:00:00`)
}

export function addCalendarDaysLocal(iso: string, delta: number): string {
  const d = parseCalendarDay(iso)
  d.setDate(d.getDate() + delta)
  return calendarDayFromDate(d)
}
