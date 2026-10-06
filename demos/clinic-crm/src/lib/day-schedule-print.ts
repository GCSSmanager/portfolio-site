import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import {
  buildCompactPdfPageHtml,
  buildCompactScheduleGridHtml,
  packColumnsIntoPages,
  splitDayIntoColumns,
  type SchedulePrintColumn,
  type SchedulePrintPage,
} from "./client-schedule-print";
import { absenceDisplayLabel } from "./format";
import { formatServiceName } from "./service-label";
import { employeeShift } from "./schedule";
import { formatDiagnosticLabel, diagnosticPeriodForEmployee } from "./schedule/dayBlocks";
import { DAY_END, DAY_START } from "./time";
import type { Absence, Appointment, ClientScheduleEntry, DiagnosticPeriod, Employee } from "./types";

export type DayPrintPage = SchedulePrintPage;

function sameDay(date: string, value: string) {
  return date.slice(0, 10) === value.slice(0, 10);
}

function inAbsenceRange(date: string, absence: Absence) {
  const day = date.slice(0, 10);
  return day >= absence.startDate.slice(0, 10) && day <= absence.endDate.slice(0, 10);
}

function appointmentToPrintEntry(
  appointment: Appointment,
  date: string,
  diagnosticPeriods: DiagnosticPeriod[],
): ClientScheduleEntry {
  const isDiagnostic = !!appointment.diagnosticPeriodId;
  const periodTitle = isDiagnostic
    ? diagnosticPeriods.find((period) => period.id === appointment.diagnosticPeriodId)?.title
    : undefined;
  return {
    id: appointment.id,
    date,
    startMin: appointment.startMin,
    endMin: appointment.endMin,
    title: isDiagnostic ? formatDiagnosticLabel(periodTitle, true) : formatServiceName(appointment.service),
    clientName: appointment.client.fullName,
    specialist: appointment.client.fullName,
    room: appointment.room?.name,
    kind: "appointment",
    employeeId: appointment.employee.id,
    serviceId: appointment.service.id,
    isGroup: appointment.service.isGroup,
    groupSessionId: appointment.groupSessionId,
  };
}

function diagnosticIntervalsToPrintEntries(
  employeeId: string,
  date: string,
  periods: DiagnosticPeriod[],
): ClientScheduleEntry[] {
  const period = diagnosticPeriodForEmployee(employeeId, date, periods);
  if (!period) return [];
  const dayKey = date.slice(0, 10);
  const title = formatDiagnosticLabel(period.title, true);
  return (period.intervals ?? [])
    .filter((item) => item.date.slice(0, 10) === dayKey)
    .map((item) => ({
      id: `diagnostic-${period.id}-${item.startMin}`,
      date,
      startMin: item.startMin,
      endMin: item.startMin + period.durationMin,
      title,
      clientName: "",
      specialist: "",
      kind: "absence" as const,
      employeeId,
    }));
}

function absenceWindow(absence: Absence, employee: Employee, date: string) {
  const shift = employeeShift(employee, date);
  const fallbackStart = shift?.startMin ?? DAY_START;
  const fallbackEnd = shift?.endMin ?? DAY_END;
  const startMin = Math.max(fallbackStart, absence.startMin ?? fallbackStart);
  const endMin = Math.min(fallbackEnd, absence.endMin ?? fallbackEnd);
  if (endMin <= startMin) return null;
  return { startMin, endMin, windowStart: fallbackStart, windowEnd: fallbackEnd };
}

/** Весь рабочий день / без явных часов — колонка целиком. */
function isFullDayAbsence(absence: Absence, employee: Employee, date: string) {
  if (absence.startMin == null && absence.endMin == null) return true;
  const window = absenceWindow(absence, employee, date);
  if (!window) return false;
  return window.startMin <= window.windowStart && window.endMin >= window.windowEnd;
}

