import type { Appointment, Service } from "./types";
import { overlaps, type Interval } from "./availability";
import { clientFitsGroupAgeRange } from "./group-age";

export type GroupJoinVisual = "available" | "conflict";

/** Подсветка существующей группы при выборе групповой услуги: пунктир / красный при занятости клиента. */
export function resolveGroupJoinVisual({
  highlightService,
  highlightClientId,
  highlightClientBirthDate,
  members,
  dayAppointments,
}: {
  highlightService?: Service | null;
  highlightClientId?: string;
  highlightClientBirthDate?: string | null;
  members: Appointment[];
  dayAppointments: Appointment[];
}): GroupJoinVisual | null {
  if (!highlightService?.isGroup) return null;
  const primary = members[0];
  if (!primary?.groupSessionId || !primary.service.isGroup) return null;
  if (primary.service.id !== highlightService.id) return null;
  if (highlightClientId && clientAlreadyInGroup(highlightClientId, members)) return null;

  if (
    highlightClientId &&
    primary.groupAgeRange &&
    !clientFitsGroupAgeRange(highlightClientBirthDate, primary.groupAgeRange, primary.date)
  ) {
    return null;
  }

  if (highlightClientId) {
    const interval = { startMin: primary.startMin, endMin: primary.endMin };
    const busy = dayAppointments.some(
      (appointment) =>
        appointment.status !== "CANCELLED" &&
        appointment.client.id === highlightClientId &&
        appointment.groupSessionId !== primary.groupSessionId &&
        overlaps(interval, { startMin: appointment.startMin, endMin: appointment.endMin }),
    );
    if (busy) return "conflict";
  }

  return "available";
}

export function collapseEmployeeBusyIntervals(
  appointments: Appointment[],
  options?: {
    excludeAppointmentId?: string;
    excludeAppointmentIds?: string[];
    excludeGroupSessionId?: string;
    excludeCoStaffSessionId?: string;
  },
): Interval[] {
  const excludedIds = new Set(options?.excludeAppointmentIds ?? []);
  if (options?.excludeAppointmentId) excludedIds.add(options.excludeAppointmentId);

  const seenGroup = new Set<string>();
  const busy: Interval[] = [];

  for (const appointment of appointments) {
    if (appointment.status === "CANCELLED") continue;
    if (excludedIds.has(appointment.id)) continue;
    if (options?.excludeGroupSessionId && appointment.groupSessionId === options.excludeGroupSessionId) continue;
    if (
      options?.excludeCoStaffSessionId &&
      appointment.coStaffSessionId === options.excludeCoStaffSessionId
    ) {
      continue;
    }

    if (appointment.groupSessionId) {
      if (seenGroup.has(appointment.groupSessionId)) continue;
      seenGroup.add(appointment.groupSessionId);
    }

    busy.push({ startMin: appointment.startMin, endMin: appointment.endMin });
  }

  return busy;
}

export function formatSpecialistNames(appointments: Appointment[]) {
  const names: string[] = [];
  const seen = new Set<string>();
  for (const appointment of appointments) {
    if (seen.has(appointment.employee.id)) continue;
    seen.add(appointment.employee.id);
    names.push(appointment.employee.shortName);
  }
  return names.join(", ");
}

export function roomBlockingAppointments(
  appointments: Appointment[],
  options?: { excludeAppointmentId?: string; excludeAppointmentIds?: string[] },
) {
  const excludedIds = new Set(options?.excludeAppointmentIds ?? []);
  if (options?.excludeAppointmentId) excludedIds.add(options.excludeAppointmentId);

  return appointments.filter((appointment) => {
    if (appointment.status === "CANCELLED") return false;
    if (excludedIds.has(appointment.id)) return false;
    return !appointment.service.isGroup;
  });
}

export type ScheduleAppointmentItem =
  | { kind: "single"; appointment: Appointment }
  | { kind: "group"; groupSessionId: string; appointments: Appointment[] }
  | { kind: "coStaff"; coStaffSessionId: string; appointments: Appointment[] };

