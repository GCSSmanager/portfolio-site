/**
 * Ввод даты прихода: ДД/ММ/ГГ (год двумя цифрами), время ЧЧ:ММ необязательно.
 * Время не указано — полночь выбранного календарного дня (локальная TZ браузера).
 */

/** Оставляет только цифры и форматирует маской ДД/ММ/ГГ при наборе (как в модалках склада). */
export function formatDdMmYyMask(rawInput: string): string {
  const digits = rawInput.replace(/\D/g, '').slice(0, 6)
  if (digits.length === 0) return ''
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 6)}`
}

/** ЧЧ:ММ по четырём цифрам. */
export function formatHhMmMask(rawInput: string): string {
  const digits = rawInput.replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}:${digits.slice(2)}`
}

function digitsBeforePos(masked: string, pos: number): number {
  let n = 0
  for (let i = 0; i < pos && i < masked.length; i++) {
    if (/\d/.test(masked[i])) n++
  }
  return n
}

function caretAfterDigits(masked: string, digitsBefore: number): number {
  if (digitsBefore <= 0) return 0
  let digits = 0
  for (let i = 0; i < masked.length; i++) {
    if (/\d/.test(masked[i])) digits++
    if (digits >= digitsBefore) return i + 1
  }
  return masked.length
}

/**
 * Правка маскированного поля с сохранением позиции курсора (delete/backspace в середине).
 */
export function applyMaskedInputChange(
  prevMasked: string,
  rawInputValue: string,
  selectionStart: number,
  selectionEnd: number,
  format: (digits: string) => string,
  maxDigits: number,
): { masked: string; caret: number } {
  const prevDigits = prevMasked.replace(/\D/g, '')
  const digitsBefore = digitsBeforePos(prevMasked, selectionStart)
  const digitsAfter = digitsBeforePos(prevMasked, selectionEnd)
  const inputDigits = rawInputValue.replace(/\D/g, '').slice(0, maxDigits)

  let nextDigits: string
  if (inputDigits.length < prevDigits.length) {
    const removeCount = prevDigits.length - inputDigits.length
    nextDigits = prevDigits.slice(0, digitsBefore) + prevDigits.slice(digitsAfter + removeCount)
  } else if (inputDigits.length > prevDigits.length) {
    const addCount = inputDigits.length - prevDigits.length
    const inserted = inputDigits.slice(digitsBefore, digitsBefore + addCount)
    nextDigits = prevDigits.slice(0, digitsBefore) + inserted + prevDigits.slice(digitsBefore)
  } else {
    nextDigits = inputDigits
  }

  nextDigits = nextDigits.slice(0, maxDigits)
  const masked = format(nextDigits)

  let caretDigits = digitsBefore
  if (inputDigits.length > prevDigits.length) {
    caretDigits = digitsBefore + (inputDigits.length - prevDigits.length)
  } else if (inputDigits.length < prevDigits.length) {
    caretDigits = digitsBefore
  }

  return { masked, caret: caretAfterDigits(masked, caretDigits) }
}

export function parseDdMmYy(s: string): { day: number; month: number; year: number } | null {
  const m = /^(\d{2})[/.](\d{2})[/.](\d{2})$/.exec(s.trim())
  if (!m) return null
  const day = Number(m[1])
  const month = Number(m[2])
  const yy = Number(m[3])
  if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(yy)) return null
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const year = 2000 + yy
  const d = new Date(year, month - 1, day)
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null
  return { day, month, year }
}

