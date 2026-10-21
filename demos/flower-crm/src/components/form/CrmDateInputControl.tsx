import {
  type FocusEventHandler,
  useCallback,
  useId,
  useRef,
  useState,
} from 'react'
import { CrmCalendarPopover } from './CrmCalendarPopover'
import { CrmMaskedInput } from './CrmMaskedInput'
import './crm-calendar.css'

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden focusable="false">
      <rect
        x="2"
        y="3"
        width="12"
        height="11"
        rx="1.25"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
      />
      <path d="M2 6.25h12" stroke="currentColor" strokeWidth="1.25" />
      <path d="M5.25 1.75v2.5M10.75 1.75v2.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  )
}

export type CrmDateInputControlProps = {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  invalid?: boolean
  dateAriaLabel?: string
  careAnchor?: boolean
  onBlur?: FocusEventHandler<HTMLInputElement>
  inputClass?: string
  /** В строке «дата + время» — растягиваться в ряду. */
  inRow?: boolean
  /** Узкая кнопка календаря (строки поставки). */
  compact?: boolean
}

export function CrmDateInputControl({
  value,
  onChange,
  disabled = false,
  invalid = false,
  dateAriaLabel = 'Дата',
  careAnchor = false,
  onBlur,
  inputClass = 'crm-field__input',
  inRow = false,
  compact = false,
}: CrmDateInputControlProps) {
  const [calendarOpen, setCalendarOpen] = useState(false)
  const controlRef = useRef<HTMLDivElement>(null)
  const inputId = useId().replace(/:/g, '')
  const dateDigits = careAnchor ? 8 : 6
  const inputCls = [inputClass, 'crm-field__input--received-date'].filter(Boolean).join(' ')

  const closeCalendar = useCallback(() => setCalendarOpen(false), [])

  return (
    <div
      ref={controlRef}
      className={[
        'crm-date-input',
        inRow ? 'crm-date-input--in-row' : '',
        compact ? 'crm-date-input--compact' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <CrmMaskedInput
        id={inputId}
        kind="date"
        className={`${inputCls} crm-date-input__field`}
        type="text"
        inputMode="numeric"
        placeholder={careAnchor ? 'ДД/ММ/ГГ или ДД/ММ/ГГГГ' : 'ДД/ММ/ГГ'}
        autoComplete="off"
        spellCheck={false}
        aria-label={dateAriaLabel}
        aria-invalid={invalid || undefined}
        aria-haspopup="dialog"
        aria-expanded={calendarOpen}
        disabled={disabled}
        dateDigits={dateDigits}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
      />
      <button
        type="button"
        className="crm-date-input__toggle"
        disabled={disabled}
        aria-label="Открыть календарь"
        aria-expanded={calendarOpen}
        aria-controls={calendarOpen ? `${inputId}-calendar` : undefined}
        onClick={() => setCalendarOpen((o) => !o)}
      >
        <CalendarIcon className="crm-date-input__toggle-icon" />
      </button>
      <CrmCalendarPopover
        open={calendarOpen}
        anchorRef={controlRef}
        popoverId={`${inputId}-calendar`}
        value={value}
        fourDigitYear={careAnchor}
        onSelect={onChange}
        onClose={closeCalendar}
      />
    </div>
  )
}