export function clusterAppointmentsForColumn(appointments: Appointment[]): ScheduleAppointmentItem[] {
  const groups = new Map<string, Appointment[]>();
  const singles: Appointment[] = [];

  for (const appointment of appointments) {
    if (appointment.groupSessionId && appointment.service.isGroup) {
      const list = groups.get(appointment.groupSessionId) ?? [];
      list.push(appointment);
      groups.set(appointment.groupSessionId, list);
    } else {
      singles.push(appointment);
    }
  }

  const items: ScheduleAppointmentItem[] = singles.map((appointment) => ({ kind: "single", appointment }));
  for (const [groupSessionId, members] of groups) {
    members.sort((a, b) => a.client.fullName.localeCompare(b.client.fullName, "ru"));
    items.push({ kind: "group", groupSessionId, appointments: members });
  }

  return items.sort((a, b) => {
    const startA = a.kind === "single" ? a.appointment.startMin : a.appointments[0]!.startMin;
    const startB = b.kind === "single" ? b.appointment.startMin : b.appointments[0]!.startMin;
    return startA - startB;
  });
}

/** В расписании клиента схлопываем мульти-специалистов в один блок. */
export function clusterAppointmentsForClientDay(appointments: Appointment[]): ScheduleAppointmentItem[] {
  const seenCoStaff = new Set<string>();
  const seenGroups = new Set<string>();
  const items: ScheduleAppointmentItem[] = [];

  for (const appointment of appointments) {
    if (appointment.coStaffSessionId) {
      if (seenCoStaff.has(appointment.coStaffSessionId)) continue;
      seenCoStaff.add(appointment.coStaffSessionId);
      if (appointment.groupSessionId) seenGroups.add(appointment.groupSessionId);
      const members = appointments
        .filter((item) => item.coStaffSessionId === appointment.coStaffSessionId)
        .sort((a, b) => a.employee.shortName.localeCompare(b.employee.shortName, "ru"));
      items.push({ kind: "coStaff", coStaffSessionId: appointment.coStaffSessionId, appointments: members });
      continue;
    }

    if (appointment.groupSessionId && appointment.service.isGroup) {
      if (seenGroups.has(appointment.groupSessionId)) continue;
      seenGroups.add(appointment.groupSessionId);
      const members = appointments
        .filter((item) => item.groupSessionId === appointment.groupSessionId)
        .sort((a, b) => a.client.fullName.localeCompare(b.client.fullName, "ru"));
      items.push({ kind: "group", groupSessionId: appointment.groupSessionId, appointments: members });
      continue;
    }

    items.push({ kind: "single", appointment });
  }

  return items.sort((a, b) => {
    const startA = a.kind === "single" ? a.appointment.startMin : a.appointments[0]!.startMin;
    const startB = b.kind === "single" ? b.appointment.startMin : b.appointments[0]!.startMin;
    return startA - startB;
  });
}

export function findOpenGroupSessions({
  appointments,
  serviceId,
  employeeId,
  date,
}: {
  appointments: Appointment[];
  serviceId: string;
  employeeId?: string;
  date: string;
}) {
  const groups = new Map<string, Appointment[]>();
  for (const appointment of appointments) {
    if (
      appointment.status === "CANCELLED" ||
      !appointment.groupSessionId ||
      !appointment.service.isGroup ||
      appointment.service.id !== serviceId ||
      appointment.date.slice(0, 10) !== date.slice(0, 10) ||
      (employeeId && appointment.employee.id !== employeeId)
    ) {
      continue;
    }
    const list = groups.get(appointment.groupSessionId) ?? [];
    list.push(appointment);
    groups.set(appointment.groupSessionId, list);
  }
  return [...groups.entries()].map(([groupSessionId, members]) => ({
    groupSessionId,
    members,
    appointment: members[0]!,
  }));
}

export function clientAlreadyInGroup(clientId: string, members: Appointment[]) {
  return members.some((member) => member.client.id === clientId);
}

export function buildGroupSizeBySessionId(appointments: Iterable<Appointment>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const appointment of appointments) {
    if (appointment.status === "CANCELLED" || !appointment.groupSessionId) continue;
    counts.set(appointment.groupSessionId, (counts.get(appointment.groupSessionId) ?? 0) + 1);
  }
  return counts;
}

export function groupOverlapsInterval(members: Appointment[], interval: Interval) {
  const sample = members[0];
  if (!sample) return false;
  return overlaps(interval, { startMin: sample.startMin, endMin: sample.endMin });
}
