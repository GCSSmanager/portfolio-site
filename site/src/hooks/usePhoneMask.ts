import { useCallback, useMemo, useState } from 'react'
import {
  formatRuPhone,
  isPhoneComplete,
  phoneDigits,
  RU_PHONE_PREFIX,
} from '@/lib/phone-ru'

type UsePhoneMaskOptions = {
  initial?: string
}

export function usePhoneMask(options: UsePhoneMaskOptions = {}) {
  const [value, setValue] = useState(options.initial ?? RU_PHONE_PREFIX)

  const syncFromInput = useCallback((raw: string, selectionStart: number) => {
    const cursorFromEnd = raw.length - selectionStart
    const formatted = formatRuPhone(raw)
    const nextPos = Math.max(RU_PHONE_PREFIX.length, formatted.length - cursorFromEnd)
    setValue(formatted)
    return { formatted, nextPos }
  }, [])

  const onFocus = useCallback(
    (event: React.FocusEvent<HTMLInputElement>) => {
      const input = event.currentTarget
      if (!value.startsWith('+7')) {
        setValue(RU_PHONE_PREFIX)
      }
      if (input.selectionStart !== null && input.selectionStart < RU_PHONE_PREFIX.length) {
        requestAnimationFrame(() => {
          input.setSelectionRange(input.value.length, input.value.length)
        })
      }
    },
    [value],
  )

  const onChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const input = event.target
      const { formatted, nextPos } = syncFromInput(input.value, input.selectionStart ?? input.value.length)
      setValue(formatted)
      requestAnimationFrame(() => {
        input.setSelectionRange(nextPos, nextPos)
      })
    },
    [syncFromInput],
  )

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      const input = event.currentTarget
      const { selectionStart, selectionEnd } = input
      if (selectionStart === null || selectionEnd === null || selectionStart !== selectionEnd) {
        return
      }

      if (event.key === 'Backspace' && selectionStart <= RU_PHONE_PREFIX.length) {
        event.preventDefault()
        setValue(RU_PHONE_PREFIX)
        requestAnimationFrame(() => {
          input.setSelectionRange(RU_PHONE_PREFIX.length, RU_PHONE_PREFIX.length)
        })
        return
      }

      if (event.key === 'Delete' && selectionStart < RU_PHONE_PREFIX.length) {
        event.preventDefault()
        requestAnimationFrame(() => {
          input.setSelectionRange(RU_PHONE_PREFIX.length, RU_PHONE_PREFIX.length)
        })
        return
      }

      if (event.key !== 'Backspace') return

      const charBefore = input.value[selectionStart - 1]
      if (charBefore === ' ' || charBefore === '-' || charBefore === '(' || charBefore === ')') {
        event.preventDefault()
        const digits = phoneDigits(input.value)
        const formatted = formatRuPhone(digits.slice(0, -1))
        setValue(formatted)
        requestAnimationFrame(() => {
          input.setSelectionRange(formatted.length, formatted.length)
        })
      }
    },
    [],
  )

  const onBlur = useCallback(() => {
    setValue((current) => (current.startsWith('+7') ? current : RU_PHONE_PREFIX))
  }, [])

  const setFormatted = useCallback((next: string) => {
    setValue(formatRuPhone(next))
  }, [])

  const reset = useCallback(() => {
    setValue(RU_PHONE_PREFIX)
  }, [])

  const complete = useMemo(() => isPhoneComplete(value), [value])

  return {
    value,
    setValue: setFormatted,
    reset,
    complete,
    onFocus,
    onChange,
    onKeyDown,
    onBlur,
  }
}
