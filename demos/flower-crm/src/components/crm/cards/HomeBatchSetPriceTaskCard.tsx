import { CrmButton } from '../../ui/CrmButton'
import type { CatalogNavState } from '../../../utils/catalogNav'
import type { BatchRow } from '../stock/types'

type Props = {
  row: BatchRow
  catalogFlowerNav: CatalogNavState
}

export function HomeBatchSetPriceTaskCard({ row, catalogFlowerNav }: Props) {
  return (
    <article className="crm-card-mini crm-card-mini--home-price-miss" id={`crm-home-price-${row.id}`}>
      <div className="crm-card-mini__main">
        <div className="crm-card-mini__body">
          <div className="crm-card-mini__meta">
            <span className="crm-card-mini__id">#{row.id}</span>
            <span className="crm-card-mini__rank">{row.rank_label}</span>
          </div>
          <h3 className="crm-card-mini__name">{row.display_name}</h3>
          <p className="crm-card-mini__latin">{row.latin_name}</p>
          <p className="crm-home-price-miss__task" role="status">
            Укажите розничную цену для этого вида в разделе «Цены» на сайте.
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
        <CrmButton
          to={
            row.store_flower_id != null
              ? `/warehouse/flowers/${row.store_flower_id}`
              : row.taxon_id != null
                ? `/flowers/${row.taxon_id}`
                : '#'
          }
          linkState={catalogFlowerNav}
          variant="homeTaskGhost"
        >
          Карточка вида
        </CrmButton>
      </div>
    </article>
  )
}
