import { useEffect, useRef, useState } from 'react'
import { IconTaskCheck, StockCareDeferControl } from '..'
import { CrmButton } from '../../ui/CrmButton'
import { UNDO_REVERT_SECONDS } from '../stock/constants'
import type { HomeCustomTaskRow } from '../stock/types'

const DEFER_MS = UNDO_REVERT_SECONDS * 1000

type Props = {
  task: HomeCustomTaskRow
  busy?: boolean
  onComplete?: (taskId: number) => void | Promise<void>
}

export function HomeCustomTaskCard({ task, busy = false, onComplete }: Props) {
  const [doneSendAt, setDoneSendAt] = useState<number | null>(null)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    if (doneSendAt == null) return
    const ms = Math.max(0, doneSendAt - Date.now())
    const id = window.setTimeout(() => {
      setDoneSendAt(null)
      void Promise.resolve(onCompleteRef.current?.(task.id))
    }, ms)
    return () => window.clearTimeout(id)
  }, [doneSendAt, task.id])

  return (
    <article
      className="crm-card-mini crm-card-mini--custom-task"
      id={`crm-home-custom-task-${task.id}`}
    >
      <div className="crm-card-mini__main">
        <div className="crm-card-mini__body">
          <div className="crm-card-mini__meta">
            <span className="crm-card-mini__id">Задача</span>
            <span className="crm-card-mini__rank">{task.schedule_label}</span>
          </div>
          <h3 className="crm-card-mini__name">{task.name}</h3>
          {task.note ? <p className="crm-card-mini__latin">{task.note}</p> : null}
        </div>
      </div>
      {onComplete ? (
        <div className="crm-card-mini__dates crm-card-mini__dates--stack crm-card-mini__dates--intake-only">
          <div className="crm-card-mini__stack-row" title="Отметить выполненной">
            <span className="crm-card-mini__cell-lab">Готово</span>
            <div className="crm-card-mini__cell-val crm-card-mini__cell-val--intake">
              <span className="crm-card-mini__action-slot crm-card-mini__action-slot--intake-wide">
                <StockCareDeferControl sendAt={doneSendAt} onSendAtChange={setDoneSendAt}>
                  <CrmButton
                    variant="intake"
                    className="crm-btn--row crm-btn--icon-cell crm-btn--task-done"
                    disabled={busy || doneSendAt != null}
                    title="Выполнено (5 с до сохранения)"
                    aria-label={`Отметить задачу «${task.name}» выполненной`}
                    onClick={() => setDoneSendAt((p) => p ?? Date.now() + DEFER_MS)}
                  >
                    <IconTaskCheck />
                  </CrmButton>
                </StockCareDeferControl>
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  )
}
