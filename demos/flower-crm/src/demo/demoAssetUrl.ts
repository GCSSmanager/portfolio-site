/** Путь к файлу из `public/` с учётом Vite base (`/crm/demo/flower/` в prod). */
export function demoAssetUrl(relativePath: string): string {
  const base = import.meta.env.BASE_URL || '/'
  const path = relativePath.replace(/^\//, '')
  return `${base}${path}`
}

export function photoUrlFromPath(path: string | null | undefined): string | null {
  if (path == null || !String(path).trim()) return null
  return demoAssetUrl(String(path).trim())
}