export function parseHhMm(s: string): { h: number; m: number } | null {
  const m = /^(\d{2}):(\d{2})$/.exec(s.trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null
  if (h > 23 || min > 59) return null
  return { h, m: min }
}

/**
 * Собирает локальную дату-время. Пустое время → 00:00 этого дня.
 * Возвращает null если дата неполная или невалидная.
 */
export function combineLocalDateTime(dateDdMmYy: string, timeHhMm: string): Date | null {
  const parsed = parseDdMmYy(dateDdMmYy.trim())
  if (!parsed) return null
  const { day, month, year } = parsed
  const tRaw = timeHhMm.trim()
  if (!tRaw) {
    return new Date(year, month - 1, day, 0, 0, 0, 0)
  }
  const tm = parseHhMm(tRaw)
  if (!tm) return null
  return new Date(year, month - 1, day, tm.h, tm.m, 0, 0)
}

/** Проверка при отправке: неполная дата/время или невозможная дата отклоняются. */
export function validateReceivedAtInput(
  dateStr: string,
  timeStr: string,
): { ok: true } | { ok: false; message: string } {
  const d = dateStr.trim()
  const t = timeStr.trim()
  const dd = d.replace(/\D/g, '')
  const td = t.replace(/\D/g, '')

  if (!d && !t) return { ok: true }
  if (!d && t) return { ok: false, message: 'Укажите дату или очистите время.' }

  if (d && dd.length < 6) {
    return { ok: false, message: 'Дату введите до конца: шесть цифр (ДД/ММ/ГГ).' }
  }

  if (dd.length === 6 && !parseDdMmYy(d)) {
    return { ok: false, message: 'Такой даты не бывает.' }
  }

  if (t) {
    if (td.length > 0 && td.length < 4) {
      return { ok: false, message: 'Время введите до конца (ЧЧ:ММ) или оставьте пустым.' }
    }
    if (td.length === 4 && !parseHhMm(t)) {
      return { ok: false, message: 'Неверное время (часы 00–23, минуты 00–59).' }
    }
  }

  if (dd.length === 6) {
    const dt = combineLocalDateTime(d, t)
    if (!dt || Number.isNaN(dt.getTime())) {
      return { ok: false, message: 'Некорректная дата или время.' }
    }
  }

  return { ok: true }
}

function receivedAtDateDigits(dateStr: string): number {
  return dateStr.trim().replace(/\D/g, '').length
}

function receivedAtTimeDigits(timeStr: string): number {
  return timeStr.trim().replace(/\D/g, '').length
}

export function isReceivedAtDateIncomplete(dateStr: string): boolean {
  const n = receivedAtDateDigits(dateStr)
  return n > 0 && n < 6
}

export function isReceivedAtTimeIncomplete(timeStr: string): boolean {
  const n = receivedAtTimeDigits(timeStr)
  return n > 0 && n < 4
}

/** Красная рамка: только когда фрагмент ввода уже полный, но неверен. */
export function isReceivedAtInputBad(dateStr: string, timeStr: string): boolean {
  const d = dateStr.trim()
  const t = timeStr.trim()
  const dd = receivedAtDateDigits(d)
  const td = receivedAtTimeDigits(t)

  if (!d && !t) return false
  if (!d && t) {
    if (td < 4) return false
    return !parseHhMm(t)
  }
  if (isReceivedAtDateIncomplete(d)) return false
  if (dd === 6 && !parseDdMmYy(d)) return true
  if (isReceivedAtTimeIncomplete(t)) return false
  if (td === 4 && !parseHhMm(t)) return true
  if (dd === 6) {
    const dt = combineLocalDateTime(d, t)
    return !dt || Number.isNaN(dt.getTime())
  }
  return false
}

/** Можно отправить форму: нет незавершённого ввода и нет ошибок. */
export function isReceivedAtSubmitReady(dateStr: string, timeStr: string): boolean {
  const d = dateStr.trim()
  const t = timeStr.trim()
  if (!d && !t) return true
  if (isReceivedAtDateIncomplete(d) || isReceivedAtTimeIncomplete(t)) return false
  return validateReceivedAtInput(d, t).ok
}

/** Текст ошибки под полем — только когда isReceivedAtInputBad. */
export function receivedAtInputBadMessage(dateStr: string, timeStr: string): string | null {
  if (!isReceivedAtInputBad(dateStr, timeStr)) return null
  const r = validateReceivedAtInput(dateStr.trim(), timeStr.trim())
  return r.ok === false ? r.message : 'Некорректная дата или время.'
}

/** Календарная дата YYYY-MM-DD (как с сервера) → строка маски ДД/ММ/ГГ для полей с CrmMaskedInput. */
export function isoDateToDdMmYy(iso: string | null | undefined): string {
  if (iso == null || String(iso).trim() === '') return ''
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso).trim())
  if (!m) return ''
  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return ''
  const yy = year % 100
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${String(yy).padStart(2, '0')}`
}

/** ДД/ММ/ГГ из маски → YYYY-MM-DD для API. */
export function ddMmYyToIsoDate(masked: string): string | null {
  const p = parseDdMmYy(masked.trim())
  if (!p) return null
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`
}

