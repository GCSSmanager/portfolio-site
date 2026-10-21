export function lastCareIso(
  lastTrimAt: string | null | undefined,
  lastWaterAt: string | null | undefined,
): string | null {
  const a = lastTrimAt ?? null
  const b = lastWaterAt ?? null
  if (!a) return b
  if (!b) return a
  return Date.parse(a) >= Date.parse(b) ? a : b
}

export function formatWhenCompact(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
