import { Link } from 'react-router-dom'
import { parseStoredMoney } from '../../../utils/crmInput'
import { StoreFlowerThumb } from '../../ui/StoreFlowerThumb'
import { IconWaste } from '..'
import { CrmButton } from '../../ui/CrmButton'
import type { RetailProductRow } from '../stock/types'

export function RetailProductCard({
  row,
  showPricesLink = true,
  showUnitCost = true,
  compact = false,
  showStockDiscard = false,
  onRequestStockDiscard,
}: {
  row: RetailProductRow
  /** Если false — не даём ссылку в раздел «Цены» (флорист). */
  showPricesLink?: boolean
  showUnitCost?: boolean
  /** Компактная строка для склада (без карточки-мини). */
  compact?: boolean
  /** Владелец: кнопка списания со склада (без продажи). */
  showStockDiscard?: boolean
  onRequestStockDiscard?: () => void
}) {
  const cost = row.unit_cost != null ? parseStoredMoney(row.unit_cost) : null
  const price = parseStoredMoney(row.unit_price)

  if (compact) {
    return (
      <div className="crm-retail-stock-row">
        <StoreFlowerThumb
          url={row.photo_url}
          alt={row.name}
          size={32}
          variant="retail"
          className="crm-retail-stock-row__thumb"
        />
        <span className="crm-retail-stock-row__name" title={row.name}>
          {row.name}
          {(row.realization_quantity ?? 0) > 0 ? (
            <span className="warehouse-stock-row__badge warehouse-stock-row__badge--realization">
              {' '}
              На реализации {row.realization_quantity} шт
            </span>
          ) : null}
        </span>
        <span className="crm-retail-stock-row__qty">{row.quantity} шт</span>
        <span className="crm-retail-stock-row__price">
          {price != null ? (
            <strong>
              {price.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽
            </strong>
          ) : showPricesLink ? (
            <Link to="/prices" className="crm-card-mini__price-link">
              цена
            </Link>
          ) : (
            <span className="crm-card-mini__price-muted">—</span>
          )}
        </span>
        {showStockDiscard && row.quantity > 0 && onRequestStockDiscard ? (
          <div className="crm-retail-stock-row__act">
            <CrmButton
              variant="iconAct"
              iconTone="discard"
              title="Списание со склада"
              aria-label="Списание со склада"
              onClick={() => onRequestStockDiscard()}
            >
              <IconWaste />
            </CrmButton>
          </div>
        ) : (
          <span className="crm-retail-stock-row__act" aria-hidden />
        )}
      </div>
    )
  }

  return (
    <article id={`crm-retail-${row.id}`} className="crm-card-mini crm-card-mini--retail">
      <div className="crm-card-mini__main">
        <StoreFlowerThumb
          url={row.photo_url}
          alt={row.name}
          size={48}
          variant="retail"
          className="crm-card-mini__thumb"
        />
        <div className="crm-card-mini__body">
          <div className="crm-card-mini__meta">
            <span className="crm-card-mini__id">Товар #{row.id}</span>
            <span className="crm-card-mini__rank">Без срока</span>
          </div>
          <h3 className="crm-card-mini__name">{row.name}</h3>
          <p className="crm-card-mini__recv">
            {showUnitCost ? (
              <>
                Себестоимость{' '}
                <strong>
                  {cost != null
                    ? cost.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : '—'}{' '}
                  ₽/шт
                </strong>
                {price != null ? (
                  <>
                    {' · '}
                    Цена{' '}
                    <strong>
                      {price.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽/шт
                    </strong>
                  </>
                ) : showPricesLink ? (
                  <>
                    {' · '}
                    <Link to="/prices" className="crm-card-mini__price-link">
                      Укажите цену в «Ценах»
                    </Link>
                  </>
                ) : (
                  <>
                    {' · '}
                    <span className="crm-card-mini__price-muted">цена не задана</span>
                  </>
                )}
              </>
            ) : (
              <>
                {price != null ? (
                  <>
                    Цена{' '}
                    <strong>
                      {price.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽/шт
                    </strong>
                  </>
                ) : showPricesLink ? (
                  <Link to="/prices" className="crm-card-mini__price-link">
                    Укажите цену в «Ценах»
                  </Link>
                ) : (
                  <span className="crm-card-mini__price-muted">цена не задана</span>
                )}
              </>
            )}
          </p>
        </div>
        <div className="crm-card-mini__aside">
          <div className="crm-card-mini__qty">
            <strong>{row.quantity}</strong>
            <span>шт</span>
          </div>
          {showStockDiscard && row.quantity > 0 && onRequestStockDiscard ? (
            <div className="crm-card-mini__acts" role="group" aria-label="Списание">
              <CrmButton
                variant="iconAct"
                iconTone="discard"
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
    </article>
  )
}
