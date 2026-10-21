import { CrmButton } from '../../ui/CrmButton'
import { IconCareSheet } from '..'
import { catalogNavState } from '../../../utils/catalogNav'

type Props = {
  intervalDays: number
  fromPath?: string
}

export function InventoryCareCard({ intervalDays, fromPath = '/' }: Props) {
  const nav = catalogNavState(fromPath)
  return (
    <article className="crm-card-mini crm-card-mini--inventory">
      <div className="crm-card-mini__main">
        <div className="crm-card-mini__body">
          <div className="crm-card-mini__meta">
            <span className="crm-card-mini__rank">Склад</span>
          </div>
          <h3 className="crm-card-mini__name">Инвентаризация</h3>
          <p className="crm-card-mini__latin">
            Сверка остатков с фактом · раз в {intervalDays} дн.
          </p>
        </div>
      </div>
      <div className="crm-card-mini__dates crm-card-mini__dates--stack crm-card-mini__dates--intake-only">
        <div className="crm-card-mini__stack-row">
          <span className="crm-card-mini__cell-lab">Пересчёт</span>
          <div className="crm-card-mini__cell-val crm-card-mini__cell-val--intake">
            <span className="crm-card-mini__action-slot crm-card-mini__action-slot--intake-wide">
              <CrmButton
                to="/warehouse/inventory"
                linkState={nav}
                variant="intake"
                className="crm-btn--row crm-btn--icon-cell"
                title="Открыть инвентаризацию"
                aria-label="Открыть инвентаризацию"
              >
                <IconCareSheet />
              </CrmButton>
            </span>
          </div>
        </div>
      </div>
    </article>
  )
}
