import { CrmButton } from '../../ui/CrmButton'
import { parseStoredMoney } from '../../../utils/crmInput'
import type { BouquetRow } from '../stock/types'

type Props = {
  row: BouquetRow
}

export function HomeBouquetMoreTaskCard({ row }: Props) {
  const needsPrice = parseStoredMoney(row.unit_price) == null
  const needsAssemble = row.quantity === 0 && row.recipe_lines.length > 0

  return (
    <article className="crm-card-mini crm-card-mini--home-price-miss crm-card-mini--bouquet">
      <div className="crm-card-mini__main">
        <div className="crm-card-mini__body">
          <div className="crm-card-mini__meta">
            <span className="crm-card-mini__rank">букет</span>
          </div>
          <h3 className="crm-card-mini__name">{row.name}</h3>
          {needsAssemble ? (
            <p className="crm-home-price-miss__task" role="status">
              Соберите букет на складе — кнопка «Букет» в шапке.
            </p>
          ) : null}
          {needsPrice ? (
            <p className="crm-home-price-miss__task" role="status">
              Укажите розничную цену в разделе «Цены».
            </p>
          ) : null}
        </div>
        <div className="crm-card-mini__aside">
          <div className="crm-card-mini__qty">
            <strong>{row.quantity}</strong>
            <span>шт</span>
          </div>
        </div>
      </div>
      <div className="crm-home-price-miss__footer" role="group" aria-label="Ссылки">
        {needsPrice ? (
          <CrmButton to="/prices" variant="homeTaskPrimary">
            К ценам
          </CrmButton>
        ) : null}
        {needsAssemble ? (
          <CrmButton to="/warehouse" variant="homeTaskPrimary">
            На склад
          </CrmButton>
        ) : null}
      </div>
    </article>
  )
}
