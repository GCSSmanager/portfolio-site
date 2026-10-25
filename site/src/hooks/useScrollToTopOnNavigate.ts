import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** CRM tab switches should land at the top of the page, not mid-scroll. */
export function useScrollToTopOnNavigate() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
}