function absenceToPrintEntry(absence: Absence, employee: Employee, date: string): ClientScheduleEntry | null {
  const window = absenceWindow(absence, employee, date);
  if (!window) return null;

  const title = absenceDisplayLabel(absence, "Отсутствие");
  const note = absence.note?.trim() || "";
  return {
    id: `absence-${absence.id}`,
    date,
    startMin: window.startMin,
    endMin: window.endMin,
    title,
    clientName: "",
    // Для OTHER заметка уже в title — не дублируем.
    specialist: absence.type === "OTHER" ? "" : note,
    kind: "absence",
    employeeId: employee.id,
  };
}

/** Сетка 8×2: все специалисты; в ячейках записи, отсутствия и диагностика. */
export function buildDayPrintPages(
  employees: Employee[],
  appointments: Appointment[],
  date: string,
  absences: Absence[] = [],
  diagnosticPeriods: DiagnosticPeriod[] = [],
): DayPrintPage[] {
  const byEmployee = new Map<string, Appointment[]>();
  for (const appointment of appointments) {
    if (appointment.status === "CANCELLED") continue;
    if (!sameDay(date, appointment.date)) continue;
    const list = byEmployee.get(appointment.employee.id) ?? [];
    list.push(appointment);
    byEmployee.set(appointment.employee.id, list);
  }

  const absencesByEmployee = new Map<string, Absence[]>();
  for (const absence of absences) {
    if (!inAbsenceRange(date, absence)) continue;
    const list = absencesByEmployee.get(absence.employeeId) ?? [];
    list.push(absence);
    absencesByEmployee.set(absence.employeeId, list);
  }

  const columns: SchedulePrintColumn[] = [];

  for (const employee of employees) {
    const employeeAbsences = absencesByEmployee.get(employee.id) ?? [];
    const fullDayAbsence = employeeAbsences.find((absence) => isFullDayAbsence(absence, employee, date));
    const fullDayAbsenceLabel = fullDayAbsence
      ? absenceDisplayLabel(fullDayAbsence, "Отсутствие")
      : undefined;

    const items: ClientScheduleEntry[] = fullDayAbsenceLabel
      ? []
      : [
          ...(byEmployee.get(employee.id) ?? []).map((item) =>
            appointmentToPrintEntry(item, date, diagnosticPeriods),
          ),
          ...employeeAbsences
            .map((absence) => absenceToPrintEntry(absence, employee, date))
            .filter((entry): entry is ClientScheduleEntry => entry != null),
          ...diagnosticIntervalsToPrintEntries(employee.id, date, diagnosticPeriods),
        ].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

    const chunks = splitDayIntoColumns(items);
    for (const chunk of chunks) {
      columns.push({
        date: employee.id,
        label: employee.shortName,
        appointments: chunk,
        fullDayAbsenceLabel,
      });
    }
  }

  return packColumnsIntoPages(columns);
}

export function buildDayScheduleGridHtml({
  title,
  subtitle,
  page,
}: {
  title: string;
  subtitle?: string;
  page: DayPrintPage;
}) {
  return buildCompactScheduleGridHtml({
    title,
    subtitle,
    printPage: page,
    showClientName: false,
    emptyText: "Нет специалистов",
    preview: true,
  });
}

export function buildDaySchedulePdfPageHtml({
  title,
  subtitle,
  page,
  pageNumber,
  totalPages,
}: {
  title: string;
  subtitle?: string;
  page: DayPrintPage;
  pageNumber: number;
  totalPages: number;
}) {
  return buildCompactPdfPageHtml({
    title,
    subtitle,
    printPage: page,
    showClientName: false,
    page: pageNumber,
    totalPages,
  });
}

export function dayScheduleTitle(date: string) {
  return `Расписание · ${format(parseISO(date), "d MMMM yyyy", { locale: ru })}`;
}

export function dayScheduleSubtitle(date: string, employeeCount: number, appointmentCount: number) {
  const weekday = format(parseISO(date), "EEEE", { locale: ru });
  return `${weekday} · ${employeeCount} спец. · ${appointmentCount} записей`;
}
