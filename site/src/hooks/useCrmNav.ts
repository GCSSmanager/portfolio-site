import { useCallback, useEffect, useState } from 'react'

export function useCrmNav() {
  const [isOpen, setIsOpen] = useState(false)

  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((open) => !open), [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [close])


  return {
    isOpen,
    toggle,
    close,
    burgerLabel: isOpen ? 'Закрыть' : 'Меню',
    burgerAria: isOpen ? 'Закрыть меню' : 'Открыть меню',
  }
}
