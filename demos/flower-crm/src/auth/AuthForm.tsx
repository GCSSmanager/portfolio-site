import { type FormEvent, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CrmTextField } from '../components/form'
import { CrmButton } from '../components/ui/CrmButton'
import { useAuth, type FloristRole } from './AuthContext'
import { applyPhoneFieldChange, formatRuPhoneMasked } from './phoneInput'
import { completeAuthSession } from './authSession'

type Props = {
  onAuthenticated?: (result: { subscriptionActive: boolean; role: FloristRole }) => void
}

const isDemo = import.meta.env.VITE_DEMO_MODE === 'true'

/** Форма входа / регистрации (отдельная страница — Safari сохраняет пароль надёжнее, чем в `<dialog>`). */
export function AuthForm({ onAuthenticated }: Props) {
  const { error, clearError, doLogin, doRegister } = useAuth()
  const [phoneDigits, setPhoneDigits] = useState('')
  const [password, setPassword] = useState('')
  const [passwordAutoComplete, setPasswordAutoComplete] = useState<'current-password' | 'new-password'>(
    'current-password',
  )
  const [submitting, setSubmitting] = useState(false)

  const phoneInputRef = useRef<HTMLInputElement>(null)

  const snapPhoneCaretToEnd = () => {
    queueMicrotask(() => {
      const el = phoneInputRef.current
      if (!el || document.activeElement !== el) return
      const len = el.value.length
      try {
        el.setSelectionRange(len, len)
      } catch {
        /* игнорируем */
      }
    })
  }

  useLayoutEffect(() => {
    snapPhoneCaretToEnd()
  }, [phoneDigits])

  const authFormReady = phoneDigits.length === 11 && password.length >= 6

  const submitAuth = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!authFormReady || submitting) return
    const submitter = (e.nativeEvent as SubmitEvent).submitter
    const isRegister =
      submitter instanceof HTMLButtonElement && submitter.name === 'auth' && submitter.value === 'register'
    if (isRegister && isDemo) return

    setSubmitting(true)
    try {
      const result = await (isRegister ? doRegister : doLogin)(phoneDigits, password)
      if (!result.ok) return
      if (onAuthenticated) {
        onAuthenticated({
          subscriptionActive: result.subscriptionActive,
          role: result.role,
        })
      } else {
        completeAuthSession(result.subscriptionActive, result.role)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      className="crm-form crm-form--tight login-form"
      method="post"
      action="/login"
      autoComplete="on"
      onSubmit={(e) => void submitAuth(e)}
    >
      <p className="login-card__lead">
        Войдите по номеру телефона и паролю или создайте личный аккаунт.
      </p>
      <CrmTextField
        ref={phoneInputRef}
        label="Телефон"
        id="login-phone"
        name="username"
        type="tel"
        autoComplete="username"
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
        placeholder="+7 (900) 123-45-67"
        disabled={submitting}
      />
      <CrmTextField
        label="Пароль"
        id="login-password"
        name="password"
        type="password"
        autoComplete={passwordAutoComplete}
        value={password}
        onChange={(e) => {
          clearError()
          setPassword(e.target.value)
        }}
        placeholder="не менее 6 символов"
        disabled={submitting}
      />
      {error ? (
        <p className="crm-field__error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="login-form__reset-row">
        <CrmButton variant="loginReset" title="Обратитесь к управляющему" disabled={submitting}>
          Сброс пароля
        </CrmButton>
      </div>
      <div className="login-actions">
        <CrmButton
          type="submit"
          name="auth"
          value="login"
          variant="loginPrimary"
          disabled={!authFormReady || submitting}
          onPointerDown={() => setPasswordAutoComplete('current-password')}
        >
          {submitting ? '…' : 'Войти'}
        </CrmButton>
        <CrmButton
          type="submit"
          name="auth"
          value="register"
          variant="loginSecondary"
          disabled={!authFormReady || submitting || isDemo}
          title={isDemo ? 'В демо регистрация отключена' : undefined}
          onPointerDown={() => setPasswordAutoComplete('new-password')}
        >
          {isDemo ? 'Регистрация недоступна' : 'Регистрация'}
        </CrmButton>
      </div>
      <p className="login-form__back">
        <Link to="/">На главную</Link>
      </p>
    </form>
  )
}
