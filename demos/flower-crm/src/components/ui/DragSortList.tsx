import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import './drag-sort-list.css'

const SCROLL_EDGE_PX = 52
const SCROLL_MAX_STEP = 16

export type DragSortListHandleProps = {
  onPointerDown: (e: React.PointerEvent<HTMLElement>) => void
  'aria-label'?: string
}

export type DragSortListRenderProps = {
  isDragging: boolean
  dragHandleProps: DragSortListHandleProps | null
}

export type DragSortListProps<T> = {
  items: T[]
  getItemId: (item: T) => string
  onReorder: (items: T[]) => void
  onDragEnd?: (items: T[]) => void
  disabled?: boolean
  className?: string
  itemClassName?: string | ((item: T, isDragging: boolean) => string)
  renderItem: (item: T, ctx: DragSortListRenderProps) => ReactNode
}

function moveToIndex<T>(list: T[], from: number, to: number): T[] {
  if (from < 0 || from >= list.length || from === to) return list
  const next = [...list]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

function targetIndexAtY(rowEls: HTMLLIElement[], clientY: number): number {
  for (let i = 0; i < rowEls.length; i++) {
    const rect = rowEls[i]!.getBoundingClientRect()
    if (clientY < rect.top + rect.height / 2) return i
  }
  return Math.max(0, rowEls.length - 1)
}

function findScrollParent(el: HTMLElement | null): HTMLElement | null {
  let node: HTMLElement | null = el
  while (node) {
    const { overflowY } = getComputedStyle(node)
    if (overflowY === 'auto' || overflowY === 'scroll') return node
    node = node.parentElement
  }
  return null
}

export function DragSortList<T>({
  items,
  getItemId,
  onReorder,
  onDragEnd,
  disabled = false,
  className,
  itemClassName,
  renderItem,
}: DragSortListProps<T>) {
  const [draggingId, setDraggingId] = useState<string | null>(null)

  const listRef = useRef<HTMLUListElement>(null)
  const rowRefs = useRef<Map<string, HTMLLIElement>>(new Map())
  const dragIdRef = useRef<string | null>(null)
  const itemsRef = useRef(items)
  const scrollParentRef = useRef<HTMLElement | null>(null)
  const lastClientYRef = useRef(0)
  const autoScrollRafRef = useRef(0)
  const reorderRafRef = useRef(0)

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  const rowElementsInOrder = useCallback((): HTMLLIElement[] => {
    return itemsRef.current
      .map((item) => rowRefs.current.get(getItemId(item)))
      .filter((el): el is HTMLLIElement => el != null)
  }, [getItemId])

  const tryReorderAtY = useCallback(
    (clientY: number) => {
      const activeId = dragIdRef.current
      if (!activeId) return

      const rowEls = rowElementsInOrder()
      if (rowEls.length === 0) return

      const target = targetIndexAtY(rowEls, clientY)
      const list = itemsRef.current
      const from = list.findIndex((x) => getItemId(x) === activeId)
      if (from < 0 || from === target) return

      const next = moveToIndex(list, from, target)
      itemsRef.current = next
      onReorder(next)
    },
    [getItemId, onReorder, rowElementsInOrder],
  )

  const tryReorderRef = useRef(tryReorderAtY)
  tryReorderRef.current = tryReorderAtY

  const onDragEndRef = useRef(onDragEnd)
  onDragEndRef.current = onDragEnd

  const autoScrollStep = useCallback(() => {
    const scroller = scrollParentRef.current
    if (!scroller || !dragIdRef.current) return

    const y = lastClientYRef.current
    const rect = scroller.getBoundingClientRect()

    if (y < rect.top) {
      scroller.scrollTop -= SCROLL_MAX_STEP
      return
    }
    if (y > rect.bottom) {
      scroller.scrollTop += SCROLL_MAX_STEP
      return
    }

    const fromTop = y - rect.top
    const fromBottom = rect.bottom - y

    if (fromTop < SCROLL_EDGE_PX) {
      const step = Math.max(2, Math.ceil(((SCROLL_EDGE_PX - fromTop) / SCROLL_EDGE_PX) * SCROLL_MAX_STEP))
      scroller.scrollTop -= step
    } else if (fromBottom < SCROLL_EDGE_PX) {
      const step = Math.max(2, Math.ceil(((SCROLL_EDGE_PX - fromBottom) / SCROLL_EDGE_PX) * SCROLL_MAX_STEP))
      scroller.scrollTop += step
    }
  }, [])

  const autoScrollLoop = useCallback(() => {
    autoScrollStep()
    autoScrollRafRef.current = requestAnimationFrame(autoScrollLoop)
  }, [autoScrollStep])

  const stopAutoScroll = useCallback(() => {
    if (autoScrollRafRef.current) {
      cancelAnimationFrame(autoScrollRafRef.current)
      autoScrollRafRef.current = 0
    }
  }, [])

  const onWindowPointerMove = useCallback((e: PointerEvent) => {
    if (!dragIdRef.current) return
    lastClientYRef.current = e.clientY

    if (!reorderRafRef.current) {
      reorderRafRef.current = requestAnimationFrame(() => {
        reorderRafRef.current = 0
        tryReorderRef.current(lastClientYRef.current)
      })
    }
  }, [])

  const onWindowPointerUp = useCallback(() => {
    const hadDrag = dragIdRef.current != null
    const snapshot = itemsRef.current
    dragIdRef.current = null
    setDraggingId(null)
    document.documentElement.classList.remove('drag-sort-active')
    document.body.style.cursor = ''
    stopAutoScroll()
    window.removeEventListener('pointermove', onWindowPointerMove)
    window.removeEventListener('pointerup', onWindowPointerUp)
    window.removeEventListener('pointercancel', onWindowPointerUp)
    if (reorderRafRef.current) {
      cancelAnimationFrame(reorderRafRef.current)
      reorderRafRef.current = 0
    }
    if (hadDrag && onDragEndRef.current) onDragEndRef.current(snapshot)
  }, [stopAutoScroll])

  const onWindowPointerUpRef = useRef(onWindowPointerUp)
  onWindowPointerUpRef.current = onWindowPointerUp

  const onWindowPointerMoveRef = useRef(onWindowPointerMove)
  onWindowPointerMoveRef.current = onWindowPointerMove

  const detachPointer = useCallback(() => {
    window.removeEventListener('pointermove', onWindowPointerMoveRef.current)
    window.removeEventListener('pointerup', onWindowPointerUpRef.current)
    window.removeEventListener('pointercancel', onWindowPointerUpRef.current)
    document.documentElement.classList.remove('drag-sort-active')
    document.body.style.cursor = ''
    stopAutoScroll()
    if (reorderRafRef.current) {
      cancelAnimationFrame(reorderRafRef.current)
      reorderRafRef.current = 0
    }
  }, [stopAutoScroll])

  const startDrag = useCallback(
    (id: string, e: React.PointerEvent<HTMLElement>) => {
      if (disabled) return
      e.preventDefault()
      e.stopPropagation()

      scrollParentRef.current = findScrollParent(listRef.current)
      lastClientYRef.current = e.clientY

      dragIdRef.current = id
      setDraggingId(id)
      document.documentElement.classList.add('drag-sort-active')
      document.body.style.cursor = 'grabbing'

      stopAutoScroll()
      autoScrollRafRef.current = requestAnimationFrame(autoScrollLoop)

      window.addEventListener('pointermove', onWindowPointerMoveRef.current, { passive: true })
      window.addEventListener('pointerup', onWindowPointerUpRef.current)
      window.addEventListener('pointercancel', onWindowPointerUpRef.current)
    },
    [disabled, autoScrollLoop, stopAutoScroll],
  )

  useEffect(
    () => () => {
      dragIdRef.current = null
      detachPointer()
    },
    [detachPointer],
  )

  const listClass = ['drag-sort-list', className].filter(Boolean).join(' ')

  return (
    <ul ref={listRef} className={listClass} role="list">
      {items.map((item) => {
        const id = getItemId(item)
        const isDragging = draggingId === id
        const extraClass =
          typeof itemClassName === 'function'
            ? itemClassName(item, isDragging)
            : itemClassName
        const itemClass = [
          'drag-sort-list__item',
          extraClass,
          isDragging ? 'drag-sort-list__item--dragging' : '',
        ]
          .filter(Boolean)
          .join(' ')

        const dragHandleProps: DragSortListHandleProps | null = disabled
          ? null
          : { onPointerDown: (ev) => startDrag(id, ev) }

        return (
          <li
            key={id}
            ref={(el) => {
              if (el) rowRefs.current.set(id, el)
              else rowRefs.current.delete(id)
            }}
            className={itemClass}
          >
            {renderItem(item, { isDragging, dragHandleProps })}
          </li>
        )
      })}
    </ul>
  )
}
