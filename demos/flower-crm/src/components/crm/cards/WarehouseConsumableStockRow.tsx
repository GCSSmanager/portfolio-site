import { IconWaste } from '..'
import { CrmButton } from '../../ui/CrmButton'
import { StoreFlowerThumb } from '../../ui/StoreFlowerThumb'
import type { ConsumableRow } from '../stock/types'
import {
  formatConsumableQuantity,
  parseConsumableMeters,
  consumableEmptyPartiesLabel,
  partiesLabel,
} from '../../../utils/consumableMeters'

type Props = {
  row: ConsumableRow
  ownerActions?: React.ReactNode
  showStockDiscard?: boolean
  onRequestStockDiscard?: () => void
  onRequestIntake?: () => void
}

export function WarehouseConsumableStockRow({
  row,
  ownerActions,
  showStockDiscard = false,
  onRequestStockDiscard,
  onRequestIntake,
}: Props) {
  const balance = parseConsumableMeters(row.meters_balance) ?? 0
  const hasBalance = balance > 0
  const unitLabel = row.unit_label || (row.unit_kind === 'piece' ? 'шт' : 'м')

  return (
    <li className="warehouse-stock-row warehouse-stock-row--consumable">
      <div className="warehouse-stock-row__thumb" aria-hidden>
        <StoreFlowerThumb
          url={row.photo_url}
          alt={row.name}
          size={48}
          variant="consumable"
          className="warehouse-stock-row__img"
        />
      </div>
      <div className="warehouse-stock-row__body warehouse-stock-row__body--wide">
        <span className="warehouse-stock-row__name">{row.name}</span>
        {row.rolls_count > 0 ? (
          <span className="warehouse-stock-row__meta">{partiesLabel(row.rolls_count, row.unit_kind)}</span>
        ) : (
          <span className="warehouse-stock-row__meta warehouse-stock-row__meta--muted">
            {consumableEmptyPartiesLabel(row.unit_kind)}
          </span>
        )}
      </div>
      <div className="warehouse-stock-row__qty warehouse-stock-row__qty--consumable">
        <strong>{formatConsumableQuantity(row.meters_balance)}</strong>
        <span>{unitLabel}</span>
      </div>
      <div className="warehouse-stock-row__act">
        {ownerActions}
        {onRequestIntake ? (
          <CrmButton variant="iconAct" title="Приход" aria-label="Приход" onClick={() => onRequestIntake()}>
            +
          </CrmButton>
        ) : null}
        {showStockDiscard && hasBalance && onRequestStockDiscard ? (
          <CrmButton
            variant="iconAct"
            iconTone="discard"
            title="Списание в утиль"
            aria-label="Списание в утиль"
            onClick={() => onRequestStockDiscard()}
          >
            <IconWaste />
          </CrmButton>
        ) : null}
      </div>
    </li>
  )
}
