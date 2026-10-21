import { type ReactNode } from 'react'
import type { DemoTipSlide } from './types'
import { DemoMediaFrame } from './DemoMediaFrame'

interface Props {
  slides: DemoTipSlide[]
  index: number
}

export function DemoSlideCarousel({ slides, index }: Props) {
  const slide = slides[index] ?? slides[0]
  if (!slide) return null

  const showMedia = slide.media && slide.media.kind !== 'none'

  return (
    <div>
      <h2 className="demo-tip-slide-headline">{slide.headline}</h2>
      {slide.pitch ? <p className="demo-tip-slide-pitch">{slide.pitch}</p> : null}
      {showMedia ? <DemoMediaFrame media={slide.media} /> : null}
    </div>
  )
}

export function DemoSlideNav({
  index,
  total,
  onPrev,
  onNext,
}: {
  index: number
  total: number
  onPrev: () => void
  onNext: () => void
}) {
  if (total <= 1) return null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <NavButton label="Предыдущий слайд" onClick={onPrev}>
        <Chevron dir="left" />
      </NavButton>
      <div style={{ minWidth: '2.75rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: 600 }}>
        {index + 1}/{total}
      </div>
      <NavButton label="Следующий слайд" onClick={onNext}>
        <Chevron dir="right" />
      </NavButton>
    </div>
  )
}

function NavButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        width: '2.25rem',
        height: '2.25rem',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '999px',
        border: '1px solid var(--fc-line)',
        background: 'var(--fc-surface)',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  const isLeft = dir === 'left'
  return (
    <svg viewBox="0 0 16 16" width={16} height={16} aria-hidden="true">
      <path
        d={isLeft ? 'M10.5 3.5 5.5 8l5 4.5' : 'M5.5 3.5 10.5 8l-5 4.5'}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
