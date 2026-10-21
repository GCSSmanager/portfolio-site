import { handleDemoFetch } from './handlers'

let installed = false

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.href
  return input.url
}

/** Подмена fetch для /api/* — данные из localStorage (см. store.ts). */
export function installDemoFetch() {
  if (installed || typeof window === 'undefined') return
  installed = true
  const nativeFetch = window.fetch.bind(window)
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const raw = requestUrl(input)
    try {
      const url = new URL(raw, window.location.origin)
      if (url.pathname.startsWith('/api/')) {
        return handleDemoFetch(`${url.pathname}${url.search}`, init)
      }
    } catch {
      /* not a URL we can intercept */
    }
    return nativeFetch(input, init)
  }
}
