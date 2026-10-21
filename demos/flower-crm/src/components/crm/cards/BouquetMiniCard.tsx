import { useEffect, useMemo, useRef, useState } from 'react'
import { CrmButton } from '../../ui/CrmButton'
import type { CatalogNavState } from '../../../utils/catalogNav'
import {
  IconDrop,
  IconScissors,
  IconSprout,
  IconWaste,
  StockCareDeferControl,
  formatWhenCompact,
  lastCareIso,
} from '..'
import { buildBouquetRecipeListItems } from '../../../utils/bouquetAssembleRealization'
import { UNDO_REVERT_SECONDS } from '../stock/constants'
import type { BatchPatchAction, BouquetRow } from '../stock/types'
import { BouquetRecipeList } from './BouquetRecipeList'

const DEFER_MS = UNDO_REVERT_SECONDS * 1000

type Props = {
  row: BouquetRow
  busy: boolean
  warehouseMode?: string
  catalogFlowerNav: CatalogNavState
  onPatch: (action: BatchPatchAction, batchId?: number) => void | Promise<void>
  showStockDiscard?: boolean
  onRequestStockDiscard?: () => void
}

export function BouquetMiniCard({
  row,
  busy,
  warehouseMode,
  catalogFlowerNav,
  onPatch,
  showStockDiscard = false,
  onRequestStockDiscard,
}: Props) {
  const basicMergedUi = warehouseMode === 'basic'
  const varietyMergedUi = warehouseMode === 'variety'
  const mergedUi = basicMergedUi || varietyMergedUi
  const deferCarePatches = mergedUi || warehouseMode === 'advanced'
  const needsCareTrim = Boolean(row.care_needs_trim)
  const needsCareWater = Boolean(row.care_needs_water)
  const needsMergedCareAction = basicMergedUi
    ? needsCareTrim
    : varietyMergedUi
      ? needsCareTrim || needsCareWater
      : false

  const articleClasses = ['crm-card-mini']
  if (needsCareTrim && needsCareWater) {
    articleClasses.push('crm-card-mini--care-both')
  } else if (needsCareTrim) {
    articleClasses.push('crm-card-mini--care-trim')
  } else if (needsCareWater) {
    articleClasses.push('crm-card-mini--care-water')
  }

  const datesStackClass =
    mergedUi
      ? 'crm-card-mini__dates crm-card-mini__dates--stack crm-card-mini__dates--basic-one'
      : 'crm-card-mini__dates crm-card-mini__dates--stack crm-card-mini__dates--three'

  const recipeListItems = useMemo(() => {
    const fromRecipe = buildBouquetRecipeListItems(row.recipe_lines, row.consumable_recipe_lines)
    if (fromRecipe.length > 0) return fromRecipe
    const seen = new Set<string>()
    const fallback: ReturnType<typeof buildBouquetRecipeListItems> = []
    for (const c of row.components) {
      const key = `cmp:${c.store_flower_id ?? c.taxon_id ?? c.display_name}`
      if (seen.has(key)) continue
      seen.add(key)
      fallback.push({
        key,
        label: c.display_name,
        href: c.store_flower_id
          ? `/warehouse/flowers/${c.store_flower_id}`
          : c.taxon_id
            ? `/flowers/${c.taxon_id}`
            : undefined,
      })
    }
    return fallback
  }, [row.recipe_lines, row.consumable_recipe_lines, row.components])

  const [waterSendAt, setWaterSendAt] = useState<number | null>(null)
  const [trimSendAt, setTrimSendAt] = useState<number | null>(null)
  const onPatchRef = useRef(onPatch)
  onPatchRef.current = onPatch

  useEffect(() => {
    if (!deferCarePatches) {
      setWaterSendAt(null)
      setTrimSendAt(null)
    }
  }, [deferCarePatches])

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

  const startWaterDeferred = () => {
    if (!deferCarePatches) return
    setWaterSendAt((p) => p ?? Date.now() + DEFER_MS)
  }
  const startTrimDeferred = () => {
    if (!deferCarePatches) return
    setTrimSendAt((p) => p ?? Date.now() + DEFER_MS)
  }

  const waterActDisabled = busy || waterSendAt != null
  const trimActDisabled = busy || trimSendAt != null

  return (
    <article className={articleClasses.join(' ')}>
      <div className="crm-card-mini__main">
        <div className="crm-card-mini__body">
          <div className="crm-card-mini__meta">
            <span className="crm-card-mini__rank">букет</span>
          </div>
          <h3 className="crm-card-mini__name">
            {row.name}
            {row.assembly_label ? (
              <span className="crm-card-mini__name-sub"> · {row.assembly_label}</span>
            ) : null}
          </h3>
          <BouquetRecipeList items={recipeListItems} linkState={catalogFlowerNav} />
          {mergedUi ? (
            <p className="crm-card-mini__recv" title="Последний уход (подрезка и вода)">
              Последний уход ·{' '}
              {formatWhenCompact(lastCareIso(row.last_trim_at ?? null, row.last_water_change_at ?? null))}
            </p>
          ) : null}
        </div>
        <div className="crm-card-mini__aside">
          <div className="crm-card-mini__qty">
            <strong>{row.quantity}</strong>
            <span>шт</span>
          </div>
          {showStockDiscard && row.quantity > 0 && onRequestStockDiscard ? (
            <div className="crm-card-mini__acts" role="group" aria-label="Действия">
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
            </div>
          ) : null}
        </div>
      </div>
      <div className={datesStackClass}>
        {mergedUi ? (
          <div
            className="crm-card-mini__stack-row"
            title={varietyMergedUi ? 'Уход по правилам каталога' : 'Уход по графику магазина'}
          >
            <span className="crm-card-mini__cell-lab">Уход:</span>
            <div className="crm-card-mini__cell-val crm-card-mini__cell-val--basic-care">
              {needsMergedCareAction ? (
                <span className="crm-card-mini__action-slot crm-card-mini__action-slot--intake-wide">
                  <StockCareDeferControl sendAt={trimSendAt} onSendAtChange={setTrimSendAt}>
                    <CrmButton
                      variant="basicCare"
                      iconOnly
                      disabled={trimActDisabled}
                      title="Подрезка и смена воды для букета в день общего ухода"
                      aria-label="Отметить уход"
                      onClick={startTrimDeferred}
                    >
                      <IconSprout />
                    </CrmButton>
                  </StockCareDeferControl>
                </span>
              ) : (
                <span className="crm-card-mini__time" title="Последний уход (подрезка и вода)">
                  {formatWhenCompact(lastCareIso(row.last_trim_at ?? null, row.last_water_change_at ?? null))}
                </span>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="crm-card-mini__stack-row" title="Когда собрана партия">
              <span className="crm-card-mini__cell-lab">Сборка</span>
              <div className="crm-card-mini__cell-val">
                <span className="crm-card-mini__time">{formatWhenCompact(row.assembled_at)}</span>
              </div>
            </div>
            <div className="crm-card-mini__stack-row" title="Последняя смена воды">
              <span className="crm-card-mini__cell-lab">Вода</span>
              <div className="crm-card-mini__cell-val">
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
                <span className="crm-card-mini__time">
                  {formatWhenCompact(row.last_water_change_at ?? null)}
                </span>
              </div>
            </div>
            <div className="crm-card-mini__stack-row" title="Последняя подрезка">
              <span className="crm-card-mini__cell-lab">Подрезка</span>
              <div className="crm-card-mini__cell-val">
                <span className="crm-card-mini__action-slot">
                  <StockCareDeferControl sendAt={trimSendAt} onSendAtChange={setTrimSendAt}>
                    <CrmButton
                      variant="iconAct"
                      iconTone="trim"
                      className="crm-btn--row"
                      disabled={trimActDisabled}
                      title="Подрезка сейчас"
                      aria-label="Подрезка"
                      onClick={startTrimDeferred}
                    >
                      <IconScissors />
                    </CrmButton>
                  </StockCareDeferControl>
                </span>
                <span className="crm-card-mini__time">{formatWhenCompact(row.last_trim_at ?? null)}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </article>
  )
}
