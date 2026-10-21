/**
 * Нормализация: «7» + до 10 цифр. Не начинается с 7 (кроме 8→7) — добавляется 7.
 */
export function digitsFromPhoneInput(raw: string): string {
  let d = raw.replace(/\D/g, '')
  if (!d.length) return ''
  if (d.startsWith('8')) {
    d = '7' + d.slice(1)
  }
  if (!d.startsWith('7')) {
    d = '7' + d
  }
  return d.slice(0, 11)
}

/**
 * Backspace по скобке/тиру/пробелу не меняет «подряд цифр» — тогда считаем, что удаляют с конца: убираем последнюю цифру.
 */
export function applyPhoneFieldChange(prevDigits: string, prevDisplay: string, newRaw: string): string {
  if (!newRaw.trim()) {
    return ''
  }

  const prevBare = prevDisplay.replace(/\D/g, '')
  const newBare = newRaw.replace(/\D/g, '')
  const canon = prevDigits.replace(/\D/g, '').slice(0, 11)

  if (prevBare.length > 0 && prevBare === newBare && newRaw.length < prevDisplay.length) {
    const chop = Math.min(prevDisplay.length - newRaw.length, canon.length)
    if (chop <= 0) {
      return digitsFromPhoneInput(newRaw)
    }
    const nextLen = canon.length - chop
    return nextLen <= 0 ? '' : canon.slice(0, nextLen)
  }

  return digitsFromPhoneInput(newRaw)
}

/** +7 (900) 123-45-67 */
export function formatRuPhoneMasked(digits: string): string {
  if (!digits.length) return ''
  if (!digits.startsWith('7')) return digits
  const r = digits.slice(1)
  if (r.length === 0) return '+7'
  if (r.length < 3) {
    return `+7 (${r}`
  }
  const code = r.slice(0, 3)
  const tail = r.slice(3)
  let out = `+7 (${code})`
  if (tail.length === 0) return out
  const block = tail.slice(0, 3)
  if (tail.length <= 3) {
    return `${out} ${block}`
  }
  const dash1 = tail.slice(3, 5)
  if (tail.length <= 5) {
    return `${out} ${block}-${dash1}`
  }
  const dash2 = tail.slice(5, 7)
  return `${out} ${block}-${dash1}-${dash2}`
}
