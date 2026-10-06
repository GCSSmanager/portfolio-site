import type { Absence, Appointment, DiagnosticPeriod, Employee, Room, Service } from "./types";
import { overlaps, type Interval } from "./availability";
import { employeeShift, lunchInterval } from "./schedule";
import { collapseEmployeeBusyIntervals } from "./group-sessions";
import { countRoomOccupancy } from "./room-capacity";
import { features } from "./features";
import { diagnosticIntervalsForEmployee, employeeOnDiagnosticDay } from "./schedule/dayBlocks";

export type ConflictKind =
  | "no_shift"
  | "lunch"
  | "absence"
  | "employee_busy"
  | "employee_diagnostic"
  | "client_busy"
  | "room_busy";

export type ConflictTone = "neutral" | "warning" | "danger";

export interface ScheduleConflict {
  kind: ConflictKind;
  title: string;
  shortLabel: string;
  hint: string;
  tone: ConflictTone;
}

export const CONFLICT_TEMPLATES: Record<ConflictKind, Omit<ScheduleConflict, "kind">> = {
  no_shift: {
    title: "Специалист не работает",
    shortLabel: "нет смены",
    hint: "Выбранное время вне рабочего графика специалиста.",
    tone: "neutral",
  },
  lunch: {
    title: "Обед",
    shortLabel: "обед",
    hint: "Окно пересекается с обеденным перерывом специалиста.",
    tone: "warning",
  },
  absence: {
    title: "Специалист отсутствует",
    shortLabel: "отсутствие",
    hint: "На это время указана болезнь, отпуск, отгул или другое отсутствие.",
    tone: "danger",
  },
  employee_busy: {
    title: "Специалист занят",
    shortLabel: "специалист занят",
    hint: "У специалиста уже есть запись в это время.",
    tone: "danger",
  },
  employee_diagnostic: {
    title: "Специалист на диагностике",
    shortLabel: "диагностика",
    hint: "На это время стоит окно диагностики — обычная запись недоступна.",
    tone: "danger",
  },
  client_busy: {
    title: "У клиента уже есть запись",
    shortLabel: "клиент занят",
    hint: "В это время у клиента уже стоит другая запись.",
    tone: "danger",
  },
  room_busy: {
    title: "Кабинет занят",
    shortLabel: "кабинет занят",
    hint: "В выбранном кабинете нет свободных мест на это время.",
    tone: "danger",
  },
};

const ABSENCE_SHORT_LABELS: Record<string, string> = {
  SICK: "больничный",
  BUSINESS_TRIP: "командировка",
  VACATION: "отпуск",
  DAY_OFF: "отгул",
  OTHER: "отсутствие",
};

function conflict(kind: ConflictKind, patch: Partial<Omit<ScheduleConflict, "kind">> = {}): ScheduleConflict {
  return { kind, ...CONFLICT_TEMPLATES[kind], ...patch };
}

function sameDay(date: string, absence: Absence) {
  const day = new Date(date);
  const start = new Date(absence.startDate.slice(0, 10));
  const end = new Date(absence.endDate.slice(0, 10));
  return day >= start && day <= end;
}

export function getRoomConflict({
  roomId,
  interval,
  appointments,
  capacity = 1,
  excludeAppointmentId,
  excludeAppointmentIds = [],
  excludeCoStaffSessionId,
  isGroupService = false,
}: {
  roomId?: string;
  interval: Interval;
  appointments: Appointment[];
  /** Число мест кабинета; по умолчанию 1. */
  capacity?: number;
  excludeAppointmentId?: string;
  excludeAppointmentIds?: string[];
  excludeCoStaffSessionId?: string;
  isGroupService?: boolean;
}): ScheduleConflict | null {
  if (!roomId || isGroupService) return null;

  const seats = Math.max(1, capacity || 1);
  const used = countRoomOccupancy(appointments, roomId, interval, {
    excludeAppointmentId,
    excludeAppointmentIds,
    excludeCoStaffSessionId,
  });
  if (used >= seats) {
    return conflict("room_busy", {
      shortLabel: seats > 1 ? `мест нет (${used}/${seats})` : "кабинет занят",
      hint:
        seats > 1
          ? `В кабинете заняты все ${seats} места на это время.`
          : "В выбранном кабинете уже стоит запись.",
    });
  }

  return null;
}

export function getClientConflict({
  clientId,
  interval,
  appointments,
  excludeAppointmentId,
  excludeAppointmentIds = [],
}: {
  clientId?: string;
  interval: Interval;
  appointments: Appointment[];
  excludeAppointmentId?: string;
  excludeAppointmentIds?: string[];
}): ScheduleConflict | null {
  if (!clientId) return null;

  const excluded = new Set(excludeAppointmentIds);
  if (excludeAppointmentId) excluded.add(excludeAppointmentId);

  const appointmentBusy = appointments.some(
    (appointment) =>
      !excluded.has(appointment.id) &&
      appointment.status !== "CANCELLED" &&
      appointment.client.id === clientId &&
      overlaps(interval, { startMin: appointment.startMin, endMin: appointment.endMin }),
  );
  if (appointmentBusy) return conflict("client_busy");

  return null;
}

