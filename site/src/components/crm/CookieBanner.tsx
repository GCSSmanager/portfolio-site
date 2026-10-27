import { useState } from 'react'
import { Link } from 'react-router-dom'

const STORAGE_KEY = 'gcss-cookie-ok'

function shouldShowCookieBanner() {
  try {
    return !localStorage.getItem(STORAGE_KEY)
  } catch {
    return true
  }
}

export function CookieBanner() {
  const [visible, setVisible] = useState(shouldShowCookieBanner)

  if (!visible) return null

  return (
    <div className="crm-cookie">
      <p className="crm-cookie__text">
        Мы используем cookie. Продолжая пользоваться сайтом, вы соглашаетесь с{' '}
        <Link to="/legal/privacy/">политикой конфиденциальности</Link>.
      </p>
      <button
        className="crm-cookie__close"
        type="button"
        aria-label="Закрыть"
        onClick={() => {
          try {
            localStorage.setItem(STORAGE_KEY, '1')
          } catch {
            /* ignore */
          }
          setVisible(false)
        }}
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="M3 3l10 10M13 3L3 13" />
        </svg>
      </button>
    </div>
  )
}
