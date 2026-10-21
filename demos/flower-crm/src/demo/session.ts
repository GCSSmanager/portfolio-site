/** Как SESSION_FLORIST_USER_ID на Django — id FloristUser в localStorage. */
export const SESSION_FLORIST_USER_ID = 'flower-demo.sessionUserId'

export function getSessionUserId(): number | null {
  try {
    const raw = localStorage.getItem(SESSION_FLORIST_USER_ID)
    if (!raw) return null
    const n = Number.parseInt(raw, 10)
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

export function setSessionUserId(id: number | null): void {
  try {
    if (id == null) localStorage.removeItem(SESSION_FLORIST_USER_ID)
    else localStorage.setItem(SESSION_FLORIST_USER_ID, String(id))
  } catch {
    /* ignore */
  }
}

export function clearSessionUserId(): void {
  setSessionUserId(null)
}
