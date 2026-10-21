import { useId, useState, type ReactNode } from 'react'
import { CrmButton } from '../../ui/CrmButton'
import { StoreFlowerThumb } from '../../ui/StoreFlowerThumb'
import type { CatalogNavState } from '../../../utils/catalogNav'
import type { BatchRow } from '../stock/types'
import { IconCareSheet, IconWaste } from '..'
import { batchCountLabelRu } from './warehouseFlowerBatches'
import { batchPartyMiniProps, WarehousePartyMiniCard } from './WarehousePartyMiniCard'
import { WarehouseStockCareMeta } from './warehouseStockCareMeta'
import type { WarehouseFlowerLine } from './warehouseFlowerStock'

type Props = {
  line: WarehouseFlowerLine
  warehouseMode?: string
  /** Продвинутый режим: партии этого цветка (раскрываются по клику). */
  flowerBatches?: BatchRow[]
  catalogFlowerNav: CatalogNavState
  /** Доп. строка под «последний уход» (каталог, заметки). */
  detailHint?: string | null
  /** Кнопки владельца рядом с переходом в карточку ухода. */
  ownerActions?: ReactNode
  /** Владелец: быстрое списание по FIFO по всем партиям этого цветка. */
  showStockDiscard?: boolean
  onStockDiscard?: () => void
}

export function WarehouseFlowerStockRow({
  line,
  warehouseMode,
  flowerBatches = [],
  catalogFlowerNav,
  detailHint,
  ownerActions,
  showStockDiscard = false,
  onStockDiscard,
}: Props) {
  const panelId = useId()
  const [batchesOpen, setBatchesOpen] = useState(false)
  const advanced = warehouseMode === 'advanced'
  const canShowBatches = advanced && flowerBatches.length > 0
  const to =
    line.store_flower_id != null
      ? `/warehouse/flowers/${line.store_flower_id}`
      : line.taxon_id != null
        ? `/flowers/${line.taxon_id}`
        : '#'

  const toggleBatches = () => {
    if (!canShowBatches) return
    setBatchesOpen((v) => !v)
  }

  return (
    <li
      className={
        canShowBatches
          ? `warehouse-stock-row-item${batchesOpen ? ' warehouse-stock-row-item--open' : ''}`
          : undefined
      }
    >
      <div
        className={`warehouse-stock-row${canShowBatches ? ' warehouse-stock-row--expandable' : ''}`}
        onClick={canShowBatches ? toggleBatches : undefined}
        onKeyDown={
          canShowBatches
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  toggleBatches()
                }
              }
            : undefined
        }
        role={canShowBatches ? 'button' : undefined}
        tabIndex={canShowBatches ? 0 : undefined}
        aria-expanded={canShowBatches ? batchesOpen : undefined}
        aria-controls={canShowBatches ? panelId : undefined}
        title={canShowBatches ? (batchesOpen ? 'Свернуть партии' : 'Показать партии на складе') : undefined}
      >
      <div className="warehouse-stock-row__thumb" aria-hidden>
        <StoreFlowerThumb
          url={line.photo_url}
          alt=""
          size={48}
          variant="flower"
          className="warehouse-stock-row__img"
        />
      </div>
      <div className="warehouse-stock-row__body">
        <div className="warehouse-stock-row__title-line">
          <span className="warehouse-stock-row__name">{line.display_name}</span>
          {canShowBatches ? (
            <span className="warehouse-stock-row__parties-hint" aria-hidden>
              {batchCountLabelRu(flowerBatches.length)}
              <span className="warehouse-stock-row__chevron">{batchesOpen ? '▾' : '▸'}</span>
            </span>
          ) : null}
          {line.has_intake_pending ? (
            <span className="warehouse-stock-row__badge">Приёмка</span>
          ) : null}
        </div>
        {line.latin_name ? <p className="warehouse-stock-row__latin">{line.latin_name}</p> : null}
        <WarehouseStockCareMeta
          warehouseMode={warehouseMode}
          received_at={line.received_at}
          last_trim_at={line.last_trim_at}
          last_water_change_at={line.last_water_change_at}
          kind="flower"
        />
        {line.rank_label || line.realization_quantity > 0 ? (
          <p className="warehouse-stock-row__care warehouse-stock-row__care--tags">
            <span className="warehouse-stock-row__care-tags">
              {line.rank_label ? (
                <span className="warehouse-stock-row__rank-tag">{line.rank_label}</span>
              ) : null}
              {line.realization_quantity > 0 ? (
                <span className="crm-card-mini__realization">
                  Реализация · {line.realization_quantity} шт
                </span>
              ) : null}
            </span>
          </p>
        ) : null}
        {detailHint ? <p className="warehouse-stock-row__detail-hint">{detailHint}</p> : null}
      </div>
      <div className="warehouse-stock-row__qty">
        <strong>{line.quantity}</strong>
        <span>шт</span>
      </div>
      <div
        className="warehouse-stock-row__act"
        onClick={canShowBatches ? (e) => e.stopPropagation() : undefined}
        onKeyDown={canShowBatches ? (e) => e.stopPropagation() : undefined}
      >
        {ownerActions ? <div className="warehouse-stock-row__owner-act">{ownerActions}</div> : null}
        <CrmButton
          to={to}
          linkState={catalogFlowerNav}
          variant="iconAct"
          iconTone="care"
          className="warehouse-stock-row__link"
          title="Карточка цветка"
          aria-label="Карточка цветка"
        >
          <IconCareSheet />
        </CrmButton>
        {showStockDiscard && line.quantity > 0 && onStockDiscard ? (
          <CrmButton
            variant="iconAct"
            iconTone="discard"
            title="Списание со склада"
            aria-label="Списание со склада"
            onClick={() => onStockDiscard()}
          >
            <IconWaste />
          </CrmButton>
        ) : null}
      </div>
      </div>
      {canShowBatches && batchesOpen ? (
        <div
          id={panelId}
          className="warehouse-stock-row__batches"
          role="region"
          aria-label={`Партии: ${line.display_name}`}
          onClick={(e) => e.stopPropagation()}
        >
          {flowerBatches.map((batch) => (
            <WarehousePartyMiniCard key={batch.id} {...batchPartyMiniProps(batch)} />
          ))}
        </div>
      ) : null}
    </li>
  )
}
