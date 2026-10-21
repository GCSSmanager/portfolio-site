import { useEffect } from 'react'
import { forceUnlockBodyScroll, refreshBodyScrollLock } from '../../utils/bodyScrollLock'

/** Блокирует скролл страницы, пока открыт любой `dialog.crm-modal`. */
export function useCrmDialogScrollLock(): void {
  useEffect(() => {
    const onToggle = (e: Event) => {
      if (e.target instanceof HTMLDialogElement && e.target.classList.contains('crm-modal')) {
        refreshBodyScrollLock()
      }
    }
    document.addEventListener('toggle', onToggle, true)
    return () => {
      document.removeEventListener('toggle', onToggle, true)
      forceUnlockBodyScroll()
    }
  }, [])
}
