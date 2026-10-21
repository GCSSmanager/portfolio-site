import type { CSSProperties } from 'react'

export type DecorVariant = 'sprig' | 'bloom' | 'eucalyptus' | 'tulip' | 'branch'

export function LandingDecor({
  variant,
  className,
  style,
  lime,
}: {
  variant: DecorVariant
  className?: string
  style?: CSSProperties
  lime?: boolean
}) {
  return (
    <img
      className={`lp-decor${lime ? ' lp-decor--lime' : ''}${className ? ` ${className}` : ''}`}
      style={style}
      src={`/landing/decor/${variant}.svg`}
      alt=""
      aria-hidden
      loading="lazy"
      decoding="async"
    />
  )
}
