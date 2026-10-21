import {
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { dateToDdMmMask, ddMmMaskToDate } from '../../utils/receivedAtRuInput'
import './crm-calendar.css'

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const

const MONTH_FORMAT = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' })

function calendarCells(viewYear: number, viewMonth: number): Array<Date | null> {
  const first = new Date(viewYear, viewMonth, 1)
  const startPad = (first.getDay() + 6) % 7
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells: Array<Date | null> = []
  for (let i = 0; i < startPad; i++) cells.push(null)
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(new Date(viewYear, viewMonth, day))
  }
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

function sameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

const CALENDAR_MAX_WIDTH_PX = 280
const CALENDAR_EDGE_PAD_PX = 8

/** В `showModal()` контент в body ниже top layer — рендерим внутрь открытого dialog. */
function resolveCalendarPortalRoot(anchor: HTMLElement | null): HTMLElement {
  const dialog = anchor?.closest('dialog')
  if (dialog instanceof HTMLDialogElement && dialog.open) {
    return dialog
  }
  return document.body
}

function calendarHorizontalBounds(portalRoot: HTMLElement): DOMRect {
  if (portalRoot === document.body) {
    const w = window.innerWidth - 2 * CALENDAR_EDGE_PAD_PX
    return new DOMRect(CALENDAR_EDGE_PAD_PX, 0, w, 0)
  }
  const box = portalRoot.querySelector('.crm-modal__box')
  if (box instanceof HTMLElement) {
    return box.getBoundingClientRect()
  }
  return portalRoot.getBoundingClientRect()
}

type CalendarPos = {
  top: number
  left: number
  width: number
  inModal: boolean
}

type Props = {
  open: boolean
  anchorRef: RefObject<HTMLElement | null>
  popoverId?: string
  value: string
  fourDigitYear?: boolean
  onSelect: (mask: string) => void
  onClose: () => void
}

export function CrmCalendarPopover({
  open,
  anchorRef,
  value,
  fourDigitYear = false,
  onSelect,
  onClose,
  popoverId,
}: Props) {
  const popoverRef = useRef<HTMLDivElement>(null)
  const today = useMemo(() => {
    const t = new Date()
    return new Date(t.getFullYear(), t.getMonth(), t.getDate())
  }, [])

  const selected = useMemo(() => ddMmMaskToDate(value, fourDigitYear), [value, fourDigitYear])

  const [view, setView] = useState(() => {
    const base = selected ?? today
    return { year: base.getFullYear(), month: base.getMonth() }
  })

  useEffect(() => {
    if (!open) return
    const base = selected ?? today
    setView({ year: base.getFullYear(), month: base.getMonth() })
  }, [open, selected, today])

  const [pos, setPos] = useState<CalendarPos | null>(null)
  const [portalRoot, setPortalRoot] = useState<HTMLElement>(() => document.body)

  const updatePosition = useCallback(() => {
    const el = anchorRef.current
    if (!el) return
    const root = resolveCalendarPortalRoot(el)
    const inModal = root !== document.body
    const bounds = calendarHorizontalBounds(root)
    const anchorRect = el.getBoundingClientRect()
    const width = Math.min(CALENDAR_MAX_WIDTH_PX, bounds.width - 2 * CALENDAR_EDGE_PAD_PX)
    const minLeft = bounds.left + CALENDAR_EDGE_PAD_PX
    const maxLeft = bounds.left + bounds.width - width - CALENDAR_EDGE_PAD_PX
    let left = anchorRect.left
    left = Math.min(Math.max(left, minLeft), Math.max(minLeft, maxLeft))
    let top = anchorRect.bottom + 6
    const estimatedHeight = 320
    if (top + estimatedHeight > window.innerHeight - CALENDAR_EDGE_PAD_PX) {
      top = Math.max(CALENDAR_EDGE_PAD_PX, anchorRect.top - estimatedHeight - 6)
    }
    setPos({ top, left, width, inModal })
  }, [anchorRef])

  useLayoutEffect(() => {
    if (!open) {
      setPos(null)
      return
    }
    setPortalRoot(resolveCalendarPortalRoot(anchorRef.current))
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open, updatePosition])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (ev: MouseEvent) => {
      const target = ev.target as Node
      if (anchorRef.current?.contains(target)) return
      if (popoverRef.current?.contains(target)) return
      onClose()
    }
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        ev.preventDefault()
        ev.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [open, anchorRef, onClose])

  const cells = useMemo(
    () => calendarCells(view.year, view.month),
    [view.year, view.month],
  )

  const title = MONTH_FORMAT.format(new Date(view.year, view.month, 1))

  if (!open || pos == null) return null

  return createPortal(
    <div
      ref={popoverRef}
      id={popoverId}
      className={`crm-calendar-popover${pos.inModal ? ' crm-calendar-popover--in-modal' : ''}`}
      role="dialog"
      aria-modal="false"
      aria-label="Выбор даты"
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        width: pos.width,
        maxWidth: pos.width,
      }}
    >
      <div className="crm-calendar-popover__head">
        <button
          type="button"
          className="crm-calendar-popover__nav"
          aria-label="Предыдущий месяц"
          onClick={() =>
            setView((v) => {
              if (v.month === 0) return { year: v.year - 1, month: 11 }
              return { year: v.year, month: v.month - 1 }
            })
          }
        >
          ‹
        </button>
        <span className="crm-calendar-popover__title">{title}</span>
        <button
          type="button"
          className="crm-calendar-popover__nav"
          aria-label="Следующий месяц"
          onClick={() =>
            setView((v) => {
              if (v.month === 11) return { year: v.year + 1, month: 0 }
              return { year: v.year, month: v.month + 1 }
            })
          }
        >
          ›
        </button>
      </div>
      <div className="crm-calendar-popover__weekdays" aria-hidden>
        {WEEKDAYS.map((d) => (
          <span key={d} className="crm-calendar-popover__weekday">
            {d}
          </span>
        ))}
      </div>
      <div className="crm-calendar-popover__grid" role="grid">
        {cells.map((date, idx) => {
          if (date == null) {
            return <span key={`e-${idx}`} className="crm-calendar-popover__day--outside" aria-hidden />
          }
          const isSelected = selected != null && sameCalendarDay(date, selected)
          const isToday = sameCalendarDay(date, today)
          return (
            <button
              key={`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`}
              type="button"
              className={[
                'crm-calendar-popover__day',
                isSelected ? 'crm-calendar-popover__day--selected' : '',
                isToday ? 'crm-calendar-popover__day--today' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              role="gridcell"
              aria-selected={isSelected}
              aria-current={isToday && !isSelected ? 'date' : undefined}
              onClick={() => {
                onSelect(dateToDdMmMask(date, fourDigitYear))
                onClose()
              }}
            >
              {date.getDate()}
            </button>
          )
        })}
      </div>
      <div className="crm-calendar-popover__footer">
        <button
          type="button"
          className="crm-calendar-popover__today"
          onClick={() => {
            onSelect(dateToDdMmMask(today, fourDigitYear))
            onClose()
          }}
        >
          Сегодня
        </button>
      </div>
    </div>,
    portalRoot,
  )
}
