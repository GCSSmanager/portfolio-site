import type { Interval } from "../../lib/availability";
import { heightPx, rangeTopPx } from "../../lib/schedule/coordinates";
import { scheduleStyles } from "./scheduleStyles";

interface Props {
  lunch: Interval;
  rangeStart?: number;
  label?: string;
}

export function LunchBlock({ lunch, rangeStart, label = "обед" }: Props) {
  return (
    <div
      className={scheduleStyles.lunch}
      style={{
        top: rangeTopPx(lunch.startMin, rangeStart),
        height: heightPx(lunch.startMin, lunch.endMin),
        background:
          "repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(0,0,0,0.03) 4px, rgba(0,0,0,0.03) 8px)",
      }}
    >
      <span className="text-[9px] font-semibold text-ink-muted/60 uppercase tracking-widest">{label}</span>
    </div>
  );
}
