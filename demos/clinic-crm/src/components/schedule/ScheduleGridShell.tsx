import type { ReactNode } from "react";
import { TIME_W } from "../../lib/schedule/coordinates";
import type { Employee } from "../../lib/types";
import { scheduleStyles } from "./scheduleStyles";

interface Props {
  employees: Employee[];
  columnWidth: number;
  children: ReactNode;
}

export function ScheduleGridShell({ employees, columnWidth, children }: Props) {
  return (
    <div className={scheduleStyles.shell}>
      <div className={scheduleStyles.scroll}>
        <div
          className={scheduleStyles.grid}
          style={{ gridTemplateColumns: `${TIME_W}px repeat(${employees.length}, ${columnWidth}px)` }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
