import { useEffect, useRef, useState } from 'react'
import { useDemoShellOptional } from '../../demo-shell'
import { notifyAuthSessionInvalid } from '../../api/apiFetch'
import { clearSessionUserId } from '../../demo/session'
import { resetDb } from '../../demo/store'
import { siteBackHref } from '../../demo/site'
import './site-back-badge.css'

/** Плашка с логотипом справа снизу — меню демо. */
export function SiteBackBadge() {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const shell = useDemoShellOptional()

  useEffect(() => {
    if (!open) return
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const exitDemo = () => {
    window.location.href = siteBackHref()
  }

  const resetDemo = () => {
    if (!window.confirm('Сбросить демо к исходным данным?')) return
    clearSessionUserId()
    resetDb()
    notifyAuthSessionInvalid()
  }

  return (
    <div ref={rootRef} className="site-back-badge">
      {open && (
        <div className="site-back-badge__menu">
          {shell && shell.config.pageTipsEnabled !== false && (
            <>
              {shell.hasPageTip && (
                <>
                  <button
                    type="button"
                    className="site-back-badge__menu-item"
                    onClick={() => {
                      setOpen(false)
                      shell.openCurrentTip()
                    }}
                  >
                    Подсказка страницы
                  </button>
                  <div className="site-back-badge__menu-divider" />
                </>
              )}
              <button
                type="button"
                className="site-back-badge__menu-item"
                onClick={() => shell.setTipsMuted(!shell.tipsMuted)}
              >
                {shell.tipsMuted ? 'Включить подсказки' : 'Выключить подсказки'}
              </button>
              <div className="site-back-badge__menu-divider" />
            </>
          )}
          <button type="button" className="site-back-badge__menu-item" onClick={resetDemo}>
            Сбросить демо
          </button>
          <div className="site-back-badge__menu-divider" />
          <button type="button" className="site-back-badge__menu-item" onClick={exitDemo}>
            Выйти из демо
          </button>
        </div>
      )}

      <button
        type="button"
        className={`site-back-badge__fab${open ? ' site-back-badge__fab--open' : ''}`}
        aria-label="Меню демо"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <img
          src={`${import.meta.env.BASE_URL}gcss-logo.webp`}
          alt=""
          width={48}
          height={48}
          decoding="async"
        />
      </button>
    </div>
  )
}
