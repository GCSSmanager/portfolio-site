import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { CrmButton } from '../../components/ui/CrmButton'
import { withCrmFieldInvalid } from '../../utils/crmInput'

export type CrmPickOption = {
  value: string
  label: string
  meta?: string
}

type PickDropdownPos = {
  top: number
  left: number
  width: number
}

const DROPDOWN_EDGE_PAD_PX = 8
const DROPDOWN_GAP_PX = 4
const DROPDOWN_MAX_HEIGHT_PX = 224

function resolvePickPortalRoot(anchor: HTMLElement | null): HTMLElement {
  const dialog = anchor?.closest('dialog')
  if (dialog instanceof HTMLDialogElement && dialog.open) {
    return dialog
  }
  return document.body
}

type Props = {
  label: string
  value: string
  options: CrmPickOption[]
  onChange: (value: string) => void
  invalid?: boolean
  disabled?: boolean
  placeholder?: string
  /** Длинные подписи разделов — одна строка с многоточием в кнопке и в списке */
  clampLabels?: boolean
}

/** Выпадающий список в стиле поиска таксона (crm-taxon-dd). */
export function CrmPickField({
  label,
  value,
  options,
  onChange,
  invalid = false,
  disabled = false,
  placeholder = 'Выберите…',
  clampLabels = false,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const anchorRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<PickDropdownPos | null>(null)
  const [portalRoot, setPortalRoot] = useState<HTMLElement>(() => document.body)

  const selected = useMemo(() => options.find((o) => o.value === value) ?? null, [options, value])

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current
    if (!anchor) return
    const rect = anchor.getBoundingClientRect()
    const width = rect.width
    let left = rect.left
    left = Math.max(
      DROPDOWN_EDGE_PAD_PX,
      Math.min(left, window.innerWidth - width - DROPDOWN_EDGE_PAD_PX),
    )

    const list = listRef.current
    const listHeight = list
      ? Math.min(list.offsetHeight, DROPDOWN_MAX_HEIGHT_PX)
      : Math.min(options.length * 40, DROPDOWN_MAX_HEIGHT_PX)

    const spaceBelow = window.innerHeight - rect.bottom - DROPDOWN_GAP_PX - DROPDOWN_EDGE_PAD_PX
    const spaceAbove = rect.top - DROPDOWN_GAP_PX - DROPDOWN_EDGE_PAD_PX
    let top = rect.bottom + DROPDOWN_GAP_PX
    if (listHeight > spaceBelow && spaceAbove > spaceBelow) {
      top = rect.top - DROPDOWN_GAP_PX - listHeight
    }
    top = Math.max(
      DROPDOWN_EDGE_PAD_PX,
      Math.min(top, window.innerHeight - listHeight - DROPDOWN_EDGE_PAD_PX),
    )

    setPos({ top, left, width })
  }, [options.length])

  useLayoutEffect(() => {
    if (!open) {
      setPos(null)
      return
    }
    setPortalRoot(resolvePickPortalRoot(anchorRef.current))
    updatePosition()
    const id = window.requestAnimationFrame(updatePosition)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.cancelAnimationFrame(id)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open, updatePosition])

  useEffect(() => {
    if (!open) return
    const onDoc = (ev: MouseEvent) => {
      const target = ev.target as Node
      if (wrapRef.current?.contains(target)) return
      if (listRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const dropdown =
    !disabled && open && options.length > 0 ? (
      <ul
        ref={listRef}
        className="crm-taxon-dd crm-taxon-dd--anchored"
        role="listbox"
        style={
          pos
            ? {
                top: `${pos.top}px`,
                left: `${pos.left}px`,
                width: `${pos.width}px`,
              }
            : { visibility: 'hidden' }
        }
      >
        {options.map((o) => (
          <li key={o.value} role="presentation">
            <CrmButton
              variant="taxonDd"
              role="option"
              aria-selected={o.value === value}
              onMouseDown={(ev) => ev.preventDefault()}
              onClick={() => {
                onChange(o.value)
                setOpen(false)
              }}
            >
              <span className="crm-taxon-dd__title">{o.label}</span>
              {o.meta ? <span className="crm-taxon-dd__meta">{o.meta}</span> : null}
            </CrmButton>
          </li>
        ))}
      </ul>
    ) : null

  return (
    <div
      ref={wrapRef}
      className={withCrmFieldInvalid(
        invalid,
        `crm-field crm-pick-field${clampLabels ? ' crm-pick-field--clamp-labels' : ''}`,
      )}
    >
      <span className="crm-field__lab">{label}</span>
      <div ref={anchorRef} className="crm-taxon-search">
        <CrmButton
          variant="pickField"
          aria-haspopup="listbox"
          aria-expanded={open}
          disabled={disabled}
          onClick={() => {
            if (!disabled) setOpen((v) => !v)
          }}
          onKeyDown={(ev) => {
            if (ev.key === 'Escape') setOpen(false)
          }}
        >
          <span className="crm-pick-field__label">{selected?.label ?? placeholder}</span>
          <span className="crm-pick-field__chev" aria-hidden>
            ▾
          </span>
        </CrmButton>
      </div>
      {dropdown ? createPortal(dropdown, portalRoot) : null}
    </div>
  )
}
