import { minToTime } from "../../lib/format";
import {
  CLIENT_TIME_HEADER_H,
  DAY_LABEL_W,
  gridWidth,
  rangeLeftPx,
  timedBlockStyleH,
} from "../../lib/schedule/coordinates";

interface Props {
  hours: number[];
  rangeStart: number;
  rangeEnd: number;
  slotWidth: number;
}

export function ClientTimeHeader({ hours, rangeStart, rangeEnd, slotWidth }: Props) {
  return (
    <div
      className="relative border-b border-line bg-panel"
      style={{ height: CLIENT_TIME_HEADER_H, width: gridWidth(rangeStart, rangeEnd, slotWidth) }}
    >
      {hours.map((hour) => (
        <div
          key={hour}
          className="pointer-events-none absolute top-0 flex h-full items-center justify-start pl-0.5"
          style={{ left: rangeLeftPx(hour, rangeStart, slotWidth) }}
        >
          <span className="text-[10px] font-semibold tabular-nums text-ink-muted">{minToTime(hour)}</span>
        </div>
      ))}
    </div>
  );
}

export function ClientGridCorner() {
  return (
    <div
      className="border-b border-r border-line bg-panel"
      style={{ width: DAY_LABEL_W, minWidth: DAY_LABEL_W, height: CLIENT_TIME_HEADER_H }}
    />
  );
}

export function clientGridTemplate(rangeStart: number, rangeEnd: number, slotWidth: number) {
  return `${DAY_LABEL_W}px ${gridWidth(rangeStart, rangeEnd, slotWidth)}px`;
}

export { DAY_LABEL_W, gridWidth, timedBlockStyleH };
