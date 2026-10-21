import {
  type FocusEvent,
  type FocusEventHandler,
  type InputHTMLAttributes,
  type KeyboardEventHandler,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useState,
} from 'react'

type HandlerOverrides = {
  onFocus?: FocusEventHandler<HTMLInputElement>
  onBlur?: FocusEventHandler<HTMLInputElement>
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>
  disabled?: boolean
}

function searchDropdownHandlers(
  open: boolean,
  setOpen: (open: boolean) => void,
  blurDelayMs: number,
  overrides?: HandlerOverrides,
) {
  return {
    'aria-expanded': open,
    'aria-autocomplete': 'list' as const,
    onFocus: (e: FocusEvent<HTMLInputElement>) => {
      overrides?.onFocus?.(e)
      if (!overrides?.disabled) setOpen(true)
    },
    onBlur: (e: FocusEvent<HTMLInputElement>) => {
      overrides?.onBlur?.(e)
      window.setTimeout(() => setOpen(false), blurDelayMs)
    },
    onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => {
      overrides?.onKeyDown?.(e)
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        setOpen(false)
        e.currentTarget.blur()
      }
    },
  }
}

/** Состояние выпадающего списка + обработчики для `CrmSearchField`. */
export function useCrmSearchDropdown(blurDelayMs = 150) {
  const [open, setOpen] = useState(false)
  const getInputProps = useCallback(
    (overrides?: HandlerOverrides) => searchDropdownHandlers(open, setOpen, blurDelayMs, overrides),
    [open, blurDelayMs],
  )
  return { open, setOpen, close: () => setOpen(false), openDropdown: () => setOpen(true), getInputProps }
}

export type CrmSearchFieldProps = {
  /** Без label — только оболочка поиска (внутри строки прихода, вложенный label). */
  label?: string
  invalid?: boolean
  wrapperClass?: string
  labClass?: string
  shellClassName?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  blurDelayMs?: number
  busy?: boolean
  beforeInput?: ReactNode
  children?: ReactNode
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'aria-expanded' | 'aria-autocomplete'>

/**
 * Поле поиска с выпадающим списком (`children` при `open`).
 * С label — ячейка формы; без label — только `crm-taxon-search`.
 */
export function CrmSearchField({
  label,
  invalid = false,
  wrapperClass = 'crm-field',
  labClass = 'crm-field__lab',
  shellClassName,
  open,
  onOpenChange,
  blurDelayMs = 150,
  busy = false,
  beforeInput,
  children,
  className: inputClassName,
  disabled,
  onFocus,
  onBlur,
  onKeyDown,
  type: inputType = 'search',
  autoComplete: inputAutoComplete = 'off',
  ...inputProps
}: CrmSearchFieldProps) {
  const shellClass = [
    'crm-taxon-search',
    invalid ? 'crm-field--invalid' : '',
    shellClassName,
  ]
    .filter(Boolean)
    .join(' ')

  const inputCls = ['crm-field__input', inputClassName].filter(Boolean).join(' ')
  const dropdownHandlers = searchDropdownHandlers(open, onOpenChange, blurDelayMs, {
    onFocus,
    onBlur,
    onKeyDown,
    disabled,
  })

  const shell = (
    <div className={shellClass}>
      {beforeInput}
      <input
        type={inputType}
        className={inputCls}
        autoComplete={inputAutoComplete}
        disabled={disabled}
        {...inputProps}
        {...dropdownHandlers}
      />
      {busy ? <span className="crm-taxon-search__busy">…</span> : null}
      {open ? children : null}
    </div>
  )

  if (label != null && label !== '') {
    return (
      <label className={wrapperClass}>
        <span className={labClass}>{label}</span>
        {shell}
      </label>
    )
  }

  return shell
}
