import { useId, useState, type ReactNode } from 'react'
import { parseStoredMoney } from '../../../utils/crmInput'
import { BouquetRecipeList } from './BouquetRecipeList'
import { StoreFlowerThumb } from '../../ui/StoreFlowerThumb'
import { IconWaste } from '..'
import { CrmButton } from '../../ui/CrmButton'
import { batchCountLabelRu } from './warehouseFlowerBatches'
import {
  bouquetUnitPartyMiniProps,
  resolveBouquetStockUnits,
  WarehousePartyMiniCard,
} from './WarehousePartyMiniCard'
import { WarehouseStockCareMeta } from './warehouseStockCareMeta'
import type { BouquetRow, BouquetStockUnit } from '../stock/types'

type Props = {
  row: BouquetRow
  warehouseMode?: string
  stockUnits?: BouquetStockUnit[]
  ownerActions?: ReactNode
  showStockDiscard?: boolean
  onRequestStockDiscard?: () => void
}

export function WarehouseBouquetStockRow({
  row,
  warehouseMode,
  stockUnits,
  ownerActions,
  showStockDiscard = false,
  onRequestStockDiscard,
}: Props) {
  const panelId = useId()
  const [partiesOpen, setPartiesOpen] = useState(false)
  const advanced = warehouseMode === 'advanced'
  const units =
    stockUnits != null && stockUnits.length > 0 ? stockUnits : resolveBouquetStockUnits(row)
  const canShowParties = advanced && units.length > 0
  const price = parseStoredMoney(row.unit_price)

  const toggleParties = () => {
    if (!canShowParties) return
    setPartiesOpen((v) => !v)
  }

  return (
    <li
      className={
        canShowParties
          ? `warehouse-stock-row-item${partiesOpen ? ' warehouse-stock-row-item--open' : ''}`
          : undefined
      }
    >
      <div
        className={`warehouse-stock-row warehouse-stock-row--bouquet${
          canShowParties ? ' warehouse-stock-row--expandable' : ''
        }`}
        onClick={canShowParties ? toggleParties : undefined}
        onKeyDown={
          canShowParties
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  toggleParties()
                }
              }
            : undefined
        }
        role={canShowParties ? 'button' : undefined}
        tabIndex={canShowParties ? 0 : undefined}
        aria-expanded={canShowParties ? partiesOpen : undefined}
        aria-controls={canShowParties ? panelId : undefined}
        title={canShowParties ? (partiesOpen ? 'Свернуть партии' : 'Показать партии сборки') : undefined}
      >
        <div className="warehouse-stock-row__thumb" aria-hidden>
          <StoreFlowerThumb
            url={row.photo_url}
            alt={row.name}
            size={48}
            variant="bouquet"
            className="warehouse-stock-row__img"
          />
        </div>
        <div className="warehouse-stock-row__body">
          <div className="warehouse-stock-row__title-line">
            <span className="warehouse-stock-row__name">{row.name}</span>
            {canShowParties ? (
              <span className="warehouse-stock-row__parties-hint" aria-hidden>
                {batchCountLabelRu(units.length)}
                <span className="warehouse-stock-row__chevron">{partiesOpen ? '▾' : '▸'}</span>
              </span>
            ) : null}
          </div>
          <div className="warehouse-stock-row__care">
            <BouquetRecipeList
              recipeLines={row.recipe_lines}
              consumableLines={row.consumable_recipe_lines}
              emptyLabel="состав не задан"
            />
          </div>
          <WarehouseStockCareMeta
            warehouseMode={warehouseMode}
            assembled_at={row.assembled_at ?? null}
            last_trim_at={row.last_trim_at ?? null}
            last_water_change_at={row.last_water_change_at ?? null}
            kind="bouquet"
          />
          <p className="warehouse-stock-row__care">
            {price != null ? (
              <>
                Цена{' '}
                <strong>
                  {price.toLocaleString('ru-RU', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  ₽/шт
                </strong>
              </>
            ) : (
              <span className="crm-card-mini__price-muted">цена не задана</span>
            )}
          </p>
        </div>
        <div className="warehouse-stock-row__qty">
          <strong>{row.quantity}</strong>
          <span>шт</span>
        </div>
        <div
          className="warehouse-stock-row__act"
          onClick={canShowParties ? (e) => e.stopPropagation() : undefined}
          onKeyDown={canShowParties ? (e) => e.stopPropagation() : undefined}
        >
          {ownerActions}
          {showStockDiscard && row.quantity > 0 && onRequestStockDiscard ? (
            <CrmButton
              variant="iconAct"
              iconTone="discard"
              title="Списание со склада"
              aria-label="Списание со склада"
              onClick={() => onRequestStockDiscard()}
            >
              <IconWaste />
            </CrmButton>
          ) : null}
        </div>
      </div>
      {canShowParties && partiesOpen ? (
        <div
          id={panelId}
          className="warehouse-stock-row__batches"
          role="region"
          aria-label={`Партии: ${row.name}`}
          onClick={(e) => e.stopPropagation()}
        >
          {units.map((unit, idx) => (
            <WarehousePartyMiniCard
              key={unit.assembly_id ?? `bouquet-${row.id}-unit-${idx}`}
              {...bouquetUnitPartyMiniProps(unit)}
            />
          ))}
        </div>
      ) : null}
    </li>
  )
}
