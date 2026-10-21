import { type InputHTMLAttributes, useLayoutEffect, useRef } from 'react'
import {
  applyMaskedInputChange,
  formatDdMmYyMask,
  formatDdMmYyyyMask,
  formatHhMmMask,
} from '../../utils/receivedAtRuInput'

type CrmMaskedInputProps = {
  kind: 'date' | 'time'
  /** Дата: 6 цифр ДДММГГ (по умолчанию) или 8 — ДДММГГГГ для настроек. */
  dateDigits?: 6 | 8
  value: string
  onChange: (value: string) => void
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>

export function CrmMaskedInput({
  kind,
  dateDigits = 6,
  value,
  onChange,
  ...inputProps
}: CrmMaskedInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const prevRef = useRef(value)
  const pendingCaret = useRef<number | null>(null)

  const format =
    kind === 'date'
      ? dateDigits === 8
        ? formatDdMmYyyyMask
        : formatDdMmYyMask
      : formatHhMmMask
  const maxDigits = kind === 'date' ? dateDigits : 4

  useLayoutEffect(() => {
    prevRef.current = value
    if (pendingCaret.current == null || !inputRef.current) return
    const caret = pendingCaret.current
    pendingCaret.current = null
    inputRef.current.setSelectionRange(caret, caret)
  }, [value])

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={(e) => {
        const el = e.target
        const { masked, caret } = applyMaskedInputChange(
          prevRef.current,
          el.value,
          el.selectionStart ?? 0,
          el.selectionEnd ?? 0,
          format,
          maxDigits,
        )
        pendingCaret.current = caret
        prevRef.current = masked
        onChange(masked)
      }}
      {...inputProps}
    />
  )
}
