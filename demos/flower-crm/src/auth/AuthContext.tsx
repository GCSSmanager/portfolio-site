import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  apiFetch,
  BACKEND_UNREACHABLE_EVENT,
  FLOWERFLOW_SUBSCRIPTION_EXPIRED_EVENT,
} from '../api/apiFetch'
import { isUnreachableFetchError, isUpstreamErrorStatus } from '../utils/networkError'
import { formatRuPhoneMasked } from './phoneInput'
import { clearSessionUserId } from '../demo/session'
import { parseNavMenuItems, type NavMenuItem } from './navMenuTypes'

export type FloristRole = 'owner' | 'florist' | 'customer'

export type AuthRefreshResult = {
  reachable: boolean
  authenticated: boolean
}

export type AuthActionResult =
  | { ok: true; subscriptionActive: boolean; role: FloristRole }
  | { ok: false }

function parseSubscriptionActive(data: Record<string, unknown>): boolean {
  const v = data.subscription_active
  return typeof v === 'boolean' ? v : true
}

function parseSubscriptionUntil(data: Record<string, unknown>): string | null {
  const v = data.subscription_until
  return typeof v === 'string' && v.length > 0 ? v : null
}

function parseFloristRole(data: Record<string, unknown>): FloristRole {
  if (data.role === 'florist') return 'florist'
  if (data.role === 'customer') return 'customer'
  return 'owner'
}

function applyAuthUserPayload(
  data: Record<string, unknown>,
  setters: {
    setPhone: (v: string | null) => void
    setSubscriptionActive: (v: boolean) => void
    setRole: (v: FloristRole) => void
    setNavMenu: (v: NavMenuItem[]) => void
    setNavMenuCanEdit: (v: boolean) => void
    setSubscriptionUntil: (v: string | null) => void
  },
): boolean {
  const rawPhone = data.phone
  const nextPhone =
    typeof rawPhone === 'string' ? rawPhone : rawPhone === null ? null : null
  setters.setPhone(nextPhone)
  setters.setSubscriptionActive(nextPhone ? parseSubscriptionActive(data) : true)
  setters.setSubscriptionUntil(nextPhone ? parseSubscriptionUntil(data) : null)
  setters.setRole(nextPhone ? parseFloristRole(data) : 'owner')
  setters.setNavMenu(nextPhone ? parseNavMenuItems(data.nav_menu) : [])
  setters.setNavMenuCanEdit(Boolean(nextPhone && data.nav_menu_can_edit === true))
  return !!nextPhone
}

