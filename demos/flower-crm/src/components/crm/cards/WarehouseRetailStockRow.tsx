import { Link } from 'react-router-dom'
import { parseStoredMoney } from '../../../utils/crmInput'
import { StoreFlowerThumb } from '../../ui/StoreFlowerThumb'
import { IconWaste } from '..'
import { CrmButton } from '../../ui/CrmButton'
import type { RetailProductRow } from '../stock/types'

type Props = {
  row: RetailProductRow
  showPricesLink?: boolean
  ownerActions?: React.ReactNode
  showStockDiscard?: boolean
  onRequestStockDiscard?: () => void
}

export function WarehouseRetailStockRow({
  row,
  showPricesLink = true,
  ownerActions,
  showStockDiscard = false,
  onRequestStockDiscard,
}: Props) {
  const price = parseStoredMoney(row.unit_price)

  return (
    <li className="warehouse-stock-row warehouse-stock-row--retail">
      <div className="warehouse-stock-row__thumb" aria-hidden>
        <StoreFlowerThumb url={row.photo_url} alt={row.name} size={48} variant="retail" className="warehouse-stock-row__img" />
      </div>
      <div className="warehouse-stock-row__body">
        <div className="warehouse-stock-row__title-line">
          <span className="warehouse-stock-row__name">{row.name}</span>
          {(row.realization_quantity ?? 0) > 0 ? (
            <span className="warehouse-stock-row__badge warehouse-stock-row__badge--realization">
              На реализации {row.realization_quantity} шт
            </span>
          ) : null}
        </div>
        <p className="warehouse-stock-row__care">
          {price != null ? (
            <>
              Цена продажи{' '}
              <strong>
                {price.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽/шт
              </strong>
            </>
          ) : showPricesLink ? (
            <Link to="/prices" className="crm-card-mini__price-link">
              Укажите цену в «Ценах» или в редактировании
            </Link>
          ) : (
            <span className="crm-card-mini__price-muted">цена не задана</span>
          )}
        </p>
      </div>
      <div className="warehouse-stock-row__qty">
        <strong>{row.quantity}</strong>
        <span>шт</span>
      </div>
      <div className="warehouse-stock-row__act">
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
    </li>
  )
}
