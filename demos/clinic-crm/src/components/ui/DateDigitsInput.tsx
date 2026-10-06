import { useEffect, useState, type ChangeEvent, type ClipboardEvent, type KeyboardEvent } from "react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  /** true = пусто или полная корректная дата; false = ввод незакончен / невалиден */
  onValidityChange?: (ok: boolean) => void;
  placeholder?: string;
  className?: string;
  invalid?: boolean;
}

/** Пустая или полная валидная дата — ок; частично набранная / 32.13.2020 — нет. */
export function isBirthDateDigitsOk(digitsOrFormatted: string) {
  const digits = onlyDigits(digitsOrFormatted);
  if (!digits) return true;
  return digitsToYmd(digits) !== null;
}

/** Достаёт до 8 цифр: ДДММГГГГ. */
function onlyDigits(raw: string) {
  return raw.replace(/\D/g, "").slice(0, 8);
}

/** 15052018 → 15.05.2018 */
function formatDigits(digits: string) {
  const d = onlyDigits(digits);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}.${d.slice(2)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 4)}.${d.slice(4)}`;
}

/** YYYY-MM-DD → цифры ДДММГГГГ */
function ymdToDigits(ymd: string) {
  const [year, month, day] = ymd.slice(0, 10).split("-");
  if (!year || !month || !day) return "";
  return `${day}${month}${year}`;
}

function digitsToYmd(digits: string): string | null {
  const d = onlyDigits(digits);
  if (d.length !== 8) return null;
  const day = Number(d.slice(0, 2));
  const month = Number(d.slice(2, 4));
  const year = Number(d.slice(4, 8));
  if (year < 1900 || year > 2100) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Ввод даты только цифрами с автоформатом ДД.ММ.ГГГГ.
 * value/onChange — YYYY-MM-DD (как у DatePicker) или "".
 */
export function DateDigitsInput({
  value,
  onChange,
  onValidityChange,
  placeholder = "ДДММГГГГ",
  className = "",
  invalid = false,
}: Props) {
  const [text, setText] = useState(() => (value ? formatDigits(ymdToDigits(value)) : ""));

  useEffect(() => {
    const next = value ? formatDigits(ymdToDigits(value)) : "";
    setText((current) => {
      const currentYmd = digitsToYmd(onlyDigits(current));
      // Не затираем незавершённый ввод, пока снаружи то же значение / пусто согласовано.
      if (!value && !currentYmd && onlyDigits(current).length > 0) return current;
      if (value && currentYmd === value.slice(0, 10)) return current;
      return next;
    });
  }, [value]);

  useEffect(() => {
    onValidityChange?.(isBirthDateDigitsOk(text));
  }, [text, onValidityChange]);

  const commit = (digits: string) => {
    const formatted = formatDigits(digits);
    setText(formatted);
    if (!digits) {
      onChange("");
      return;
    }
    const ymd = digitsToYmd(digits);
    if (ymd) onChange(ymd);
    else if (value) onChange(""); // сброс наружу, пока дата неполная/невалидна
  };

  const onInput = (event: ChangeEvent<HTMLInputElement>) => {
    commit(onlyDigits(event.target.value));
  };

  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    commit(onlyDigits(event.clipboardData.getData("text")));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // Разрешаем служебные клавиши; цифры проходят через onChange.
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const allowed = ["Backspace", "Delete", "Tab", "Enter", "Escape", "ArrowLeft", "ArrowRight", "Home", "End"];
    if (allowed.includes(event.key)) return;
    if (/^\d$/.test(event.key)) return;
    event.preventDefault();
  };

  const digits = onlyDigits(text);
  const completeInvalid = digits.length === 8 && !digitsToYmd(digits);
  const showInvalid = invalid || completeInvalid;

  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="bday"
      placeholder={placeholder}
      value={text}
      onChange={onInput}
      onPaste={onPaste}
      onKeyDown={onKeyDown}
      className={[
        "w-full h-9 px-3 bg-panel border rounded-xl text-sm tabular-nums tracking-wide focus:outline-none focus:ring-2",
        showInvalid
          ? "border-red-300 text-red-700 focus:ring-red-200"
          : "border-line text-ink focus:ring-brand/30",
        className,
      ].join(" ")}
    />
  );
}
