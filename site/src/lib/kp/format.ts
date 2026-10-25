export function todayISO() {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

export function formatDate(iso: string) {
  if (!iso) return ''
  const [y, m, day] = iso.split('-')
  return `${day}.${m}.${y}`
}

export function parsePrice(value: string) {
  const digits = String(value).replace(/\D/g, '')
  return digits ? Number(digits) : 0
}

export function formatPrice(n: number) {
  return `${n.toLocaleString('ru-RU')}\u00a0₽`
}

function daysWord(n: number) {
  const mod100 = Math.abs(n) % 100
  const mod10 = mod100 % 10
  if (mod100 > 10 && mod100 < 20) return 'дней'
  if (mod10 === 1) return 'день'
  if (mod10 >= 2 && mod10 <= 4) return 'дня'
  return 'дней'
}

export function formatDays(n: number) {
  return n ? `${n} ${daysWord(n)}` : '—'
}

export function formatWorkDays(n: number) {
  if (!n) return '—'
  const word = daysWord(n)
  if (word === 'день') return `${n} рабочий день`
  if (word === 'дня') return `${n} рабочих дня`
  return `${n} рабочих дней`
}

export function lines(text: string) {
  return String(text)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}
