import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AUTH_SESSION_INVALID_EVENT } from '../api/apiFetch'
import { getSessionUserId } from '../demo/session'
import { useAuth } from './AuthContext'

const isDemo = import.meta.env.VITE_DEMO_MODE === 'true'

/** Сброс UI-сессии и переход на вход при 401 или рассинхроне localStorage. */
export function AuthSessionSync() {
  const navigate = useNavigate()
  const { phone, clearLocalSession } = useAuth()

  useEffect(() => {
    const onInvalid = () => {
      clearLocalSession()
      navigate('/login', { replace: true })
    }
    window.addEventListener(AUTH_SESSION_INVALID_EVENT, onInvalid)
    return () => window.removeEventListener(AUTH_SESSION_INVALID_EVENT, onInvalid)
  }, [clearLocalSession, navigate])

  useEffect(() => {
    if (!isDemo || !phone) return
    if (getSessionUserId() == null) {
      clearLocalSession()
      navigate('/login', { replace: true })
    }
  }, [phone, clearLocalSession, navigate])

  return null
}
