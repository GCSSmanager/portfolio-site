import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { AuthForm } from './AuthForm'
import { authPostLoginPath, completeAuthSession } from './authSession'
import './auth.css'

/** Отдельная страница входа (не модалка): Safari / Keychain предлагают сохранить пароль сразу после submit. */
export function LoginPage() {
  const { phone, subscriptionActive, role, isCustomer, loading, backendUnreachable } = useAuth()

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

  if (phone) {
    if (isCustomer) {
      return <Navigate to="/" replace />
    }
    return <Navigate to={authPostLoginPath(subscriptionActive, role)} replace />
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-card__title">Вход в FlowerFlow</h1>
        <AuthForm
          onAuthenticated={({ subscriptionActive: active, role: nextRole }) =>
            completeAuthSession(active, nextRole)
          }
        />
      </div>
    </div>
  )
}
