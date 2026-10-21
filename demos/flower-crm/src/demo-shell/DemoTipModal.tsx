import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { CrmButton } from '../components/ui/CrmButton'
import { DemoMediaFrame } from './DemoMediaFrame'
import { DemoSlideCarousel, DemoSlideNav } from './DemoSlideCarousel'
import type { DemoTipContent } from './types'
import './demo-tip-modal.css'

interface Props {
  open: boolean
  tipId: string
  content: DemoTipContent
  showMute?: boolean
  muteChecked: boolean
  onMuteChange: (muted: boolean) => void
  onClose: () => void
}

export function DemoTipModal({
  open,
  tipId,
  content,
  showMute = true,
  muteChecked,
  onMuteChange,
  onClose,
}: Props) {
  const [draftMute, setDraftMute] = useState(muteChecked)

  useEffect(() => {
    if (!open) return
    const prev = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.documentElement.style.overflow = prev
    }
  }, [open])
  const [slideIndex, setSlideIndex] = useState(0)

  const slides = content.slides ?? []
  const slideCount = slides.length
  const hasSlides = slideCount > 0

  useEffect(() => {
    if (open) {
      setDraftMute(muteChecked)
      setSlideIndex(0)
    }
  }, [open, muteChecked, tipId, content])

  useEffect(() => {
    if (!open) return

    const dismiss = () => {
      if (showMute) onMuteChange(draftMute)
      onClose()
    }

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        dismiss()
        return
      }
      if (slideCount <= 1) return
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        setSlideIndex((value) => (value - 1 + slideCount) % slideCount)
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        setSlideIndex((value) => (value + 1) % slideCount)
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [open, draftMute, showMute, onMuteChange, onClose, slideCount])

  if (!open) return null

  const dismiss = () => {
    if (showMute) onMuteChange(draftMute)
    onClose()
  }

  const prev = () => setSlideIndex((value) => (value - 1 + slideCount) % slideCount)
  const next = () => setSlideIndex((value) => (value + 1) % slideCount)

  return createPortal(
    <div className="demo-tip-overlay">
      <button type="button" className="demo-tip-overlay__backdrop" aria-label="Закрыть" onClick={dismiss} />
      <div
        key={tipId}
        role="dialog"
        aria-modal="true"
        aria-labelledby="demo-tip-title"
        className={`demo-tip-dialog${hasSlides ? ' demo-tip-dialog--slides' : ''}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="demo-tip-dialog__head">
          <p className="demo-tip-dialog__kicker">Демо CRM</p>
          <h1 id="demo-tip-title" className="demo-tip-dialog__title">
            {content.title}
          </h1>
        </div>

        <div className="demo-tip-dialog__body">
          {hasSlides ? (
            <DemoSlideCarousel slides={slides} index={slideIndex} />
          ) : (
            <>
              {(content.body ?? '')
                .split(/\n\n+/)
                .map((paragraph) => paragraph.trim())
                .filter(Boolean)
                .map((paragraph) => (
                  <p key={paragraph} className="demo-tip-dialog__paragraph">
                    {paragraph}
                  </p>
                ))}
              <DemoMediaFrame media={content.media} />
            </>
          )}
        </div>

        <div className="demo-tip-dialog__foot">
          {showMute ? (
            <label className="demo-tip-dialog__mute">
              <input
                type="checkbox"
                checked={draftMute}
                onChange={(e) => setDraftMute(e.target.checked)}
              />
              Не показывать больше подсказок
            </label>
          ) : (
            <span />
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <DemoSlideNav index={slideIndex} total={slideCount} onPrev={prev} onNext={next} />
            <CrmButton type="button" variant="primary" onClick={dismiss}>
              {content.ctaLabel ?? 'Понятно'}
            </CrmButton>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
