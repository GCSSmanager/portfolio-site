import { CrmButton } from '../../ui/CrmButton'
import type { RetailProductRow } from '../stock/types'

export function HomeRetailSetPriceTaskCard({ row }: { row: RetailProductRow }) {
  return (
    <article className="crm-card-mini crm-card-mini--home-price-miss" id={`crm-home-retail-price-${row.id}`}>
      <div className="crm-card-mini__main">
        <div className="crm-card-mini__body">
          <div className="crm-card-mini__meta">
            <span className="crm-card-mini__id">Товар #{row.id}</span>
            <span className="crm-card-mini__rank">Без срока</span>
          </div>
          <h3 className="crm-card-mini__name">{row.name}</h3>
          <p className="crm-home-price-miss__task" role="status">
            Укажите цену продажи в разделе «Цены».
          </p>
        </div>
        <div className="crm-card-mini__aside">
          <div className="crm-card-mini__qty">
            <strong>{row.quantity}</strong>
            <span>шт</span>
          </div>
        </div>
      </div>
      <div className="crm-home-price-miss__footer" role="group" aria-label="Ссылки">
        <CrmButton to="/prices" variant="homeTaskPrimary">
          К ценам
        </CrmButton>
      </div>
    </article>
  )
}
