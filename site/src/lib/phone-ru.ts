const PHONE_PREFIX = '+7 ('

export function phoneDigits(value: string): string {
  let digits = String(value).replace(/\D/g, '')
  if (digits.startsWith('8')) digits = `7${digits.slice(1)}`
  if (digits.startsWith('7')) digits = digits.slice(1)
  return digits.slice(0, 10)
}

export function formatRuPhone(value: string): string {
  const digits = phoneDigits(value)
  if (!digits.length) return PHONE_PREFIX

  let formatted = `${PHONE_PREFIX}${digits.slice(0, 3)}`
  if (digits.length < 3) return formatted

  formatted += `) ${digits.slice(3, 6)}`
  if (digits.length <= 6) return formatted

  formatted += `-${digits.slice(6, 8)}`
  if (digits.length <= 8) return formatted

  return `${formatted}-${digits.slice(8, 10)}`
}

export function isPhoneComplete(value: string): boolean {
  return phoneDigits(value).length === 10
}

export const RU_PHONE_PREFIX = PHONE_PREFIX
