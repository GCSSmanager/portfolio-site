import { IconDeliveryTruck } from '..'
import { CrmButton } from '../../ui/CrmButton'
import type { SupplierDeliveryCareRow } from '../stock/types'

type Props = {
  row: SupplierDeliveryCareRow
  busy: boolean
  onOpenReceive: (row: SupplierDeliveryCareRow) => void
  /** Компактная строка для склада */
  compact?: boolean
}

function formatDeliveryDateRu(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`)
  return Number.isNaN(d.getTime())
    ? isoDate
    : d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function SupplierDeliveryCareCard({ row, busy, onOpenReceive, compact = false }: Props) {
  const dateRu = formatDeliveryDateRu(row.expected_arrival_date)
  const totalQty = row.lines.reduce((s, l) => s + l.quantity, 0)
  const posCount = row.lines.length
  const summary =
    posCount === 1
      ? `${row.lines[0].display_name} · ${totalQty} шт`
      : `${posCount} поз · ${totalQty} шт`
  const titleLines = row.lines.map((l) => `${l.display_name} ×${l.quantity}`).join('\n')

  if (compact) {
    return (
      <div className="warehouse-delivery-row">
        <div className="warehouse-delivery-row__body">
          <div className="warehouse-delivery-row__title-line">
            <span className="warehouse-delivery-row__supplier">{row.supplier_name}</span>
            <span className="warehouse-delivery-row__badge">К приёму</span>
          </div>
          <p className="warehouse-delivery-row__meta">Привоз · {dateRu}</p>
          <p className="warehouse-delivery-row__lines" title={titleLines}>
            {summary}
          </p>
        </div>
        <div className="warehouse-delivery-row__act">
          <CrmButton
            variant="intake"
            className="crm-btn--icon-cell crm-btn--delivery-truck"
            disabled={busy}
            title="Приёмка по накладной"
            aria-label="Открыть приёмку поставки"
            onClick={() => onOpenReceive(row)}
          >
            <IconDeliveryTruck />
          </CrmButton>
        </div>
      </div>
    )
  }

  return (
    <article id={`crm-delivery-${row.id}`} className="crm-card-mini crm-card-mini--supplier-delivery">
      <div className="crm-card-mini__main">
        <div className="crm-card-mini__body">
          <div className="crm-card-mini__meta">
            <span className="crm-card-mini__id">Поставка #{row.id}</span>
            <span className="crm-card-mini__rank">От поставщика</span>
          </div>
          <h3 className="crm-card-mini__name">{row.supplier_name}</h3>
          <p className="crm-card-mini__latin">Привоз · {dateRu}</p>
          <ul className="crm-card-mini__delivery-lines" aria-label="Состав и закупка по плану">
            {row.lines.map((l) => (
              <li key={l.id}>
                <span className="crm-card-mini__delivery-line-name">{l.display_name}</span>
                <span className="crm-card-mini__delivery-line-meta">
                  ×{l.quantity} шт · <strong>{l.unit_purchase_price}</strong> ₽/шт
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="crm-card-mini__dates crm-card-mini__dates--stack crm-card-mini__dates--intake-only">
        <div className="crm-card-mini__stack-row" title="Поставка на склад">
          <span className="crm-card-mini__cell-lab">Склад</span>
          <div className="crm-card-mini__cell-val crm-card-mini__cell-val--intake">
            <span className="crm-card-mini__action-slot crm-card-mini__action-slot--intake-wide">
              <CrmButton
                variant="intake"
                className="crm-btn--row crm-btn--icon-cell crm-btn--delivery-truck"
                disabled={busy}
                title="Приёмка по накладной (сверка с фактом)"
                aria-label="Открыть приёмку поставки"
                onClick={() => onOpenReceive(row)}
              >
                <IconDeliveryTruck />
              </CrmButton>
            </span>
          </div>
        </div>
      </div>
    </article>
  )
}
