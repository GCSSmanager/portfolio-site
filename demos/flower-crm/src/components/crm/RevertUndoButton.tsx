import { useEffect, useState, type CSSProperties } from 'react'
import { UNDO_FADE_MS, UNDO_REVERT_SECONDS } from './stock/constants'

type Props = {
  deadlineIso: string
  busy: boolean
  title: string
  ariaLabel: string
  onRevert: () => void
  onWindowClosed?: () => void | Promise<void>
  className?: string
}

export function RevertUndoButton({
  deadlineIso,
  busy,
  title,
  ariaLabel,
  onRevert,
  onWindowClosed,
  className,
}: Props) {
  const [, setTick] = useState(0)
  const [fadePhase, setFadePhase] = useState<'live' | 'fading' | 'gone'>('live')

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 250)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    setFadePhase('live')
  }, [deadlineIso])

  const deadlineMs = Date.parse(deadlineIso)
  const remainMs = Number.isFinite(deadlineMs) ? Math.max(0, deadlineMs - Date.now()) : 0
  const secShown = Math.min(UNDO_REVERT_SECONDS, Math.ceil(remainMs / 1000))
  const windowMs = UNDO_REVERT_SECONDS * 1000
  const progress = remainMs > 0 ? Math.min(1, remainMs / windowMs) : 0

  useEffect(() => {
    if (fadePhase !== 'live') return
    if (remainMs <= 0) {
      setFadePhase('fading')
    }
  }, [remainMs, fadePhase])

  useEffect(() => {
    if (fadePhase !== 'fading') return
    const tid = window.setTimeout(() => {
      setFadePhase('gone')
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          void Promise.resolve(onWindowClosed?.())
        })
      })
    }, UNDO_FADE_MS)
    return () => clearTimeout(tid)
  }, [fadePhase, onWindowClosed])

  const fillStyle = {
    '--undo-p': progress,
  } as CSSProperties

  if (!Number.isFinite(deadlineMs)) {
    return null
  }

  if (fadePhase === 'gone') {
    return (
      <span
        className={['crm-date-revert', 'crm-date-revert--undo', className, 'crm-date-revert--gone-placeholder']
          .filter(Boolean)
          .join(' ')}
        aria-hidden
      />
    )
  }

  const interactive = fadePhase === 'live' && remainMs > 0

  return (
    <button
      type="button"
      className={['crm-date-revert', 'crm-date-revert--undo', className, fadePhase === 'fading' ? 'crm-date-revert--fading-out' : '']
        .filter(Boolean)
        .join(' ')}
      disabled={busy}
      title={interactive ? title : 'Время на откат истекло'}
      aria-label={ariaLabel}
      aria-disabled={!interactive}
      tabIndex={interactive ? undefined : -1}
      onClick={() => interactive && !busy && onRevert()}
    >
      <span className="crm-date-revert__glyph-stack">
        <span className="crm-date-revert__glyph crm-date-revert__glyph--track" aria-hidden>
          ↺
        </span>
        <span className="crm-date-revert__glyph crm-date-revert__glyph--fill" aria-hidden style={fillStyle}>
          ↺
        </span>
        <span className="crm-date-revert__digit" aria-hidden>
          {secShown}
        </span>
      </span>
    </button>
  )
}
