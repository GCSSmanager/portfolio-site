import { type FormEvent, useLayoutEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { CrmTextField } from '../components/form'
import { SiteBackBadge } from '../components/demo/SiteBackBadge'
import { CrmButton } from '../components/ui/CrmButton'
import { DEMO_ACCOUNTS } from '../demo/accounts'
import { useAuth, type FloristRole } from './AuthContext'
import { applyPhoneFieldChange, formatRuPhoneMasked } from './phoneInput'
import './auth.css'

const isDemo = import.meta.env.VITE_DEMO_MODE === 'true'

const ROLE_LABELS: Record<FloristRole, string> = {
  owner: 'Владелец',
  florist: 'Флорист',
  customer: 'Покупатель',
}

export function DemoLoginPage() {
  const { phone, isCustomer, loading, backendUnreachable, doLogin, error, clearError } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [phoneDigits, setPhoneDigits] = useState(DEMO_ACCOUNTS[0]!.phone)
  const [password, setPassword] = useState(DEMO_ACCOUNTS[0]!.password)
  const [pending, setPending] = useState(false)
  const phoneInputRef = useRef<HTMLInputElement>(null)

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/'

  const snapPhoneCaretToEnd = () => {
    queueMicrotask(() => {
      const el = phoneInputRef.current
      if (!el || document.activeElement !== el) return
      const len = el.value.length
      try {
        el.setSelectionRange(len, len)
      } catch {
        /* ignore */
      }
    })
  }

  useLayoutEffect(() => {
    snapPhoneCaretToEnd()
  }, [phoneDigits])

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
    if (isCustomer) return <Navigate to="/" replace />
    return <Navigate to={isDemo ? from : '/'} replace />
  }

  const authFormReady = phoneDigits.length === 11 && password.length >= 6

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!authFormReady || pending) return
    clearError()
    setPending(true)
    try {
      const result = await doLogin(phoneDigits, password)
      if (!result.ok) return
      navigate(from, { replace: true })
    } finally {
      setPending(false)
    }
  }

  const fillAccount = (nextPhone: string, pass: string) => {
    setPhoneDigits(nextPhone)
    setPassword(pass)
    clearError()
  }

  return (
    <div className="login-page">
      <div className="login-page__grid">
        <div className="login-card login-card--form">
          <h1 className="login-card__title">Демо CRM — цветочный магазин</h1>
          <p className="login-card__lead">Выберите роль справа или войдите с подставленными данными.</p>

          <form
            className="crm-form crm-form--tight login-form"
            method="post"
            action="/login"
            autoComplete="on"
            onSubmit={(e) => void submit(e)}
          >
            <CrmTextField
              ref={phoneInputRef}
              label="Телефон"
              id="demo-phone"
              name="username"
              type="tel"
              autoComplete="username tel"
              inputMode="tel"
              value={formatRuPhoneMasked(phoneDigits)}
              onChange={(e) => {
                clearError()
                const prevDisp = formatRuPhoneMasked(phoneDigits)
                setPhoneDigits(applyPhoneFieldChange(phoneDigits, prevDisp, e.target.value))
              }}
              onFocus={snapPhoneCaretToEnd}
              onClick={snapPhoneCaretToEnd}
              onMouseUp={snapPhoneCaretToEnd}
              onSelect={snapPhoneCaretToEnd}
              placeholder="+7 (999) 999-99-99"
              disabled={pending}
            />

            <CrmTextField
              label="Пароль"
              id="demo-password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={pending}
            />

            {error ? (
              <p className="crm-field__error" role="alert">
                {error}
              </p>
            ) : null}

            <CrmButton
              type="submit"
              variant="loginPrimary"
              className="login-form__submit"
              disabled={!authFormReady || pending}
            >
              {pending ? 'Входим…' : 'Войти'}
            </CrmButton>
          </form>
        </div>

        <div className="login-card login-card--accounts">
          <h2 className="login-card__title login-card__title--sub">Тестовые доступы</h2>
          <p className="login-card__lead">Нажмите строку — подставим телефон и пароль.</p>
          <ul className="login-demo-accounts">
            {DEMO_ACCOUNTS.map((account) => (
              <li key={account.phone}>
                <button
                  type="button"
                  className="login-demo-accounts__row"
                  onClick={() => fillAccount(account.phone, account.password)}
                >
                  <span>
                    <strong>{account.label}</strong>
                    <span className="login-demo-accounts__role">{ROLE_LABELS[account.role]}</span>
                  </span>
                  <span className="login-demo-accounts__creds">
                    {formatRuPhoneMasked(account.phone)} / {account.password}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <SiteBackBadge />
    </div>
  )
}
