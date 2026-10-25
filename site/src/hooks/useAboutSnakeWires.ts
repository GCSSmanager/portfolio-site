import { useCallback, useEffect, useRef, useState } from 'react'
import {
  computeTelegramOffset,
  measureWireBox,
  wireAcross,
  wireIntoTop,
  wireOutBottom,
  wireSnakeDownIntoTop,
  type WireBox,
} from '@/lib/wire-geometry'

const SNAKE_IDS = ['site', 'd1', 'd2', 'd3', 'd4', 'call', 'met', 'tg', 'job', 'bank', 'stat'] as const
export type SnakeNodeId = (typeof SNAKE_IDS)[number]

function computeSnakePaths(boxes: Record<SnakeNodeId, WireBox>, rootWidth: number) {
  const narrow = window.matchMedia('(max-width: 43rem)').matches
  return [
    wireAcross(boxes.site, 'r', boxes.d1, 'l'),
    wireAcross(boxes.d1, 'r', boxes.call, 'l'),
    wireSnakeDownIntoTop(boxes.call, boxes.d2),
    wireAcross(boxes.d2, 'r', boxes.met, 'l'),
    wireIntoTop(boxes.d2, boxes.tg, rootWidth),
    wireOutBottom(boxes.tg, boxes.d3, rootWidth),
    wireAcross(boxes.d3, 'r', boxes.job, 'l'),
    narrow ? wireAcross(boxes.job, 'l', boxes.d4, 'r') : wireSnakeDownIntoTop(boxes.job, boxes.d4),
    wireAcross(boxes.d4, 'l', boxes.bank, 'r'),
    wireAcross(boxes.d4, 'r', boxes.stat, 'l'),
  ]
}

export function useAboutSnakeWires() {
  const rootRef = useRef<HTMLDivElement>(null)
  const nodesRef = useRef<Partial<Record<SnakeNodeId, HTMLElement>>>({})
  const [layout, setLayout] = useState({ width: 0, height: 0, paths: [] as string[] })
  const [tgDy, setTgDy] = useState(0)

  const setNodeRef = useCallback(
    (id: SnakeNodeId) => (el: HTMLElement | null) => {
      if (el) nodesRef.current[id] = el
      else delete nodesRef.current[id]
    },
    [],
  )

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    let frame = 0

    const measure = () => {
      const tg = nodesRef.current.tg
      const d2 = nodesRef.current.d2
      const d3 = nodesRef.current.d3
      const site = nodesRef.current.site
      const bank = nodesRef.current.bank

      let tgOffset = 0
      if (tg && d2 && d3 && site && bank) {
        tgOffset = computeTelegramOffset(tg, d2, d3, site, bank)
        tg.style.translate = `0 ${tgOffset}px`
        setTgDy((prev) => (prev === tgOffset ? prev : tgOffset))
      }

      const boxes = {} as Record<SnakeNodeId, WireBox>
      for (const id of SNAKE_IDS) {
        const el = nodesRef.current[id]
        if (!el) return
        boxes[id] = measureWireBox(el, root)
      }

      setLayout({
        width: root.clientWidth,
        height: root.clientHeight,
        paths: computeSnakePaths(boxes, root.clientWidth),
      })
    }

    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measure)
    }

    const ro = new ResizeObserver(schedule)
    ro.observe(root)
    root.querySelectorAll('img').forEach((img) => {
      if (!img.complete) img.addEventListener('load', schedule, { once: true })
    })
    window.addEventListener('resize', schedule)
    schedule()

    return () => {
      ro.disconnect()
      window.removeEventListener('resize', schedule)
      cancelAnimationFrame(frame)
    }
  }, [])

  return { rootRef, setNodeRef, tgDy, ...layout }
}
