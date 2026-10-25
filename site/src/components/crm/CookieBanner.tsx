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
        className="crm-cookie__ok"
        type="button"
        onClick={() => {
          try {
            localStorage.setItem(STORAGE_KEY, '1')
          } catch {
            /* ignore */
          }
          setVisible(false)
        }}
      >
        Понятно
      </button>
    </div>
  )
}
