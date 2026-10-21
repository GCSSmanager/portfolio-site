import { installDemoFetch } from '../demo/install'
import { isUnreachableFetchError, isUpstreamErrorStatus } from '../utils/networkError'

if (import.meta.env.VITE_DEMO_MODE === 'true') {
  installDemoFetch()
}

/** Событие для AuthProvider: любой запрос с сетевой ошибкой или 502/503/504. */
export const BACKEND_UNREACHABLE_EVENT = 'flowerflow:backend-unreachable'

/** Событие: бэкенд вернул 403 с кодом истёкшей подписки. */
export const FLOWERFLOW_SUBSCRIPTION_EXPIRED_EVENT = 'flowerflow:subscription-expired'

/** Сессия сброшена или недействительна (401 на защищённом API). */
export const AUTH_SESSION_INVALID_EVENT = 'flowerflow:session-invalid'

function requestPath(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    try {
      return new URL(input, window.location.origin).pathname
    } catch {
      return input
    }
  }
  if (input instanceof URL) return input.pathname
  if (input instanceof Request) {
    try {
      return new URL(input.url).pathname
    } catch {
      return input.url
    }
  }
  return ''
}

function isLoginOrRegisterAttempt(path: string): boolean {
  return /\/api\/auth\/(?:login|register)\/?$/.test(path)
}

export function notifyAuthSessionInvalid(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AUTH_SESSION_INVALID_EVENT))
  }
}

export function notifyBackendUnreachable(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(BACKEND_UNREACHABLE_EVENT))
  }
}

function notifySubscriptionExpired(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(FLOWERFLOW_SUBSCRIPTION_EXPIRED_EVENT))
  }
}

/**
 * Обёртка над fetch для API: при обрыве сети или ответе прокси 502/503/504
 * поднимает событие — приложение уходит на страницу «сервер недоступен».
 * По умолчанию credentials: 'include'.
 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const nextInit: RequestInit = {
    ...init,
    credentials: init?.credentials ?? 'include',
  }
  try {
    const res = await fetch(input, nextInit)
    if (
      res.status === 401 &&
      typeof window !== 'undefined' &&
      !isLoginOrRegisterAttempt(requestPath(input))
    ) {
      notifyAuthSessionInvalid()
    }
    if (!res.ok && isUpstreamErrorStatus(res.status)) {
      notifyBackendUnreachable()
    }
    if (
      typeof window !== 'undefined' &&
      res.status === 403 &&
      (init?.credentials ?? 'include') !== 'omit'
    ) {
      try {
        const data: unknown = await res.clone().json()
        const code =
          data &&
          typeof data === 'object' &&
          data !== null &&
          'code' in data &&
          typeof (data as { code?: unknown }).code === 'string'
            ? (data as { code: string }).code
            : null
        if (code === 'subscription_expired') {
          notifySubscriptionExpired()
        }
      } catch {
        /* не JSON или пустое тело */
      }
    }
    return res
  } catch (e: unknown) {
    if (isUnreachableFetchError(e)) {
      notifyBackendUnreachable()
    }
    throw e
  }
}
