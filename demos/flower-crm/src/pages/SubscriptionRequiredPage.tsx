import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { CrmButton } from '../components/ui/CrmButton'
import '../auth/auth.css'
import './notFound.css'

/** Отдельный «тупиковый» экран: сессия есть, подписки нет — как 404, без навигации по ЛК. */
export function SubscriptionRequiredPage() {
  const navigate = useNavigate()
  const { phone, subscriptionActive, loading, backendUnreachable, logout } = useAuth()

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
    return <Navigate to="/" replace />
  }

  if (subscriptionActive) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="not-found not-found--subscription" role="alert">
      <p className="not-found__code" aria-hidden>
        403
      </p>
      <h1 className="not-found__title">Нужна подписка</h1>
      <p className="not-found__text">
        Ваша подписка закончилась, свяжитесь с управляющим!
      </p>
      <CrmButton
        variant="notFound"
        onClick={() =>
          void (async () => {
            await logout()
            navigate('/login', { replace: true })
          })()
        }
      >
        Выйти
      </CrmButton>
    </div>
  )
}