type AuthContextValue = {
  phone: string | null
  /** Подписка действует (или без срока); иначе ЛК недоступен. */
  subscriptionActive: boolean
  /** ISO-дата окончания подписки или null (бессрочно). */
  subscriptionUntil: string | null
  /** Владелец магазина — полный доступ; флорист — ограниченный; customer — личный аккаунт. */
  role: FloristRole
  isOwner: boolean
  isCustomer: boolean
  navMenu: NavMenuItem[]
  navMenuCanEdit: boolean
  setNavMenu: (items: NavMenuItem[]) => void
  loading: boolean
  error: string | null
  backendUnreachable: boolean
  refresh: () => Promise<AuthRefreshResult>
  clearBackendUnreachable: () => void
  doLogin: (phone: string, password: string) => Promise<AuthActionResult>
  doRegister: (phone: string, password: string) => Promise<AuthActionResult>
  logout: () => Promise<void>
  /** Очистить клиентскую сессию без запроса logout (401, сброс демо). */
  clearLocalSession: () => void
  clearError: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [phone, setPhone] = useState<string | null>(null)
  const [role, setRole] = useState<FloristRole>('owner')
  const [navMenu, setNavMenu] = useState<NavMenuItem[]>([])
  const [navMenuCanEdit, setNavMenuCanEdit] = useState(false)
  const [subscriptionActive, setSubscriptionActive] = useState(true)
  const [subscriptionUntil, setSubscriptionUntil] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [backendUnreachable, setBackendUnreachable] = useState(false)

  const clearBackendUnreachable = useCallback(() => setBackendUnreachable(false), [])

  useEffect(() => {
    const onDown = () => setBackendUnreachable(true)
    window.addEventListener(BACKEND_UNREACHABLE_EVENT, onDown)
    return () => window.removeEventListener(BACKEND_UNREACHABLE_EVENT, onDown)
  }, [])

  useEffect(() => {
    const onExpired = () => setSubscriptionActive(false)
    window.addEventListener(FLOWERFLOW_SUBSCRIPTION_EXPIRED_EVENT, onExpired)
    return () =>
      window.removeEventListener(FLOWERFLOW_SUBSCRIPTION_EXPIRED_EVENT, onExpired)
  }, [])

  const refresh = useCallback(async (): Promise<AuthRefreshResult> => {
    setLoading(true)
    try {
      const res = await apiFetch('/api/auth/me/')
      if (!res.ok && isUpstreamErrorStatus(res.status)) {
        setPhone(null)
        setSubscriptionActive(true)
        setRole('owner')
        setNavMenu([])
        setNavMenuCanEdit(false)
        setSubscriptionUntil(null)
        return { reachable: false, authenticated: false }
      }
      setBackendUnreachable(false)
      if (!res.ok) {
        setPhone(null)
        setSubscriptionActive(true)
        setRole('owner')
        setNavMenu([])
        setNavMenuCanEdit(false)
        setSubscriptionUntil(null)
        return { reachable: true, authenticated: false }
      }
      const data = (await res.json()) as Record<string, unknown>
      const authed = applyAuthUserPayload(data, {
        setPhone,
        setSubscriptionActive,
        setRole,
        setNavMenu,
        setNavMenuCanEdit,
        setSubscriptionUntil,
      })
      return { reachable: true, authenticated: authed }
    } catch (e: unknown) {
      if (isUnreachableFetchError(e)) {
        setPhone(null)
        setSubscriptionActive(true)
        setRole('owner')
        setNavMenu([])
        setNavMenuCanEdit(false)
        setSubscriptionUntil(null)
        return { reachable: false, authenticated: false }
      }
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const doLogin = useCallback(async (rawPhone: string, rawPassword: string) => {
    setError(null)
    try {
      const res = await apiFetch('/api/auth/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: rawPhone, password: rawPassword }),
      })
      if (!res.ok && isUpstreamErrorStatus(res.status)) {
        return { ok: false as const }
      }
      setBackendUnreachable(false)
      const data = (await res.json()) as Record<string, unknown> & {
        ok?: boolean
        error?: string
        phone?: string | null
      }
      if (!res.ok) {
        const errMsg = typeof data.error === 'string' ? data.error : `Ошибка ${res.status}`
        setError(errMsg)
        return { ok: false as const }
      }
      applyAuthUserPayload(data, {
        setPhone,
        setSubscriptionActive,
        setRole,
        setNavMenu,
        setNavMenuCanEdit,
        setSubscriptionUntil,
      })
      const active = parseSubscriptionActive(data)
      return {
        ok: true as const,
        subscriptionActive: active,
        role: parseFloristRole(data),
      }
    } catch {
      setError('Запрос не выполнен')
      return { ok: false as const }
    }
  }, [])

  const doRegister = useCallback(async (rawPhone: string, rawPassword: string) => {
    setError(null)
    try {
      const res = await apiFetch('/api/auth/register/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: rawPhone, password: rawPassword }),
      })
      if (!res.ok && isUpstreamErrorStatus(res.status)) {
        return { ok: false as const }
      }
      setBackendUnreachable(false)
      const data = (await res.json()) as Record<string, unknown> & {
        ok?: boolean
        error?: string
        phone?: string | null
      }
      if (!res.ok) {
        const errMsg = typeof data.error === 'string' ? data.error : `Ошибка ${res.status}`
        setError(errMsg)
        return { ok: false as const }
      }
      applyAuthUserPayload(data, {
        setPhone,
        setSubscriptionActive,
        setRole,
        setNavMenu,
        setNavMenuCanEdit,
        setSubscriptionUntil,
      })
      const active = parseSubscriptionActive(data)
      return {
        ok: true as const,
        subscriptionActive: active,
        role: parseFloristRole(data),
      }
    } catch {
      setError('Запрос не выполнен')
      return { ok: false as const }
    }
  }, [])

  const clearLocalSession = useCallback(() => {
    clearSessionUserId()
    setPhone(null)
    setSubscriptionActive(true)
    setRole('owner')
    setNavMenu([])
    setNavMenuCanEdit(false)
    setSubscriptionUntil(null)
    setBackendUnreachable(false)
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiFetch('/api/auth/logout/', { method: 'POST' })
    } catch {
      /* сеть: событие уже отправлено apiFetch */
    } finally {
      clearLocalSession()
    }
  }, [clearLocalSession])

  const clearError = useCallback(() => setError(null), [])

  const value = useMemo(
    () => ({
      phone,
      subscriptionActive,
      subscriptionUntil,
      role,
      isOwner: role === 'owner',
      isCustomer: role === 'customer',
      navMenu,
      navMenuCanEdit,
      setNavMenu,
      loading,
      error,
      backendUnreachable,
      refresh,
      clearBackendUnreachable,
      doLogin,
      doRegister,
      logout,
      clearLocalSession,
      clearError,
    }),
    [
      phone,
      subscriptionActive,
      subscriptionUntil,
      role,
      navMenu,
      navMenuCanEdit,
      loading,
      error,
      backendUnreachable,
      refresh,
      clearBackendUnreachable,
      doLogin,
      doRegister,
      logout,
      clearLocalSession,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

/** Красивый номер из ответа API (79001234567) или уже отформатированной строки */
export function formatPhoneDisplay(stored: string): string {
  const d = stored.replace(/\D/g, '')
  if (!d.length) return stored
  if (!d.startsWith('7')) {
    return formatRuPhoneMasked(`7${d}`.slice(0, 11))
  }
  return formatRuPhoneMasked(d.slice(0, 11))
}
