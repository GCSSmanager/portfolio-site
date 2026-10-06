const PHONE_PREFIX = "+7 (";

export function phoneDigits(value: string): string {
  let digits = String(value).replace(/\D/g, "");

  if (digits.startsWith("8")) {
    digits = `7${digits.slice(1)}`;
  }

  if (digits.startsWith("7")) {
    digits = digits.slice(1);
  }

  return digits.slice(0, 10);
}

export function formatRuPhone(value: string): string {
  const digits = phoneDigits(value);

  if (!digits.length) {
    return PHONE_PREFIX;
  }

  let formatted = `${PHONE_PREFIX}${digits.slice(0, 3)}`;

  if (digits.length < 3) {
    return formatted;
  }

  formatted += `) ${digits.slice(3, 6)}`;

  if (digits.length <= 6) {
    return formatted;
  }

  formatted += `-${digits.slice(6, 8)}`;

  if (digits.length <= 8) {
    return formatted;
  }

  return `${formatted}-${digits.slice(8, 10)}`;
}

export function isPhoneRuComplete(value: string): boolean {
  return phoneDigits(value).length === 10;
}

export function phoneRuValidityMessage(): string {
  return "Введите номер полностью: +7 (999) 999-99-99";
}

/** Обработчики маски +7 для controlled input. */
export function applyPhoneRuInput(prev: string, next: string): string {
  void prev;
  return formatRuPhone(next);
}

export function phoneRuOnFocus(value: string): string {
  return value.startsWith("+7") ? value : PHONE_PREFIX;
}

export function phoneRuOnBlur(value: string): string {
  const digits = phoneDigits(value);
  if (!digits.length) return "";
  return formatRuPhone(value);
}

export { PHONE_PREFIX };
