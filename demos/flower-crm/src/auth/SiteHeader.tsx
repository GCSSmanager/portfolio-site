import { useCallback, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { apiFetch } from '../api/apiFetch'
import { catalogNavState } from '../utils/catalogNav'
import { useAuth } from './AuthContext'
import { NavMenuIcon } from './navMenuIcons'
import { NavMenuModal } from './NavMenuModal'
import {
  DEFAULT_NAV_MENU_ITEMS,
  navMenuPatchPayload,
  parseNavMenuItems,
  type NavMenuItem,
} from './navMenuTypes'
import './auth.css'
import './navMenu.css'

function renderHeaderLink(
  item: NavMenuItem,
  navLinkClass: ({ isActive }: { isActive: boolean }) => string,
  catalogState: ReturnType<typeof catalogNavState>,
) {
  const content = (
    <>
      <NavMenuIcon id={item.id} className="auth-site-header__pill-icon" />
      <span className="auth-site-header__pill-text">{item.label}</span>
    </>
  )

  if (item.id === 'catalog') {
    return (
      <NavLink
        key={item.id}
        to={item.path}
        end={item.end}
        state={catalogState}
        className={navLinkClass}
        aria-label={item.label}
        title={item.label}
      >
        {content}
      </NavLink>
    )
  }

  return (
    <NavLink
      key={item.id}
      to={item.path}
      end={item.end}
      className={navLinkClass}
      aria-label={item.label}
      title={item.label}
    >
      {content}
    </NavLink>
  )
}

export function SiteHeader() {
  const { phone, logout, isOwner, isCustomer, navMenu, navMenuCanEdit, setNavMenu } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPersistError, setMenuPersistError] = useState<string | null>(null)

  const catalogState = catalogNavState(location.pathname)
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `auth-site-header__pill${isActive ? ' auth-site-header__pill--active' : ''}`

  const menuItems =
    navMenu.length > 0
      ? navMenu
      : DEFAULT_NAV_MENU_ITEMS.filter((x) => isOwner || !x.owner_only)
  const headerItems = menuItems.filter((x) => x.visible)

  const openSection = useCallback(
    (path: string) => {
      setMenuOpen(false)
      if (path === '/catalog') {
        navigate(path, { state: catalogNavState(location.pathname) })
      } else {
        navigate(path)
      }
    },
    [navigate, location.pathname],
  )

  const handleLogout = useCallback(async () => {
    setMenuOpen(false)
    await logout()
    navigate('/login', { replace: true })
  }, [logout, navigate])

  const persistNavMenu = useCallback(
    async (items: NavMenuItem[]) => {
      setNavMenu(items)
      setMenuPersistError(null)
      try {
        const res = await apiFetch('/api/me/nav-menu/', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(navMenuPatchPayload(items)),
        })
        const data = (await res.json()) as { error?: string; items?: unknown }
        if (!res.ok) {
          setMenuPersistError(typeof data.error === 'string' ? data.error : `Ошибка ${res.status}`)
          return
        }
        const saved = parseNavMenuItems(data.items)
        if (saved.length) setNavMenu(saved)
      } catch {
        setMenuPersistError('Не удалось сохранить меню')
      }
    },
    [setNavMenu],
  )

  if (!phone) return null

  if (isCustomer) {
    return (
      <header className="auth-site-header auth-site-header--customer">
        <NavLink to="/" className="auth-site-header__brand" end>
          Цветочная CRM
        </NavLink>
        <button type="button" className="auth-site-header__pill" onClick={() => void handleLogout()}>
          Выйти
        </button>
      </header>
    )
  }

  return (
    <header className="auth-site-header">
      <nav className="auth-site-header__start" aria-label="Разделы сайта">
        <button
          type="button"
          className="auth-site-header__burger"
          aria-label="Меню разделов"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(true)}
        >
          <svg
            className="auth-site-header__burger-icon"
            viewBox="0 0 16 16"
            aria-hidden
            focusable="false"
          >
            <path
              d="M2 4.25h12M2 8h12M2 11.75h12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
        {headerItems.map((item) => renderHeaderLink(item, navLinkClass, catalogState))}
      </nav>

      <NavMenuModal
        open={menuOpen}
        onClose={() => {
          setMenuOpen(false)
          setMenuPersistError(null)
        }}
        items={menuItems}
        canEdit={navMenuCanEdit}
        persistError={menuPersistError}
        onPersist={navMenuCanEdit ? (items) => void persistNavMenu(items) : undefined}
        onOpenSection={openSection}
        phone={phone}
        onLogout={() => void handleLogout()}
      />
    </header>
  )
}
