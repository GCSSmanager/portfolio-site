import { Navigate } from 'react-router-dom'

/** Список цветов перенесён на главную страницу склада. */
export function WarehouseFlowersPage() {
  return <Navigate to="/warehouse" replace />
}
