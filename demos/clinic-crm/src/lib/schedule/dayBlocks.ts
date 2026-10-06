import type { Absence, ClinicWorkDay, DiagnosticPeriod } from "../types";
import type { Interval } from "../availability";
import { absenceDisplayLabel } from "../format";
import { features } from "../features";
import { employeeShift } from "../schedule";

export interface ScheduleDayBlock extends Interval {
  label: string;
  /** Если задан — блок отсутствия, кликабельный и с подписью в каждом часе. */
  absenceId?: string;
  /** Блок диагностики: подпись скрывать на занятых слотах. */
  isDiagnostic?: boolean;
}

function inDateRange(date: string, startDate: string, endDate: string) {
  const day = new Date(date.slice(0, 10));
  const start = new Date(startDate.slice(0, 10));
  const end = new Date(endDate.slice(0, 10));
  return day >= start && day <= end;
}

/** «диагностика» или «диагностика (название периода)». */
export function formatDiagnosticLabel(title?: string | null, capitalize = false) {
  const word = capitalize ? "Диагностика" : "диагностика";
  const name = title?.trim();
  return name ? `${word} (${name})` : word;
}

export function diagnosticPeriodForEmployee(
  employeeId: string,
  date: string,
  diagnosticPeriods: DiagnosticPeriod[],
) {
  return diagnosticPeriods.find(
    (period) =>
      period.participants.some((participant) => participant.employeeId === employeeId) &&
      inDateRange(date, period.startDate, period.endDate),
  );
}

function workWindow(
  rangeStart: number,
  rangeEnd: number,
  shift: ReturnType<typeof employeeShift>,
  clinicDay?: ClinicWorkDay | null,
): Interval | null {
  if (!clinicDay?.isOpen || !shift) return null;
  const workStart = Math.max(rangeStart, clinicDay.startMin, shift.startMin);
  const workEnd = Math.min(rangeEnd, clinicDay.endMin, shift.endMin);
  if (workEnd <= workStart) return null;
  return { startMin: workStart, endMin: workEnd };
}

export function scheduleDayBlocks({
  employeeId,
  date,
  absences,
  diagnosticPeriods,
  shift,
  rangeStart,
  rangeEnd,
  clinicDay,
}: {
  employeeId: string;
  date: string;
  absences: Absence[];
  diagnosticPeriods: DiagnosticPeriod[];
  shift: ReturnType<typeof employeeShift>;
  rangeStart: number;
  rangeEnd: number;
  clinicDay?: ClinicWorkDay | null;
}): ScheduleDayBlock[] {
  const blocks: ScheduleDayBlock[] = [];
  const window = workWindow(rangeStart, rangeEnd, shift, clinicDay);
  if (!window) return blocks;

  for (const absence of absences) {
    if (absence.employeeId !== employeeId || !inDateRange(date, absence.startDate, absence.endDate)) continue;
    const startMin = Math.max(window.startMin, absence.startMin ?? window.startMin);
    const endMin = Math.min(window.endMin, absence.endMin ?? window.endMin);
    if (endMin <= startMin) continue;
    blocks.push({
      startMin,
      endMin,
      label: absenceDisplayLabel(absence, "отсутствие"),
      absenceId: absence.id,
    });
  }

  const period = diagnosticPeriodForEmployee(employeeId, date, diagnosticPeriods);
  if (period) {
    if (features.diagnosticBookingMode === "day") {
      blocks.push({
        startMin: window.startMin,
        endMin: window.endMin,
        label: formatDiagnosticLabel(period.title),
        isDiagnostic: true,
      });
    } else {
      const dayKey = date.slice(0, 10);
      const intervals = (period.intervals ?? []).filter((item) => item.date.slice(0, 10) === dayKey);
      for (const interval of intervals) {
        const startMin = Math.max(window.startMin, interval.startMin);
        const endMin = Math.min(window.endMin, interval.startMin + period.durationMin);
        if (endMin <= startMin) continue;
        blocks.push({
          startMin,
          endMin,
          label: formatDiagnosticLabel(period.title),
          isDiagnostic: true,
        });
      }
    }
  }

  return blocks;
}

export function employeeOnDiagnosticDay(
  employeeId: string,
  date: string,
  diagnosticPeriods: DiagnosticPeriod[],
) {
  return !!diagnosticPeriodForEmployee(employeeId, date, diagnosticPeriods);
}

/** Добавленные окна диагностики специалиста на день. */
export function diagnosticIntervalsForEmployee(
  employeeId: string,
  date: string,
  diagnosticPeriods: DiagnosticPeriod[],
): Interval[] {
  const period = diagnosticPeriodForEmployee(employeeId, date, diagnosticPeriods);
  if (!period) return [];
  const dayKey = date.slice(0, 10);
  return (period.intervals ?? [])
    .filter((item) => item.date.slice(0, 10) === dayKey)
    .map((item) => ({
      startMin: item.startMin,
      endMin: item.startMin + period.durationMin,
    }));
}
