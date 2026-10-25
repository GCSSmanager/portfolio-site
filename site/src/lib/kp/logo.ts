let cached: string | null = null

/** PNG data URL for pdfmake (WebP is converted via canvas). */
export async function loadKpLogoDataUrl(): Promise<string | null> {
  if (cached) return cached
  try {
    const response = await fetch('/assets/gcss-logo.webp')
    const blob = await response.blob()
    const bitmap = await createImageBitmap(blob)
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(bitmap, 0, 0)
    cached = canvas.toDataURL('image/png')
    return cached
  } catch {
    return null
  }
}
