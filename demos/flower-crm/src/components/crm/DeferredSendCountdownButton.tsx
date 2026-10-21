import { useEffect, useState, type CSSProperties } from 'react'

import { UNDO_REVERT_SECONDS } from './stock/constants'

type Props = {
  /** Момент отправки PATCH (timestamp ms). */
  deadlineMs: number
  /** Клик по кнопке до дедлайна — отменить отправку (без запроса). */
  onCancel: () => void
  className?: string
}

/** Тот же визуал, что у отката ↺: круг, стрелка, цифра секунд; иконка действия заменяется этим контролом. */
export function DeferredSendCountdownButton({ deadlineMs, onCancel, className }: Props) {
  const [, setTick] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 250)
    return () => window.clearInterval(id)
  }, [])

  const remainMs = Math.max(0, deadlineMs - Date.now())
  const windowMs = UNDO_REVERT_SECONDS * 1000
  const progress = remainMs > 0 ? Math.min(1, remainMs / windowMs) : 0
  const secShown = Math.min(UNDO_REVERT_SECONDS, Math.ceil(remainMs / 1000))
  const fillStyle = { '--undo-p': progress } as CSSProperties
  const interactive = remainMs > 0

  return (
    <button
      type="button"
      className={['crm-date-revert', 'crm-date-revert--undo', className].filter(Boolean).join(' ')}
      title={interactive ? 'Нажмите, чтобы не отправлять на сервер' : 'Отправка на сервер…'}
      aria-label="Отменить отложенную отправку на сервер"
      aria-disabled={!interactive}
      tabIndex={interactive ? undefined : -1}
      onClick={() => interactive && onCancel()}
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
