import { Navigate, Outlet, useLocation } from 'react-router-dom'

const isDemo = import.meta.env.VITE_DEMO_MODE === 'true'
import { DemoAppChrome } from '../components/demo/DemoAppChrome'
import { useAuth } from './AuthContext'
import { SiteHeader } from './SiteHeader'
import './auth.css'

export function ProtectedLayout() {
  const { phone, subscriptionActive, isOwner, isCustomer, loading, backendUnreachable } = useAuth()
  const location = useLocation()

  if (backendUnreachable) {
    return <Navigate to="/service-unavailable" replace />
  }

  if (loading) {
    return (
      <div className="login-page login-page--busy" aria-busy="true">
        <p className="login-page__loading">Загрузка…</p>
      </div>
    )
  }

  if (!phone) {
    return <Navigate to={isDemo ? '/login' : '/'} replace />
  }

  if (isCustomer) {
    return <Navigate to="/" replace />
  }

  if (!isDemo && !subscriptionActive) {
    if (isOwner) {
      if (location.pathname !== '/subscription') {
        return <Navigate to="/subscription" replace />
      }
      return (
        <DemoAppChrome>
          <div className="auth-app-shell">
            <SiteHeader />
            <Outlet />
          </div>
        </DemoAppChrome>
      )
    }
    return <Navigate to="/subscription-required" replace />
  }

  return (
    <DemoAppChrome>
      <div className="auth-app-shell">
        <SiteHeader />
        <Outlet />
      </div>
    </DemoAppChrome>
  )
}
