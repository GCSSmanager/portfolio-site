import { useEffect, useRef, useState } from 'react'
import { useDemoShellOptional } from '../../demo-shell'
import { notifyAuthSessionInvalid } from '../../api/apiFetch'
import { clearSessionUserId } from '../../demo/session'
import { resetDb } from '../../demo/store'
import { siteBackHref } from '../../demo/site'
import './site-back-badge.css'

const CTA_DELAY_MS = 10_000

type Props = {
  onDiscuss?: () => void
}

/** Плашка с логотипом справа снизу — меню демо + «Обсудить внедрение». */
export function SiteBackBadge({ onDiscuss }: Props) {
  const [open, setOpen] = useState(false)
  const [ctaVisible, setCtaVisible] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const shell = useDemoShellOptional()

  useEffect(() => {
    if (!onDiscuss) return
    const timer = window.setTimeout(() => setCtaVisible(true), CTA_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [onDiscuss])

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
          {onDiscuss && (
            <>
              <button
                type="button"
                className="site-back-badge__menu-item site-back-badge__menu-item--discuss"
                onClick={() => {
                  setOpen(false)
                  onDiscuss()
                }}
              >
                <span>Обсудить внедрение</span>
                <span className="site-back-badge__deal">−10%</span>
              </button>
              <div className="site-back-badge__menu-divider" />
            </>
          )}
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

      {onDiscuss && ctaVisible && !open && (
        <button
          type="button"
          className="site-back-badge__cta"
          onClick={onDiscuss}
        >
          <span>Обсудить внедрение</span>
          <span className="site-back-badge__deal">−10%</span>
        </button>
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