/** Маска ДД/ММ/ГГГГ при наборе (до 8 цифр). */
export function formatDdMmYyyyMask(rawInput: string): string {
  const digits = rawInput.replace(/\D/g, '').slice(0, 8)
  if (digits.length === 0) return ''
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

export function parseDdMmYyOrYyyy(s: string): { day: number; month: number; year: number } | null {
  const t = s.trim()
  const m4 = /^(\d{2})[/.](\d{2})[/.](\d{4})$/.exec(t)
  if (m4) {
    const day = Number(m4[1])
    const month = Number(m4[2])
    const year = Number(m4[3])
    if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) return null
    if (month < 1 || month > 12 || day < 1 || day > 31) return null
    const d = new Date(year, month - 1, day)
    if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null
    return { day, month, year }
  }
  return parseDdMmYy(t)
}

/** Настройки: ДД/ММ/ГГ или ДД/ММ/ГГГГ → YYYY-MM-DD. */
export function careAnchorDateToIso(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (digits.length < 6) return null
  let masked = raw.trim()
  if (digits.length === 6) masked = formatDdMmYyMask(digits)
  else if (digits.length <= 8) masked = formatDdMmYyyyMask(digits)
  const p = parseDdMmYyOrYyyy(masked)
  if (!p) return null
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`
}

export function isCareAnchorDateIncomplete(raw: string): boolean {
  const n = raw.replace(/\D/g, '').length
  return n > 0 && n < 6
}

export function isCareAnchorDateBad(raw: string): boolean {
  const digits = raw.replace(/\D/g, '').length
  if (digits === 0) return false
  if (isCareAnchorDateIncomplete(raw)) return false
  return careAnchorDateToIso(raw) === null
}

export function careAnchorDateErrorMessage(raw: string): string | null {
  if (!isCareAnchorDateBad(raw)) return null
  return 'Такой даты нет. Формат: ДД/ММ/ГГ (например 19/05/26) или ДД/ММ/ГГГГ.'
}

/** YYYY-MM-DD → ДД/ММ/ГГГГ для подсказок (день/месяц/год). */
export function isoDateToRuDotted(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim())
  if (!m) return iso.trim()
  return `${m[3]}/${m[2]}/${m[1]}`
}

/** Календарный день в локальной TZ браузера → YYYY-MM-DD для API (без UTC-сдвига). */
export function localDateToIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Сегодня в маске ДД/ММ/ГГ (локальный календарь). */
export function todayDdMmYyMask(): string {
  const t = new Date()
  const digits = `${String(t.getDate()).padStart(2, '0')}${String(t.getMonth() + 1).padStart(2, '0')}${String(t.getFullYear() % 100).padStart(2, '0')}`
  return formatDdMmYyMask(digits)
}

/** Локальная дата → маска (6 или 8 цифр). */
export function dateToDdMmMask(d: Date, fourDigitYear = false): string {
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  if (fourDigitYear) {
    return formatDdMmYyyyMask(`${day}${month}${String(d.getFullYear())}`)
  }
  const yy = String(d.getFullYear() % 100).padStart(2, '0')
  return formatDdMmYyMask(`${day}${month}${yy}`)
}

/** Маска → локальная дата (полная и валидная). */
export function ddMmMaskToDate(mask: string, fourDigitYear = false): Date | null {
  const p = fourDigitYear ? parseDdMmYyOrYyyy(mask.trim()) : parseDdMmYy(mask.trim())
  if (!p) return null
  return new Date(p.year, p.month - 1, p.day)
}

/** Дата/время доставки: пустая дата → сегодня (локальный календарь). */
export function combineLocalDateTimeDefaultToday(dateDdMmYy: string, timeHhMm: string): Date | null {
  const d = dateDdMmYy.trim()
  const effectiveDate = d || todayDdMmYyMask()
  return combineLocalDateTime(effectiveDate, timeHhMm)
}

/** Проверка даты доставки: пустая дата допустима (будет сегодня). */
export function validateScheduledAtInput(
  dateStr: string,
  timeStr: string,
): { ok: true } | { ok: false; message: string } {
  const d = dateStr.trim()
  const t = timeStr.trim()
  if (!d && !t) return { ok: true }
  const effectiveDate = d || todayDdMmYyMask()
  return validateReceivedAtInput(effectiveDate, t)
}

export function isScheduledAtInputBad(dateStr: string, timeStr: string): boolean {
  const d = dateStr.trim()
  const t = timeStr.trim()
  if (!d && !t) return false
  const effectiveDate = d || todayDdMmYyMask()
  return isReceivedAtInputBad(effectiveDate, t)
}

export function isScheduledAtSubmitReady(dateStr: string, timeStr: string): boolean {
  const d = dateStr.trim()
  const t = timeStr.trim()
  if (!d && !t) return true
  const effectiveDate = d || todayDdMmYyMask()
  return isReceivedAtSubmitReady(effectiveDate, t)
}

export function scheduledAtInputBadMessage(dateStr: string, timeStr: string): string | null {
  if (!isScheduledAtInputBad(dateStr, timeStr)) return null
  const r = validateScheduledAtInput(dateStr.trim(), timeStr.trim())
  return r.ok === false ? r.message : 'Некорректная дата или время.'
}

/** ISO дата/время с API → маски ДД/ММ/ГГ и ЧЧ:ММ. */
export function isoDateTimeToDdMmYyAndHhMm(iso: string | null | undefined): {
  date: string
  time: string
} {
  if (iso == null || String(iso).trim() === '') return { date: '', time: '' }
  const s = String(iso).trim()
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))/.exec(s)
  if (!m) return { date: isoDateToDdMmYy(s), time: '' }
  return {
    date: isoDateToDdMmYy(`${m[1]}-${m[2]}-${m[3]}`),
    time: `${m[4]}:${m[5]}`,
  }
}

/** Локальная дата-время → ISO для API (без сдвига UTC). */
export function localDateTimeToIso(dt: Date): string {
  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, '0')
  const day = String(dt.getDate()).padStart(2, '0')
  const h = String(dt.getHours()).padStart(2, '0')
  const min = String(dt.getMinutes()).padStart(2, '0')
  const sec = String(dt.getSeconds()).padStart(2, '0')
  return `${y}-${m}-${day}T${h}:${min}:${sec}`
}

/** Однократная задача: пустые поля → текущие дата и время. */
export function resolveOnceDueIso(dateStr: string, timeStr: string): string {
  if (!dateStr.trim() && !timeStr.trim()) {
    return localDateTimeToIso(new Date())
  }
  const dt = combineLocalDateTimeDefaultToday(dateStr, timeStr)
  if (!dt || Number.isNaN(dt.getTime())) {
    return localDateTimeToIso(new Date())
  }
  return localDateTimeToIso(dt)
}

export function isOnceDueInputBad(dateStr: string, timeStr: string): boolean {
  if (!dateStr.trim() && !timeStr.trim()) return false
  return isScheduledAtInputBad(dateStr, timeStr)
}
