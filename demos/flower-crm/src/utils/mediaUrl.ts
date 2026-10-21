/** URL картинки с бэкенда (/media/… или абсолютный) — для dev через proxy Vite. */
export function mediaUrl(raw: string | null | undefined): string | null {
  if (raw == null) return null
  const s = raw.trim()
  if (!s) return null
  if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('data:')) return s
  const base = import.meta.env.BASE_URL || '/'
  const normBase = base.endsWith('/') ? base : `${base}/`
  if (base !== '/' && (s.startsWith(normBase) || s.startsWith(base))) return s
  if (s.startsWith('/')) {
    const withoutLead = s.slice(1)
    if (base !== '/' && !withoutLead.startsWith('crm/')) return `${normBase}${withoutLead}`
    return s
  }
  return `${normBase}${s.replace(/^\//, '')}`
}
