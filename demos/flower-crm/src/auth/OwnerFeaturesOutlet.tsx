import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthContext'
import './auth.css'

/** Разделы только для владельца магазина (статистика, цены, поставщики, флористы). */
export function OwnerFeaturesOutlet() {
  const { isOwner, loading } = useAuth()

  if (loading) {
    return (
      <div className="login-page login-page--busy" aria-busy="true">
        <p className="login-page__loading">Загрузка…</p>
      </div>
    )
  }

  if (!isOwner) {
    return <Navigate to="/warehouse" replace />
  }

  return <Outlet />
}
