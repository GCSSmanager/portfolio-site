import { useCallback, useEffect, useRef, useState } from 'react'
import { measureWireBox } from '@/lib/wire-geometry'

type MeasureResult = {
  width: number
  height: number
  paths: string[]
}

export function useMeasuredWirePaths<T extends string>(
  nodeIds: readonly T[],
  compute: (boxes: Record<T, ReturnType<typeof measureWireBox>>, root: HTMLElement) => string[],
) {
  const rootRef = useRef<HTMLDivElement>(null)
  const nodesRef = useRef<Partial<Record<T, HTMLElement>>>({})
  const [layout, setLayout] = useState<MeasureResult>({ width: 0, height: 0, paths: [] })

  const setNodeRef = useCallback(
    (id: T) => (el: HTMLElement | null) => {
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
      const boxes = {} as Record<T, ReturnType<typeof measureWireBox>>
      for (const id of nodeIds) {
        const el = nodesRef.current[id]
        if (!el) return
        boxes[id] = measureWireBox(el, root)
      }
      const paths = compute(boxes, root)
      setLayout({
        width: root.clientWidth,
        height: root.clientHeight,
        paths,
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
  }, [compute, nodeIds])

  return { rootRef, setNodeRef, ...layout }
}
