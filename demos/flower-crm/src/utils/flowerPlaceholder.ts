import { mediaUrl } from './mediaUrl'

/** Плейсхолдер-иллюстрация, если у цветка нет своего фото (файл в `public/`). */
export const FLOWER_ART_PLACEHOLDER = '/flower-art-placeholder.webp'

/** Плейсщolder для товара без срока (открытки, подарки и т.п.). */
export const RETAIL_PRODUCT_PLACEHOLDER = '/retail-product-placeholder.webp'

/** Плейсхолдер для собранного букета без своего фото. */
export const BOUQUET_PLACEHOLDER = '/bouquet-placeholder.webp'

/** Плейсхолдер для расходника (лента, крафт, упаковка). */
export const CONSUMABLE_PLACEHOLDER = '/consumable-placeholder.webp'

export type ProductPlaceholderKind = 'flower' | 'retail' | 'bouquet' | 'consumable' | 'custom_bouquet'

/** Эмодзи-плейсхолдер без фото — как в разделе «Продажи». */
export function productPlaceholderEmoji(kind: ProductPlaceholderKind): string {
  switch (kind) {
    case 'bouquet':
      return '💐'
    case 'custom_bouquet':
      return '✂️'
    case 'retail':
      return '🎁'
    case 'consumable':
      return '📦'
    default:
      return '🌸'
  }
}

const PLACEHOLDER_PATH: Record<ProductPlaceholderKind, string> = {
  flower: FLOWER_ART_PLACEHOLDER,
  retail: RETAIL_PRODUCT_PLACEHOLDER,
  bouquet: BOUQUET_PLACEHOLDER,
  custom_bouquet: BOUQUET_PLACEHOLDER,
  consumable: CONSUMABLE_PLACEHOLDER,
}

/** WebP-иллюстрация по умолчанию для категории (с учётом Vite base). */
export function productPlaceholderUrl(kind: ProductPlaceholderKind = 'flower'): string {
  const path = PLACEHOLDER_PATH[kind]
  return mediaUrl(path) ?? path
}
