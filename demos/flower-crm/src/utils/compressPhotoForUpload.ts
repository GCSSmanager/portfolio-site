/** Макс. сторона после сжатия (иконки в UI до ~120 px, 512 px с запасом под retina). */
export const PHOTO_UPLOAD_MAX_EDGE = 512

const JPEG_QUALITY = 0.82
/** Уже маленький JPEG — не перекодируем. */
const SKIP_IF_BYTES = 280_000

function scaledSize(width: number, height: number, maxEdge: number): { w: number; h: number } {
  const edge = Math.max(width, height)
  if (edge <= maxEdge) return { w: width, h: height }
  const scale = maxEdge / edge
  return { w: Math.round(width * scale), h: Math.round(height * scale) }
}

function outputName(original: string): string {
  const base = original.replace(/\.[^./\\]+$/, '').trim() || 'photo'
  return `${base}.jpg`
}

/**
 * Сжимает фото перед upload: до 512 px по длинной стороне, JPEG ~80%.
 * HEIC/WebP с iPhone тоже конвертируются (через canvas в Safari).
 */
export async function compressPhotoForUpload(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) {
    return file
  }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return file
  }

  try {
    const { width, height } = bitmap
    if (
      width <= PHOTO_UPLOAD_MAX_EDGE &&
      height <= PHOTO_UPLOAD_MAX_EDGE &&
      file.size <= SKIP_IF_BYTES &&
      (file.type === 'image/jpeg' || file.type === 'image/pjpeg')
    ) {
      return file
    }

    const { w, h } = scaledSize(width, height, PHOTO_UPLOAD_MAX_EDGE)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return file
    }
    ctx.drawImage(bitmap, 0, 0, w, h)

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
    })
    if (!blob) {
      return file
    }

    return new File([blob], outputName(file.name), {
      type: 'image/jpeg',
      lastModified: Date.now(),
    })
  } finally {
    bitmap.close()
  }
}
