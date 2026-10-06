import { gridHeight, lineStyle, rangeTopPx, timedBlockStyle } from "../../lib/schedule/coordinates";
import { minToTime } from "../../lib/format";
import { scheduleStyles } from "./scheduleStyles";

interface Props {
  slots: number[];
  hours: number[];
  rangeStart: number;
  rangeEnd: number;
}

export function TimeColumn({ slots, hours, rangeStart, rangeEnd }: Props) {
  return (
    <div
      className={scheduleStyles.timeColumn}
      style={{ height: gridHeight(rangeStart, rangeEnd), width: "100%", minWidth: 0 }}
    >
      {hours.map((hour, index) => (
        <div
          key={hour}
          className={index % 2 === 0 ? "absolute left-0 right-0 bg-surface/40" : "absolute left-0 right-0"}
          style={timedBlockStyle(hour, Math.min(hour + 60, rangeEnd), 0, rangeStart)}
        />
      ))}

      {hours.map((hour) => {
        const isFirst = hour === hours[0];
        return (
          <div
            key={`label-${hour}`}
            className="absolute right-0 flex items-center justify-end pr-2 pointer-events-none z-[5]"
            style={{ top: rangeTopPx(hour, rangeStart), transform: isFirst ? "translateY(6px)" : "translateY(-50%)" }}
          >
            <span className="text-[11px] font-semibold text-ink-muted tabular-nums tracking-tight">
              {minToTime(hour)}
            </span>
          </div>
        );
      })}

      {slots.filter((min) => min % 60 !== 0).map((min) => (
        <div key={`tick-${min}`} className="absolute right-0 w-1.5 border-t border-line2/80" style={lineStyle(min, rangeStart)} />
      ))}
    </div>
  );
}
