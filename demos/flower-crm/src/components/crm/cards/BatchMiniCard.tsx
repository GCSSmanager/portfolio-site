import { useEffect, useRef, useState } from 'react'
import { CrmButton } from '../../ui/CrmButton'
import type { CatalogNavState } from '../../../utils/catalogNav'
import {
  IconCareSheet,
  IconDrop,
  IconIntakeBox,
  IconScissors,
  IconSprout,
  IconWaste,
  StockCareDeferControl,
  formatWhenCompact,
  lastCareIso,
  stockActionKey,
} from '..'
import { UNDO_REVERT_SECONDS } from '../stock/constants'
import type { BatchPatchAction, BatchRow } from '../stock/types'

const DEFER_MS = UNDO_REVERT_SECONDS * 1000

type Props = {
  row: BatchRow
  busy: boolean
  /** Режим склада API: `basic` | `advanced` — отложенная отправка ухода/приёмки в обоих. */
  warehouseMode?: string
  catalogFlowerNav: CatalogNavState
  onPatch: (action: BatchPatchAction) => void | Promise<void>
  /** Владелец: открыть списание по этой строке склада. */
  showStockDiscard?: boolean
  onRequestStockDiscard?: () => void
}

export function BatchMiniCard({
  row,
  busy,
  warehouseMode,
  catalogFlowerNav,
  onPatch,
  showStockDiscard = false,
  onRequestStockDiscard,
}: Props) {
  const intake = Boolean(row.intake_pending)
  const basicMergedUi = row.line_kind === 'basic' && warehouseMode === 'basic'
  const varietyMergedUi = row.line_kind === 'basic' && warehouseMode === 'variety'
  const mergedUi = basicMergedUi || varietyMergedUi
  /** Объединённый ряд (базовый / по видам) или продвинутый — отложенный PATCH ухода/приёмки. */
  const deferCarePatches = mergedUi || warehouseMode === 'advanced'
  const needsCareTrim = Boolean(row.care_needs_trim)
  const needsCareWater = Boolean(row.care_needs_water)
  /** Базовый: общий уход. По видам: тот же один «Уход», но порог — подрезка или вода по каталогу. */
  const needsMergedCareAction = basicMergedUi
    ? needsCareTrim
    : varietyMergedUi
      ? needsCareTrim || needsCareWater
      : false
  const articleClasses = ['crm-card-mini']
  if (intake) {
    articleClasses.push('crm-card-mini--intake')
  } else if (varietyMergedUi && needsMergedCareAction) {
    articleClasses.push('crm-card-mini--care-trim')
  } else if (needsCareTrim && needsCareWater) {
    articleClasses.push('crm-card-mini--care-both')
  } else if (needsCareTrim) {
    articleClasses.push('crm-card-mini--care-trim')
  } else if (needsCareWater) {
    articleClasses.push('crm-card-mini--care-water')
  }
  const articleClass = articleClasses.join(' ')
  const datesStackClass =
    basicMergedUi || varietyMergedUi
      ? 'crm-card-mini__dates crm-card-mini__dates--stack crm-card-mini__dates--basic-one'
      : 'crm-card-mini__dates crm-card-mini__dates--stack crm-card-mini__dates--three'

  const [intakeSendAt, setIntakeSendAt] = useState<number | null>(null)
  const [waterSendAt, setWaterSendAt] = useState<number | null>(null)
  const [trimSendAt, setTrimSendAt] = useState<number | null>(null)
  const onPatchRef = useRef(onPatch)
  onPatchRef.current = onPatch

  useEffect(() => {
    if (!deferCarePatches) {
      setIntakeSendAt(null)
      setWaterSendAt(null)
      setTrimSendAt(null)
    }
  }, [deferCarePatches])

  useEffect(() => {
    if (!deferCarePatches || intakeSendAt == null) return
    const ms = Math.max(0, intakeSendAt - Date.now())
    const id = window.setTimeout(() => {
      setIntakeSendAt(null)
      void Promise.resolve(onPatchRef.current('intake_done'))
    }, ms)
    return () => window.clearTimeout(id)
  }, [deferCarePatches, intakeSendAt])

  useEffect(() => {
    if (!deferCarePatches || waterSendAt == null) return
    const ms = Math.max(0, waterSendAt - Date.now())
    const id = window.setTimeout(() => {
      setWaterSendAt(null)
      void Promise.resolve(onPatchRef.current('water_now'))
    }, ms)
    return () => window.clearTimeout(id)
  }, [deferCarePatches, waterSendAt])

  useEffect(() => {
    if (!deferCarePatches || trimSendAt == null) return
    const ms = Math.max(0, trimSendAt - Date.now())
    const id = window.setTimeout(() => {
      setTrimSendAt(null)
      void Promise.resolve(onPatchRef.current('trim_now'))
    }, ms)
    return () => window.clearTimeout(id)
  }, [deferCarePatches, trimSendAt])

  const startIntakeDeferred = () => {
    if (!deferCarePatches) return
    setIntakeSendAt((p) => p ?? Date.now() + DEFER_MS)
  }
  const startWaterDeferred = () => {
    if (!deferCarePatches) return
    setWaterSendAt((p) => p ?? Date.now() + DEFER_MS)
  }
  const startTrimDeferred = () => {
    if (!deferCarePatches) return
    setTrimSendAt((p) => p ?? Date.now() + DEFER_MS)
  }

  const intakeActDisabled = busy || intakeSendAt != null
  const waterActDisabled = busy || waterSendAt != null
  const trimActDisabled = busy || trimSendAt != null

  return (
    <article id={`crm-batch-${stockActionKey(row).replace(/:/g, '-')}`} className={articleClass}>
      <div className="crm-card-mini__main">
        <div className="crm-card-mini__body">
          <div className="crm-card-mini__meta">
            <span className="crm-card-mini__id">#{row.id}</span>
            <span className="crm-card-mini__meta-tags">
              <span className="crm-card-mini__rank">{row.rank_label}</span>
              {(row.realization_quantity ?? 0) > 0 ? (
                <span className="crm-card-mini__realization">
                  Реализация · {row.realization_quantity} шт
                </span>
              ) : null}
            </span>
          </div>
          <h3 className="crm-card-mini__name">{row.display_name}</h3>
          <p className="crm-card-mini__latin">{row.latin_name}</p>
          {mergedUi && !intake ? (
            <p className="crm-card-mini__recv" title="Последний уход (подрезка и вода)">
              Последний уход · {formatWhenCompact(lastCareIso(row.last_trim_at, row.last_water_change_at))}
            </p>
          ) : null}
        </div>
        <div className="crm-card-mini__aside">
          <div className="crm-card-mini__qty">
            <strong>{row.quantity}</strong>
            <span>шт</span>
          </div>
          <div className="crm-card-mini__acts" role="group" aria-label="Действия">
            <CrmButton
              to={
                row.store_flower_id != null
                  ? `/warehouse/flowers/${row.store_flower_id}`
                  : row.taxon_id != null
                    ? `/flowers/${row.taxon_id}`
                    : '#'
              }
              linkState={catalogFlowerNav}
              variant="iconAct"
              iconTone="care"
              title="Карточка"
              aria-label="Карточка таксона"
            >
              <IconCareSheet />
            </CrmButton>
            {showStockDiscard && row.quantity > 0 && onRequestStockDiscard ? (
              <CrmButton
                variant="iconAct"
                iconTone="discard"
                disabled={busy}
                title="Списание со склада"
                aria-label="Списание со склада"
                onClick={() => onRequestStockDiscard()}
              >
                <IconWaste />
              </CrmButton>
            ) : null}
          </div>
        </div>
      </div>
      <div className={datesStackClass}>
        {basicMergedUi || varietyMergedUi ? (
          <div
            className="crm-card-mini__stack-row"
            title={
              row.intake_pending
                ? 'Приёмка'
                : varietyMergedUi
                  ? 'Уход по правилам каталога для этого вида'
                  : 'Уход по графику магазина'
            }
          >
            {row.intake_pending ? (
              <>
                <span className="crm-card-mini__cell-lab">Приёмка</span>
                <div className="crm-card-mini__cell-val crm-card-mini__cell-val--intake">
                  <span className="crm-card-mini__action-slot crm-card-mini__action-slot--intake-wide">
                    <StockCareDeferControl sendAt={intakeSendAt} onSendAtChange={setIntakeSendAt}>
                      <CrmButton
                        variant="intake"
                        className="crm-btn--row crm-btn--icon-cell crm-btn--intake-box"
                        disabled={intakeActDisabled}
                        title="Подрезка и смена воды — сейчас (отметить приёмку)"
                        aria-label="Отметить приёмку"
                        onClick={startIntakeDeferred}
                      >
                        <IconIntakeBox />
                      </CrmButton>
                    </StockCareDeferControl>
                  </span>
                </div>
              </>
            ) : (
              <>
                <span className="crm-card-mini__cell-lab">Уход:</span>
                <div className="crm-card-mini__cell-val crm-card-mini__cell-val--basic-care">
                  {needsMergedCareAction ? (
                    <span className="crm-card-mini__action-slot crm-card-mini__action-slot--intake-wide">
                      <StockCareDeferControl sendAt={trimSendAt} onSendAtChange={setTrimSendAt}>
                        <CrmButton
                          variant="basicCare"
                          iconOnly
                          disabled={trimActDisabled}
                          title={
                            varietyMergedUi
                              ? 'Подрезка и смена воды по графику этого вида'
                              : 'Подрезка и смена воды для этого вида в день общего ухода'
                          }
                          aria-label="Отметить уход"
                          onClick={startTrimDeferred}
                        >
                          <IconSprout />
                        </CrmButton>
                      </StockCareDeferControl>
                    </span>
                  ) : (
                    <span className="crm-card-mini__time" title="Последний уход (подрезка и вода)">
                      {formatWhenCompact(lastCareIso(row.last_trim_at, row.last_water_change_at))}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="crm-card-mini__stack-row" title="Когда поступила партия">
              <span className="crm-card-mini__cell-lab">Приход</span>
              <div className="crm-card-mini__cell-val crm-card-mini__cell-val--intake">
                {row.intake_pending ? (
                  <span className="crm-card-mini__action-slot crm-card-mini__action-slot--intake-wide">
                    <StockCareDeferControl sendAt={intakeSendAt} onSendAtChange={setIntakeSendAt}>
                      <CrmButton
                        variant="intake"
                        className="crm-btn--row crm-btn--icon-cell crm-btn--intake-box"
                        disabled={intakeActDisabled}
                        title="Подрезка и смена воды — сейчас (отметить приёмку)"
                        aria-label="Отметить приёмку"
                        onClick={startIntakeDeferred}
                      >
                        <IconIntakeBox />
                      </CrmButton>
                    </StockCareDeferControl>
                  </span>
                ) : null}
                <span className="crm-card-mini__time">{formatWhenCompact(row.received_at)}</span>
              </div>
            </div>

            <div className="crm-card-mini__stack-row" title="Последняя смена воды">
              <span className="crm-card-mini__cell-lab">Вода</span>
              <div className="crm-card-mini__cell-val">
                {row.intake_pending ? (
                  <span className="crm-card-mini__time">—</span>
                ) : (
                  <>
                    <span className="crm-card-mini__action-slot">
                      <StockCareDeferControl sendAt={waterSendAt} onSendAtChange={setWaterSendAt}>
                        <CrmButton
                          variant="iconAct"
                          iconTone="water"
                          className="crm-btn--row"
                          disabled={waterActDisabled}
                          title="Вода сейчас"
                          aria-label="Сменить воду"
                          onClick={startWaterDeferred}
                        >
                          <IconDrop />
                        </CrmButton>
                      </StockCareDeferControl>
                    </span>
                    <span className="crm-card-mini__time">{formatWhenCompact(row.last_water_change_at)}</span>
                  </>
                )}
              </div>
            </div>
            <div className="crm-card-mini__stack-row" title="Последняя подрезка">
              <span className="crm-card-mini__cell-lab">Подрезка</span>
              <div className="crm-card-mini__cell-val">
                {row.intake_pending ? (
                  <span className="crm-card-mini__time">—</span>
                ) : (
                  <>
                    <span className="crm-card-mini__action-slot">
                      <StockCareDeferControl sendAt={trimSendAt} onSendAtChange={setTrimSendAt}>
                        <CrmButton
                          variant="iconAct"
                          iconTone="trim"
                          className="crm-btn--row"
                          disabled={trimActDisabled}
                          title="Подрезка сейчас"
                          aria-label="Подрезка сейчас"
                          onClick={startTrimDeferred}
                        >
                          <IconScissors />
                        </CrmButton>
                      </StockCareDeferControl>
                    </span>
                    <span className="crm-card-mini__time">{formatWhenCompact(row.last_trim_at)}</span>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </article>
  )
}
