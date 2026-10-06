import { buildSlots } from "../lib/time";
import { TIME_W, gridHeight, hoursInDay } from "../lib/schedule/coordinates";
import { scheduleStyles } from "./schedule/scheduleStyles";
import { TimeColumn } from "./schedule/TimeColumn";

const DEFAULT_RANGE = { startMin: 540, endMin: 1080 };

export function ScheduleEmptyState({
  title = "Нет специалиста",
  message,
  gridRange = DEFAULT_RANGE,
}: {
  title?: string;
  message?: string;
  gridRange?: { startMin: number; endMin: number };
}) {
  const slots = buildSlots(gridRange.startMin, gridRange.endMin);
  const hours = hoursInDay(gridRange.startMin, gridRange.endMin);
  const height = gridHeight(gridRange.startMin, gridRange.endMin);

  return (
    <div className={scheduleStyles.shell}>
      <div className={scheduleStyles.scroll}>
        <div
          className={scheduleStyles.grid}
          style={{ gridTemplateColumns: `${TIME_W}px minmax(280px, 1fr)` }}
        >
          <div className={scheduleStyles.headerCorner} />
          <div className={scheduleStyles.employeeHeader}>
            <span className="text-[11px] uppercase tracking-wide text-ink-muted">Специалисты</span>
          </div>

          <TimeColumn slots={slots} hours={hours} rangeStart={gridRange.startMin} rangeEnd={gridRange.endMin} />
          <div className={`${scheduleStyles.column} flex items-center justify-center bg-surface/30`} style={{ height }}>
            <div className="max-w-xs px-6 text-center">
              <p className="text-base font-semibold text-ink">{title}</p>
              {message && <p className="mt-2 text-sm text-ink-muted">{message}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
