/** Ошибка сети / сервер не отвечает (fetch бросает TypeError и т.п.). */
export function isUnreachableFetchError(e: unknown): boolean {
  if (e instanceof TypeError) return true
  if (e instanceof DOMException && e.name === 'AbortError') return false
  return false
}

/** Ответ прокси/nginx при недоступном upstream (Django), без «настоящего» JSON API. */
export function isUpstreamErrorStatus(status: number): boolean {
  return status === 502 || status === 503 || status === 504
}
