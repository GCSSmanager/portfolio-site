import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useBodyScrollLock } from "./scroll-lock";

interface Props {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  invalid?: boolean;
  /** Шаг минут (по умолчанию 5). */
  step?: number;
}

const VIEWPORT_PADDING = 8;
const POPOVER_GAP = 6;
const POPOVER_WIDTH = 280;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function parseTime(value: string) {
  const [h, m] = value.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return { hour: 9, minute: 0 };
  return {
    hour: Math.min(23, Math.max(0, h)),
    minute: Math.min(59, Math.max(0, m)),
  };
}

function formatTime(hour: number, minute: number) {
  return `${pad(hour)}:${pad(minute)}`;
}

function snapMinute(minute: number, step: number) {
  const snapped = Math.round(minute / step) * step;
  if (snapped >= 60) return 60 - step;
  return Math.max(0, snapped);
}

function computePopoverPosition(anchor: DOMRect, popoverHeight: number) {
  const width = POPOVER_WIDTH;
  const height = popoverHeight > 0 ? popoverHeight : 320;

  let left = anchor.left;
  if (left + width > window.innerWidth - VIEWPORT_PADDING) {
    left = Math.max(VIEWPORT_PADDING, window.innerWidth - width - VIEWPORT_PADDING);
  }

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

function useIsMobile() {
  const [mobile, setMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 639px)").matches : false,
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const onChange = () => setMobile(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return mobile;
}

export function TimePicker({
  value,
  onChange,
  disabled = false,
  className = "",
  invalid = false,
  step = 5,
}: Props) {
  const parsed = parseTime(value);
  const [open, setOpen] = useState(false);
  const [hour, setHour] = useState(parsed.hour);
  const [minute, setMinute] = useState(snapMinute(parsed.minute, step));
  const [pos, setPos] = useState({ top: 0, left: 0, width: POPOVER_WIDTH });
  const rootRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  useBodyScrollLock(open && isMobile);

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const minutes = useMemo(() => {
    const list: number[] = [];
    for (let m = 0; m < 60; m += step) list.push(m);
    return list;
  }, [step]);

  useEffect(() => {
    const next = parseTime(value);
    setHour(next.hour);
    setMinute(snapMinute(next.minute, step));
  }, [value, step]);

  const reposition = () => {
    if (!rootRef.current || isMobile) return;
    const anchor = rootRef.current.getBoundingClientRect();
    const popoverHeight = popoverRef.current?.offsetHeight ?? 0;
    setPos(computePopoverPosition(anchor, popoverHeight));
  };

  useLayoutEffect(() => {
    if (!open) return;
    if (!isMobile) {
      reposition();
      const frame = window.requestAnimationFrame(reposition);
      return () => window.cancelAnimationFrame(frame);
    }
    const selected = popoverRef.current?.querySelectorAll('[aria-selected="true"]');
    selected?.forEach((el) => {
      (el as HTMLElement).scrollIntoView({ block: "center" });
    });
  }, [open, isMobile, hour, minute]);

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
  }, [open, isMobile]);

  const apply = (nextHour: number, nextMinute: number) => {
    const snapped = snapMinute(nextMinute, step);
    setHour(nextHour);
    setMinute(snapped);
    onChange(formatTime(nextHour, snapped));
  };

  const pickMinute = (nextMinute: number) => {
    apply(hour, nextMinute);
    setOpen(false);
  };

  const column = (
    items: number[],
    selected: number,
    onPick: (value: number) => void,
    label: string,
  ) => (
    <div className="min-w-0 flex-1">
      <div className="mb-2 text-center text-[11px] font-medium uppercase tracking-wider text-ink-muted">
        {label}
      </div>
      <div className="max-h-56 overflow-y-auto overscroll-contain rounded-2xl border border-line bg-surface/50 p-1 scrollbar-thin sm:max-h-64">
        {items.map((item) => {
          const active = item === selected;
          return (
            <button
              key={item}
              type="button"
              aria-selected={active}
              onClick={() => onPick(item)}
              className={[
                "flex h-11 w-full items-center justify-center rounded-xl text-base font-semibold tabular-nums transition-colors sm:h-10 sm:text-sm",
                active
                  ? "bg-brand text-white shadow-sm"
                  : "text-ink hover:bg-brand-light/70",
              ].join(" ")}
            >
              {pad(item)}
            </button>
          );
        })}
      </div>
    </div>
  );

  const panel = (
    <div className="space-y-3">
      <div className="text-center text-sm font-semibold tabular-nums text-ink">
        {formatTime(hour, minute)}
      </div>
      <div className="flex gap-2">
        {column(hours, hour, (next) => apply(next, minute), "Часы")}
        {column(minutes, minute, pickMinute, "Минуты")}
      </div>
      <p className="text-center text-[11px] text-ink-muted">Выберите минуты, чтобы закрыть</p>
    </div>
  );

  const popover = open
    ? createPortal(
        isMobile ? (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" role="dialog" aria-modal>
            <button
              type="button"
              className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
              aria-label="Закрыть"
              onClick={() => setOpen(false)}
            />
            <div
              ref={popoverRef}
              className="relative z-10 w-full max-w-sm rounded-3xl border border-line bg-panel p-4 shadow-card"
            >
              {panel}
            </div>
          </div>
        ) : (
          <div
            ref={popoverRef}
            className="fixed z-[200] rounded-3xl border border-line bg-panel p-3 shadow-card"
            style={{ top: pos.top, left: pos.left, width: pos.width }}
          >
            {panel}
          </div>
        ),
        document.body,
      )
    : null;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) setOpen((v) => !v);
        }}
        className={[
          "h-10 w-full min-w-0 rounded-xl border bg-panel px-2.5 text-left text-sm font-semibold tabular-nums transition-colors focus:outline-none focus:ring-2 sm:h-9 sm:px-3",
          invalid
            ? "border-red-300 text-red-700 focus:ring-red-200"
            : "border-line text-ink hover:border-line2 focus:ring-brand/30",
          open && !invalid ? "border-brand-soft ring-2 ring-brand/30" : "",
          disabled ? "cursor-not-allowed opacity-50" : "",
          className,
        ].join(" ")}
      >
        <span className="block truncate">{value || "--:--"}</span>
      </button>
      {popover}
    </div>
  );
}