export function getAppointmentConflict({
  employee,
  date,
  interval,
  appointments,
  diagnosticPeriods = [],
  absences,
  roomId,
  rooms = [],
  clientId,
  service,
  joinGroupSessionId,
  excludeCoStaffSessionId,
  excludeAppointmentId,
  excludeAppointmentIds = [],
  ignoreDiagnosticDay = false,
}: {
  employee: Employee;
  date: string;
  interval: Interval;
  appointments: Appointment[];
  diagnosticPeriods?: DiagnosticPeriod[];
  absences: Absence[];
  roomId?: string;
  rooms?: Pick<Room, "id" | "capacity">[];
  clientId?: string;
  service?: Service | null;
  joinGroupSessionId?: string;
  excludeCoStaffSessionId?: string;
  excludeAppointmentId?: string;
  excludeAppointmentIds?: string[];
  /** Пропустить проверку окон диагностики (редко нужно). */
  ignoreDiagnosticDay?: boolean;
}): ScheduleConflict | null {
  const shift = employeeShift(employee, date);
  if (!shift || interval.startMin < shift.startMin || interval.endMin > shift.endMin) {
    return conflict("no_shift");
  }

  const lunch = lunchInterval(shift);
  if (lunch && overlaps(interval, lunch)) {
    return conflict("lunch");
  }

  const absence = absences.find((item) => {
    if (item.employeeId !== employee.id || !sameDay(date, item)) return false;
    const startMin = item.startMin ?? shift.startMin;
    const endMin = item.endMin ?? shift.endMin;
    return overlaps(interval, { startMin, endMin });
  });
  if (absence) {
    const shortLabel = ABSENCE_SHORT_LABELS[absence.type] ?? CONFLICT_TEMPLATES.absence.shortLabel;
    return conflict("absence", { shortLabel, title: shortLabel[0].toUpperCase() + shortLabel.slice(1) });
  }

  const excludedAppointmentIds = new Set(excludeAppointmentIds);
  if (excludeAppointmentId) excludedAppointmentIds.add(excludeAppointmentId);

  const employeeBusy = collapseEmployeeBusyIntervals(
    appointments.filter((appointment) => appointment.employee.id === employee.id),
    {
      excludeAppointmentIds: [...excludedAppointmentIds],
      excludeGroupSessionId: joinGroupSessionId,
      excludeCoStaffSessionId,
    },
  ).some((busy) => overlaps(interval, busy));
  if (employeeBusy) return conflict("employee_busy");

  if (!ignoreDiagnosticDay && features.diagnosticBookingMode !== "parallel") {
    if (features.diagnosticBookingMode === "day") {
      if (employeeOnDiagnosticDay(employee.id, date, diagnosticPeriods)) {
        return conflict("employee_diagnostic", {
          hint: "Специалист в периоде диагностики — день недоступен для записей.",
        });
      }
    } else {
      const diagnosticHit = diagnosticIntervalsForEmployee(employee.id, date, diagnosticPeriods).some((block) =>
        overlaps(interval, block),
      );
      if (diagnosticHit) return conflict("employee_diagnostic");
    }
  }

  const clientExcludeIds = [...excludedAppointmentIds];
  if (excludeCoStaffSessionId) {
    for (const appointment of appointments) {
      if (appointment.coStaffSessionId === excludeCoStaffSessionId) {
        clientExcludeIds.push(appointment.id);
      }
    }
  }

  const clientConflict = getClientConflict({
    clientId,
    interval,
    appointments,
    excludeAppointmentId,
    excludeAppointmentIds: clientExcludeIds,
  });
  if (clientConflict) return clientConflict;

  const roomCapacity =
    rooms.find((room) => room.id === roomId)?.capacity ??
    appointments.find((appointment) => appointment.room?.id === roomId)?.room?.capacity ??
    1;

  return getRoomConflict({
    roomId,
    interval,
    appointments,
    capacity: roomCapacity,
    excludeAppointmentId,
    excludeAppointmentIds: clientExcludeIds,
    excludeCoStaffSessionId,
    isGroupService: service?.isGroup,
  });
}

/** Конфликт отсутствия с существующими записями специалиста. */
export function getAbsenceConflict({
  employeeId,
  startDate,
  endDate,
  startMin,
  endMin,
  appointments,
}: {
  employeeId: string;
  startDate: string;
  endDate: string;
  startMin?: number | null;
  endMin?: number | null;
  appointments: Appointment[];
}): ScheduleConflict | null {
  if (!employeeId || !startDate || !endDate) return null;

  const rangeStart = startDate.slice(0, 10);
  const rangeEnd = endDate.slice(0, 10);
  const allDay = startMin == null || endMin == null;

  const hasOverlap = appointments.some((appointment) => {
    if (appointment.status === "CANCELLED") return false;
    if (appointment.employee.id !== employeeId) return false;
    const day = appointment.date.slice(0, 10);
    if (day < rangeStart || day > rangeEnd) return false;
    if (allDay) return true;
    return overlaps(
      { startMin: startMin!, endMin: endMin! },
      { startMin: appointment.startMin, endMin: appointment.endMin },
    );
  });

  if (!hasOverlap) return null;
  return conflict("employee_busy", {
    title: "Есть записи",
    shortLabel: "есть запись",
    hint: "На это время у специалиста уже есть запись. Сначала перенесите или удалите запись.",
  });
}

export function conflictMessage(conflictItem: ScheduleConflict | null | undefined) {
  if (!conflictItem) return "";
  return conflictItem.title;
}
