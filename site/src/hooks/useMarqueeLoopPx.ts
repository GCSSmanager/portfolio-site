import { useLayoutEffect, useState, type RefObject } from 'react'

/** Пиксельный шаг = половина track (две одинаковые группы), без % и без дрейфа от lazy-load. */
const PX_PER_SEC = 76

export function useMarqueeLoopPx(trackRef: RefObject<HTMLElement | null>) {
  const [ready, setReady] = useState(false)

  useLayoutEffect(() => {
    const track = trackRef.current
    if (!track) return

    let raf = 0

    const sync = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const firstGroup = track.firstElementChild
        const half =
          firstGroup instanceof HTMLElement
            ? firstGroup.offsetWidth
            : track.scrollWidth / 2
        if (half < 1) return

        track.style.setProperty('--crm-partners-loop', `${half}px`)
        track.style.setProperty('--crm-partners-duration', `${half / PX_PER_SEC}s`)
        setReady(true)
      })
    }

    const ro = new ResizeObserver(sync)
    ro.observe(track)

    track.querySelectorAll('img').forEach((img) => {
      if (img.complete) return
      img.addEventListener('load', sync, { once: true })
      img.addEventListener('error', sync, { once: true })
    })

    sync()

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [trackRef])

  return ready
}
