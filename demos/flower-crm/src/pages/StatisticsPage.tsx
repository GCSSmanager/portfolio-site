import { CrmSalesStats } from './warehouse/CrmSalesStats'
import './warehouse.css'

export function StatisticsPage() {
  return (
    <div className="flowers-page warehouse-page warehouse-crm warehouse-crm--minimal crm-stats-page">
      <div className="crm-shell">
        <CrmSalesStats />
      </div>
    </div>
  )
}
