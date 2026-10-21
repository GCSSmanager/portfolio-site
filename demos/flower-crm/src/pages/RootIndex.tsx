import { Navigate } from 'react-router-dom'

const isDemo = import.meta.env.VITE_DEMO_MODE === 'true'
import { useAuth } from '../auth/AuthContext'
import { SiteHeader } from '../auth/SiteHeader'
import { DemoAppChrome } from '../components/demo/DemoAppChrome'
import { CustomerAccountPage } from './CustomerAccountPage'
import { HomePage } from './HomePage'
import { LandingPage } from './LandingPage'

/** `/`: лендинг для гостей, главное меню (CRM) для вошедших. */
export function RootIndex() {
  const { phone, subscriptionActive, isOwner, isCustomer, loading, backendUnreachable } = useAuth()

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
    if (isDemo) return <Navigate to="/login" replace />
    return <LandingPage />
  }

  if (isCustomer) {
    return (
      <DemoAppChrome>
        <div className="auth-app-shell">
          <SiteHeader />
          <CustomerAccountPage />
        </div>
      </DemoAppChrome>
    )
  }

  if (!isDemo && !subscriptionActive) {
    return <Navigate to={isOwner ? '/subscription' : '/subscription-required'} replace />
  }

  return (
    <DemoAppChrome>
      <div className="auth-app-shell">
        <SiteHeader />
        <HomePage />
      </div>
    </DemoAppChrome>
  )
}
