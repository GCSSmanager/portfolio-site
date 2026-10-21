import type { FloristRole } from './AuthContext'

/** Куда вести после успешного входа (полная перезагрузка — для Keychain / Safari). */
export function authPostLoginPath(subscriptionActive: boolean, role: FloristRole = 'owner'): string {
  if (role === 'customer') return '/'
  if (subscriptionActive) return '/'
  return role === 'owner' ? '/subscription' : '/subscription-required'
}

export function completeAuthSession(
  subscriptionActive: boolean,
  role: FloristRole = 'owner',
): void {
  window.location.replace(authPostLoginPath(subscriptionActive, role))
}
