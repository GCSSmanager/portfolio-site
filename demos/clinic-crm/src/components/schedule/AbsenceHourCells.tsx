import { heightPx, rangeTopPx } from "../../lib/schedule/coordinates";
import { overlaps, type Interval } from "../../lib/availability";
import { scheduleStyles } from "./scheduleStyles";

interface Props {
  startMin: number;
  endMin: number;
  rangeStart?: number;
  label: string;
  onOpen?: () => void;
  /** Слоты, пересекающиеся с этими интервалами — без текстовой подписи. */
  hideLabelOver?: Interval[];
  /** Лёгкая заливка без полос (диагностика) — не блокирует визуально как отсутствие. */
  tone?: "absence" | "diagnostic";
}

const ABSENCE_STRIPE =
  "repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(0,0,0,0.03) 4px, rgba(0,0,0,0.03) 8px)";

/** Очень светлый оттенок бренда — фон дня диагностики, не мешает записям. */
const DIAGNOSTIC_FILL = "rgba(82, 148, 77, 0.06)";

/** Нарезать интервал отсутствия на часовые сегменты (с частичными краями). */
export function hourSegments(startMin: number, endMin: number) {
  const segments: { startMin: number; endMin: number }[] = [];
  const firstHour = Math.floor(startMin / 60) * 60;
  for (let hour = firstHour; hour < endMin; hour += 60) {
    const segStart = Math.max(startMin, hour);
    const segEnd = Math.min(endMin, hour + 60);
    if (segEnd > segStart) segments.push({ startMin: segStart, endMin: segEnd });
  }
  return segments;
}

export function AbsenceHourCells({
  startMin,
  endMin,
  rangeStart,
  label,
  onOpen,
  hideLabelOver,
  tone = "absence",
}: Props) {
  const segments = hourSegments(startMin, endMin);
  const interactive = !!onOpen;
  const isDiagnostic = tone === "diagnostic";

  return (
    <>
      <div
        className={isDiagnostic ? scheduleStyles.diagnostic : scheduleStyles.lunch}
        style={{
          top: rangeTopPx(startMin, rangeStart),
          height: heightPx(startMin, endMin),
          background: isDiagnostic ? DIAGNOSTIC_FILL : ABSENCE_STRIPE,
        }}
        aria-hidden
      />
      {segments.map((segment) => {
        const hideLabel = hideLabelOver?.some((busy) => overlaps(segment, busy));
        if (hideLabel && !interactive) return null;

        const className = [
          "absolute left-1 right-1 z-[4] flex items-center justify-center overflow-hidden rounded-lg px-0.5",
          interactive
            ? "cursor-pointer border border-transparent hover:border-line hover:bg-panel/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
            : "pointer-events-none",
        ].join(" ");
        const style = {
          top: rangeTopPx(segment.startMin, rangeStart),
          height: heightPx(segment.startMin, segment.endMin),
        };
        const compactLabel = label.length <= 14 && !/\s/.test(label.trim());
        const content = hideLabel ? null : (
          <span
            className={[
              "max-w-full px-0.5 text-center text-[9px] font-medium whitespace-normal break-words [overflow-wrap:anywhere]",
              isDiagnostic ? "text-brand-dark/35" : "font-semibold text-ink-muted/70",
              compactLabel ? "uppercase tracking-widest" : "normal-case leading-tight",
            ].join(" ")}
          >
            {label}
          </span>
        );
        if (!interactive) {
          return (
            <div key={segment.startMin} className={className} style={style}>
              {content}
            </div>
          );
        }
        return (
          <button
            key={segment.startMin}
            type="button"
            tabIndex={-1}
            className={className}
            style={style}
            onMouseDown={(event) => event.preventDefault()}
            onClick={(event) => {
              event.stopPropagation();
              onOpen();
            }}
          >
            {content}
          </button>
        );
      })}
    </>
  );
}
