import { useEffect, useState } from 'react'

/** Скрыть таб, когда верх #reviews доехал до зоны под sticky-шапкой (nav + таб). */
const REVIEWS_TAB_HIDE_TOP_PX = 5.5 * 16

export function useReviewsTabScrollVisible(enabled: boolean) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (!enabled) {
      setVisible(false)
      return
    }

    const update = () => {
      const reviews = document.getElementById('reviews')
      if (!reviews) {
        setVisible(true)
        return
      }
      setVisible(reviews.getBoundingClientRect().top > REVIEWS_TAB_HIDE_TOP_PX)
    }

    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update, { passive: true })
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [enabled])

  return visible
}
