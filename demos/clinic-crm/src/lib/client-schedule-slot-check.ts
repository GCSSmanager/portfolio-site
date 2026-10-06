import { parseISO } from "date-fns";
import type { Absence, Appointment, DiagnosticPeriod, Employee } from "./types";
import { getAppointmentConflict, getClientConflict, type ScheduleConflict } from "./conflicts";

export type ClientScheduleSlotTarget =
  | { ok: true; label: "доступно" }
  | { ok: false; conflict: ScheduleConflict };

function absencesForDate(absences: Absence[], date: string) {
  const day = parseISO(date);
  return absences.filter((absence) => {
    const start = parseISO(absence.startDate.slice(0, 10));
    const end = parseISO(absence.endDate.slice(0, 10));
    return day >= start && day <= end;
  });
}

export function checkClientScheduleSlot(params: {
  date: string;
  startMin: number;
  appointment: Appointment;
  groupMembers?: Appointment[];
  excludeAppointmentId?: string;
  employee: Employee | null;
  employees?: Employee[];
  appointmentsByDate: Map<string, Appointment[]>;
  diagnosticPeriodsByDate: Map<string, DiagnosticPeriod[]>;
  absences: Absence[];
}): ClientScheduleSlotTarget {
  const {
    date,
    startMin,
    appointment,
    groupMembers,
    excludeAppointmentId,
    employee,
    employees = [],
    appointmentsByDate,
    diagnosticPeriodsByDate,
    absences,
  } = params;

  const duration = appointment.endMin - appointment.startMin;
  const endMin = startMin + duration;
  const interval = { startMin, endMin };
  const members = groupMembers?.length ? groupMembers : [appointment];
  const excludeIds = new Set(members.map((member) => member.id));
  excludeIds.add(appointment.id);
  if (excludeAppointmentId) excludeIds.add(excludeAppointmentId);
  if (appointment.coStaffSessionId) {
    for (const item of appointmentsByDate.get(date) ?? []) {
      if (item.coStaffSessionId === appointment.coStaffSessionId) excludeIds.add(item.id);
    }
  }
  if (appointment.groupSessionId) {
    for (const item of appointmentsByDate.get(date) ?? []) {
      if (item.groupSessionId === appointment.groupSessionId) excludeIds.add(item.id);
    }
  }
  const excludeAppointmentIds = [...excludeIds];

  const staffEmployees: Employee[] = [];
  const seenStaff = new Set<string>();
  for (const member of members) {
    if (seenStaff.has(member.employee.id)) continue;
    seenStaff.add(member.employee.id);
    const resolved =
      employees.find((item) => item.id === member.employee.id) ??
      (member.employee.id === employee?.id ? employee : null);
    if (resolved) staffEmployees.push(resolved);
  }
  if (!staffEmployees.length && employee) staffEmployees.push(employee);

  if (!staffEmployees.length) {
    return {
      ok: false,
      conflict: { kind: "no_shift", title: "Специалист не найден", shortLabel: "нет смены", hint: "", tone: "neutral" },
    };
  }

  const service = {
    ...appointment.service,
    durationMin: duration,
    isActive: true,
  };

  const dayAppointments = appointmentsByDate.get(date) ?? [];
  const dayAbsences = absencesForDate(absences, date);
  const dayDiagnostics = diagnosticPeriodsByDate.get(date) ?? [];

  for (const staff of staffEmployees) {
    const slotConflict = getAppointmentConflict({
      employee: staff,
      date,
      interval,
      appointments: dayAppointments,
      diagnosticPeriods: dayDiagnostics,
      absences: dayAbsences,
      roomId: appointment.room?.id,
      service,
      excludeAppointmentIds,
      joinGroupSessionId: appointment.groupSessionId ?? undefined,
      excludeCoStaffSessionId: appointment.coStaffSessionId ?? undefined,
    });
    if (slotConflict) return { ok: false, conflict: slotConflict };
  }

  const uniqueClients = [...new Set(members.map((member) => member.client.id))];
  for (const clientId of uniqueClients) {
    const clientConflict = getClientConflict({
      clientId,
      interval,
      appointments: dayAppointments,
      excludeAppointmentIds,
    });
    if (clientConflict) return { ok: false, conflict: clientConflict };
  }

  return { ok: true, label: "доступно" };
}
