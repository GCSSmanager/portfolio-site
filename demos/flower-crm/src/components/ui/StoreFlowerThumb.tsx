import { useEffect, useState } from 'react'
import { mediaUrl } from '../../utils/mediaUrl'
import {
  productPlaceholderEmoji,
  productPlaceholderUrl,
  type ProductPlaceholderKind,
} from '../../utils/flowerPlaceholder'

type Props = {
  url?: string | null
  alt?: string
  size?: number
  className?: string
  /** Плейсхолдер, если нет фото: цветок, букет или товар без срока. */
  variant?: 'flower' | 'retail' | 'bouquet' | 'consumable'
}

export function StoreFlowerThumb({
  url,
  alt = '',
  size = 36,
  className,
  variant = 'flower',
}: Props) {
  const kind: ProductPlaceholderKind = variant
  const fallbackSrc = productPlaceholderUrl(kind)
  const resolved = mediaUrl(url)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    setFailed(false)
  }, [url, variant])
  const cls = ['store-flower-thumb', className].filter(Boolean).join(' ')

  const imgSrc = !resolved || failed ? fallbackSrc : resolved

  if (failed && !fallbackSrc) {
    return (
      <div
        className={`${cls} store-flower-thumb--empty store-flower-thumb--${variant}`}
        style={{
          width: size,
          height: size,
          fontSize: Math.max(16, Math.round(size * 0.5)),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        aria-hidden
      >
        {productPlaceholderEmoji(kind)}
      </div>
    )
  }

  return (
    <img
      className={cls}
      src={imgSrc}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}
