import type { Employee } from "./types";
import type { Interval } from "./availability";
import { parseISO } from "date-fns";

export function weekdayFromDate(dateStr: string) {
  const d = parseISO(dateStr);
  return d.getDay() === 0 ? 7 : d.getDay();
}

export function employeeShift(employee: Employee, dateStr: string): Interval | null {
  const wd = weekdayFromDate(dateStr);
  const shift = employee.workShifts?.find((s) => s.weekday === wd);
  if (!shift) return null;
  return {
    startMin: shift.startMin,
    endMin: shift.endMin,
    lunchStartMin: shift.lunchStartMin,
    lunchEndMin: shift.lunchEndMin,
  };
}

export function lunchInterval(shift: Interval | null): Interval | null {
  if (!shift || shift.lunchStartMin == null || shift.lunchEndMin == null) return null;
  if (shift.lunchEndMin <= shift.lunchStartMin) return null;
  return { startMin: shift.lunchStartMin, endMin: shift.lunchEndMin };
}
