import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DateDigitsInput } from "./DateDigitsInput";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onValidityChange?: (ok: boolean) => void;
  min?: string;
  placeholder?: string;
  className?: string;
  invalid?: boolean;
}

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const POPOVER_MIN_WIDTH = 284;
const POPOVER_ESTIMATED_HEIGHT = 340;
const VIEWPORT_PADDING = 8;
const POPOVER_GAP = 6;

function computePopoverPosition(anchor: DOMRect, popoverHeight: number) {
  const width = Math.max(anchor.width, POPOVER_MIN_WIDTH);
  const height = popoverHeight > 0 ? popoverHeight : POPOVER_ESTIMATED_HEIGHT;

  let left = anchor.left;
  if (left + width > window.innerWidth - VIEWPORT_PADDING) {
    left = Math.max(VIEWPORT_PADDING, window.innerWidth - width - VIEWPORT_PADDING);
  }
  if (left < VIEWPORT_PADDING) left = VIEWPORT_PADDING;

  const spaceBelow = window.innerHeight - anchor.bottom - POPOVER_GAP - VIEWPORT_PADDING;
  const spaceAbove = anchor.top - POPOVER_GAP - VIEWPORT_PADDING;

  let top = anchor.bottom + POPOVER_GAP;
  if (height > spaceBelow && spaceAbove > spaceBelow) {
    top = anchor.top - height - POPOVER_GAP;
  }

  if (top + height > window.innerHeight - VIEWPORT_PADDING) {
    top = Math.max(VIEWPORT_PADDING, window.innerHeight - height - VIEWPORT_PADDING);
  }
  if (top < VIEWPORT_PADDING) top = VIEWPORT_PADDING;

  return { top, left, width };
}

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function toYmd(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthTitle(date: Date) {
  return date.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
}

function monthGrid(cursor: Date) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const mondayOffset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

export function DatePicker({
  value,
  onChange,
  onValidityChange,
  min,
  placeholder = "ДД.ММ.ГГГГ",
  className = "",
  invalid = false,
}: Props) {
  const selected = parseDate(value);
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(() => selected ?? parseDate(min ?? "") ?? new Date());
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const days = useMemo(() => monthGrid(cursor), [cursor]);

  const reposition = () => {
    if (!rootRef.current) return;
    const anchor = rootRef.current.getBoundingClientRect();
    const popoverHeight = popoverRef.current?.offsetHeight ?? 0;
    setPos(computePopoverPosition(anchor, popoverHeight));
  };

  useLayoutEffect(() => {
    if (!open) return;
    reposition();
    const frame = window.requestAnimationFrame(reposition);
    return () => window.cancelAnimationFrame(frame);
  }, [open, cursor]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onReflow = () => reposition();

    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onReflow);
    window.addEventListener("scroll", onReflow, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow, true);
    };
  }, [open]);

  useEffect(() => {
    if (selected) setCursor(selected);
  }, [value]);

  const setDate = (next: string) => {
    if (min && next && next < min) return;
    onChange(next);
    const parsed = parseDate(next);
    if (parsed) setCursor(parsed);
  };

  const select = (date: Date) => {
    const next = toYmd(date);
    if (min && next < min) return;
    setDate(next);
    setOpen(false);
  };

  const popover = open
    ? createPortal(
        <div
          ref={popoverRef}
          className="fixed z-[200] max-h-[calc(100vh-16px)] overflow-y-auto rounded-3xl border border-line bg-panel p-3 shadow-card"
          style={{ top: pos.top, left: pos.left, width: pos.width }}
        >
          <div className="mb-3 flex items-center justify-between gap-1">
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                className="h-8 w-8 rounded-xl text-ink-muted hover:bg-brand-light hover:text-brand-dark transition-colors"
                onClick={() => setCursor((d) => new Date(d.getFullYear() - 1, d.getMonth(), 1))}
                aria-label="Предыдущий год"
              >
                «
              </button>
              <button
                type="button"
                className="h-8 w-8 rounded-xl text-ink-muted hover:bg-brand-light hover:text-brand-dark transition-colors"
                onClick={() => setCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                aria-label="Предыдущий месяц"
              >
                ‹
              </button>
            </div>
            <div className="min-w-0 flex-1 px-1 text-center text-sm font-semibold capitalize text-ink">
              {monthTitle(cursor)}
            </div>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                className="h-8 w-8 rounded-xl text-ink-muted hover:bg-brand-light hover:text-brand-dark transition-colors"
                onClick={() => setCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                aria-label="Следующий месяц"
              >
                ›
              </button>
              <button
                type="button"
                className="h-8 w-8 rounded-xl text-ink-muted hover:bg-brand-light hover:text-brand-dark transition-colors"
                onClick={() => setCursor((d) => new Date(d.getFullYear() + 1, d.getMonth(), 1))}
                aria-label="Следующий год"
              >
                »
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 pb-1">
            {WEEKDAYS.map((day) => (
              <div key={day} className="py-1 text-center text-[10px] font-medium text-ink-muted">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const ymd = toYmd(day);
              const isSelected = value === ymd;
              const isToday = ymd === toYmd(new Date());
              const isOutside = day.getMonth() !== cursor.getMonth();
              const disabled = !!min && ymd < min;

              return (
                <button
                  key={ymd}
                  type="button"
                  disabled={disabled}
                  onClick={() => select(day)}
                  className={[
                    "h-9 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand/30",
                    isSelected
                      ? "bg-brand text-white shadow-float"
                      : isToday
                        ? "bg-brand-light text-brand-dark font-semibold"
                        : "text-ink hover:bg-brand-light/70",
                    isOutside && !isSelected ? "text-ink-muted/45" : "",
                    disabled ? "cursor-not-allowed text-ink-muted/25 hover:bg-transparent line-through" : "",
                  ].join(" ")}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <div ref={rootRef} className="relative">
      <DateDigitsInput
        value={value}
        onChange={setDate}
        onValidityChange={onValidityChange}
        placeholder={placeholder}
        invalid={invalid}
        className={["pr-10", className].filter(Boolean).join(" ")}
      />
      <button
        type="button"
        onClick={() => setOpen((open) => !open)}
        className={[
          "absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-brand-light hover:text-brand-dark",
          open ? "bg-brand-light text-brand-dark" : "",
        ].join(" ")}
        aria-label="Календарь"
      >
        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
          <rect x="2" y="3.5" width="12" height="10.5" rx="1.5" stroke="currentColor" strokeWidth="1.25" />
          <path d="M2 6.5h12M5.5 2v3M10.5 2v3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
        </svg>
      </button>
      {popover}
    </div>
  );
}
