import type { ReactNode } from 'react'

import { DeferredSendCountdownButton } from './DeferredSendCountdownButton'

type Props = {
  sendAt: number | null
  onSendAtChange: (v: number | null) => void
  /** Класс для круга ↺ (как у crm-date-revert--slot). */
  countdownClassName?: string
  children: ReactNode
}

/** Шаблон: иконка-действие → 5 с ↺ → PATCH; клик по ↺ отменяет (без второго серверного отката). */
export function StockCareDeferControl({ sendAt, onSendAtChange, countdownClassName, children }: Props) {
  if (sendAt != null) {
    return (
      <DeferredSendCountdownButton
        deadlineMs={sendAt}
        onCancel={() => onSendAtChange(null)}
        className={countdownClassName ?? 'crm-date-revert--slot'}
      />
    )
  }
  return <>{children}</>
}
