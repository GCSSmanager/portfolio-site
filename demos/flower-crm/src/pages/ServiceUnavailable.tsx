import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { CrmButton } from '../components/ui/CrmButton'
import './notFound.css'

export function ServiceUnavailablePage() {
  const navigate = useNavigate()
  const { refresh, clearBackendUnreachable } = useAuth()
  const [retrying, setRetrying] = useState(false)

  const retry = async () => {
    setRetrying(true)
    clearBackendUnreachable()
    try {
      const r = await refresh()
      if (r.reachable) {
        navigate(r.authenticated ? '/' : '/login', { replace: true })
      }
    } finally {
      setRetrying(false)
    }
  }

  return (
    <div className="not-found not-found--offline">
      <p className="not-found__code" aria-hidden>
        ⚠
      </p>
      <h1 className="not-found__title">Сервер недоступен</h1>
      <p className="not-found__text">
        Не удаётся связаться с сервером. Проверьте сеть и попробуйте позже. Извините за
        неудобства.
      </p>
      <CrmButton variant="notFound" onClick={() => void retry()} disabled={retrying}>
        {retrying ? 'Проверка…' : 'Попробовать снова'}
      </CrmButton>
    </div>
  )
}
