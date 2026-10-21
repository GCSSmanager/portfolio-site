import { useEffect, useRef, useState } from 'react'
import { IconCart, IconDeliveryTruck, StockCareDeferControl } from '..'
import { CrmButton } from '../../ui/CrmButton'
import { UNDO_REVERT_SECONDS } from '../stock/constants'
import type { CustomerOrderCareRow } from '../stock/types'
import { formatRuPhoneMasked } from '../../../auth/phoneInput'
import { formatRubNumber, parseAmount } from '../../../utils/formatMoney'

const DEFER_MS = UNDO_REVERT_SECONDS * 1000

type Props = {
  row: CustomerOrderCareRow
  busy: boolean
  onHandoff: (orderId: number) => void | Promise<void>
}

function formatScheduledRu(iso: string, timeHint: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const dateRu = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
  return timeHint ? `${dateRu} · ${timeHint}` : dateRu
}

export function CustomerOrderCareCard({ row, busy, onHandoff }: Props) {
  const [handoffSendAt, setHandoffSendAt] = useState<number | null>(null)
  const onHandoffRef = useRef(onHandoff)
  onHandoffRef.current = onHandoff

  useEffect(() => {
    if (handoffSendAt == null) return
    const ms = Math.max(0, handoffSendAt - Date.now())
    const id = window.setTimeout(() => {
      setHandoffSendAt(null)
      void Promise.resolve(onHandoffRef.current(row.id))
    }, ms)
    return () => window.clearTimeout(id)
  }, [handoffSendAt, row.id])

  const whenRu = formatScheduledRu(row.scheduled_at, row.scheduled_time)
  const pickup = row.pickup_at_store ?? row.delivery_service_name === 'Заберёт в магазине'
  const deliveryRub = formatRubNumber(parseAmount(row.delivery_price))
  const totalRub = formatRubNumber(parseAmount(row.total_amount))

  return (
    <article id={`crm-order-${row.id}`} className="crm-card-mini crm-card-mini--customer-order">
      <div className="crm-card-mini__main">
        <div className="crm-card-mini__body">
          <div className="crm-card-mini__meta">
            <span className="crm-card-mini__id">
              <span className="crm-card-mini__order-kind-ico" aria-hidden>
                <IconCart size={14} />
              </span>{' '}
              Заказ #{row.id}
            </span>
            <span className="crm-card-mini__rank">{pickup ? 'Самовывоз' : 'К доставке'}</span>
          </div>
          <h3 className="crm-card-mini__name">{row.product_name}</h3>
          <p className="crm-card-mini__latin">
            ×{row.quantity} шт · {whenRu}
          </p>
          <p className="crm-card-mini__order-line">
            <span className="crm-card-mini__order-service">{row.delivery_service_name}</span>
            {!pickup && parseAmount(row.delivery_price) > 0 ? (
              <span className="crm-card-mini__order-badge">+{deliveryRub} доставка</span>
            ) : null}
          </p>
          {row.customer_phone ? (
            <p className="crm-card-mini__order-phone">
              {formatRuPhoneMasked(row.customer_phone.replace(/\D/g, '').slice(0, 11))}
            </p>
          ) : null}
          {!pickup && row.delivery_address ? (
            <p className="crm-card-mini__order-address" title={row.delivery_address}>
              {row.delivery_address}
            </p>
          ) : null}
          <p className="crm-card-mini__order-total">
            Итого: <strong>{totalRub}</strong>
          </p>
        </div>
      </div>
      <div className="crm-card-mini__dates crm-card-mini__dates--stack crm-card-mini__dates--intake-only">
        <div className="crm-card-mini__stack-row" title="Передать курьеру">
          <span className="crm-card-mini__cell-lab">Курьер</span>
          <div className="crm-card-mini__cell-val crm-card-mini__cell-val--intake">
            <span className="crm-card-mini__action-slot crm-card-mini__action-slot--intake-wide">
              <StockCareDeferControl sendAt={handoffSendAt} onSendAtChange={setHandoffSendAt}>
                <CrmButton
                  variant="intake"
                  className="crm-btn--row crm-btn--icon-cell crm-btn--delivery-truck crm-btn--order-handoff"
                  disabled={busy || handoffSendAt != null}
                  title="Передать букет курьеру (5 с до отправки)"
                  aria-label="Передать заказ курьеру"
                  onClick={() => setHandoffSendAt((p) => p ?? Date.now() + DEFER_MS)}
                >
                  <IconDeliveryTruck />
                </CrmButton>
              </StockCareDeferControl>
            </span>
          </div>
        </div>
      </div>
    </article>
  )
}
