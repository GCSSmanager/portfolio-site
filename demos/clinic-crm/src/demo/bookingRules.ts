import { getISODay, parseISO } from "date-fns";
import type { DemoDb } from "./seed";
import {
  clientFitsGroupAgeRange,
  groupAgeRangeFromBirthDate,
  groupAgeRangeMismatchMessage,
  type GroupAgeRange,
} from "../lib/group-age";

export { groupAgeRangeMismatchMessage };

const SLOT_MIN = 15;

export type Interval = { startMin: number; endMin: number };

export function isSlotAligned(min: number) {
  return min % SLOT_MIN === 0;
}

export function overlaps(a: Interval, b: Interval) {
  return a.startMin < b.endMin && b.startMin < a.endMin;
}

function weekdayOf(date: string) {
  return getISODay(parseISO(date));
}

function collapseEmployeeBusy(
  appointments: DemoDb["appointments"],
  options?: {
    excludeAppointmentId?: string;
    excludeAppointmentIds?: string[];
    excludeGroupSessionId?: string;
    excludeCoStaffSessionId?: string;
  },
): Interval[] {
  const excludeIds = new Set(options?.excludeAppointmentIds ?? []);
  if (options?.excludeAppointmentId) excludeIds.add(options.excludeAppointmentId);
  const seenGroup = new Set<string>();
  const busy: Interval[] = [];

  for (const appointment of appointments) {
    if (appointment.status === "CANCELLED") continue;
    if (excludeIds.has(appointment.id)) continue;
    if (options?.excludeGroupSessionId && appointment.groupSessionId === options.excludeGroupSessionId) continue;
    if (options?.excludeCoStaffSessionId && appointment.coStaffSessionId === options.excludeCoStaffSessionId) {
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

function countRoomOccupancy(
  db: DemoDb,
  date: string,
  roomId: string,
  interval: Interval,
  options?: {
    excludeAppointmentId?: string;
    excludeAppointmentIds?: string[];
    excludeCoStaffSessionId?: string;
  },
) {
  const excludeIds = new Set(options?.excludeAppointmentIds ?? []);
  if (options?.excludeAppointmentId) excludeIds.add(options.excludeAppointmentId);
  const seenCoStaff = new Set<string>();
  let used = 0;

  for (const appointment of db.appointments) {
    if (appointment.status === "CANCELLED") continue;
    if (appointment.date !== date || appointment.roomId !== roomId) continue;
    if (excludeIds.has(appointment.id)) continue;
    const service = db.services.find((s) => s.id === appointment.serviceId);
    if (service?.isGroup) continue;
    if (
      options?.excludeCoStaffSessionId &&
      appointment.coStaffSessionId === options.excludeCoStaffSessionId
    ) {
      continue;
    }
    if (!overlaps(interval, { startMin: appointment.startMin, endMin: appointment.endMin })) continue;
    if (appointment.coStaffSessionId) {
      if (seenCoStaff.has(appointment.coStaffSessionId)) continue;
      seenCoStaff.add(appointment.coStaffSessionId);
    }
    used += 1;
  }
  return used;
}

export function employeeBusyForDate(
  db: DemoDb,
  employeeId: string,
  date: string,
  options?: {
    excludeAppointmentId?: string;
    excludeAppointmentIds?: string[];
    excludeGroupSessionId?: string;
    excludeCoStaffSessionId?: string;
  },
) {
  const employee = db.employees.find((e) => e.id === employeeId && e.isActive);
  if (!employee) return { shift: null as Interval | null, busy: [] as Interval[], error: "Специалист не найден" };

  const weekday = weekdayOf(date);
  const shiftRow = employee.workShifts?.find((s) => s.weekday === weekday);
  if (!shiftRow) return { shift: null, busy: [], error: null };

  const shift = { startMin: shiftRow.startMin, endMin: shiftRow.endMin };
  const dayAppointments = db.appointments.filter(
    (a) => a.date === date && a.employeeId === employeeId && a.status !== "CANCELLED",
  );
  const busy: Interval[] = [
    ...collapseEmployeeBusy(dayAppointments, options),
    ...db.absences
      .filter((a) => a.employeeId === employeeId && a.startDate <= date && a.endDate >= date)
      .map((a) => ({
        startMin: a.startMin ?? shift.startMin,
        endMin: a.endMin ?? shift.endMin,
      })),
  ];

  if (shiftRow.lunchStartMin != null && shiftRow.lunchEndMin != null) {
    busy.push({ startMin: shiftRow.lunchStartMin, endMin: shiftRow.lunchEndMin });
  }

  // Режим диагностики: day — весь день; windows — только окна; parallel — не блокирует
  const mode = String(db.features?.diagnosticBookingMode ?? "windows").toLowerCase();
  if (mode !== "parallel") {
    for (const period of db.diagnosticPeriods) {
      if (date < period.startDate || date > period.endDate) continue;
      if (!period.participantIds.includes(employeeId)) continue;
      if (mode === "day") {
        busy.push({ startMin: shift.startMin, endMin: shift.endMin });
        break;
      }
      for (const interval of period.intervals) {
        if (interval.date !== date) continue;
        busy.push({ startMin: interval.startMin, endMin: interval.startMin + period.durationMin });
      }
    }
  }

  return { shift, busy, error: null };
}

export function assertEmployeeSlotAvailable(
  db: DemoDb,
  args: {
    employeeId: string;
    date: string;
    interval: Interval;
    excludeAppointmentId?: string;
    excludeAppointmentIds?: string[];
    excludeGroupSessionId?: string;
    excludeCoStaffSessionId?: string;
  },
) {
  const { shift, busy, error } = employeeBusyForDate(db, args.employeeId, args.date, args);
  if (error) return error;
  if (!shift || args.interval.startMin < shift.startMin || args.interval.endMin > shift.endMin) {
    return "Специалист не работает в это время";
  }
  if (busy.some((b) => overlaps(args.interval, b))) {
    return "Специалист занят в это время";
  }
  return null;
}

export function assertRoomAvailable(
  db: DemoDb,
  args: {
    date: string;
    roomId?: string | null;
    interval: Interval;
    isGroupService: boolean;
    excludeAppointmentId?: string;
    excludeAppointmentIds?: string[];
    excludeCoStaffSessionId?: string;
  },
) {
  if (!args.roomId || args.isGroupService) return null;
  const room = db.rooms.find((r) => r.id === args.roomId && r.isActive);
  if (!room) return "Кабинет не найден";
  const used = countRoomOccupancy(db, args.date, args.roomId, args.interval, args);
  if (used >= Math.max(1, room.capacity || 1)) {
    return room.capacity > 1 ? "Все места в кабинете заняты" : "Кабинет занят в это время";
  }
  return null;
}

export function clientHasBookingOverlap(
  db: DemoDb,
  clientId: string,
  date: string,
  interval: Interval,
  options?: {
    excludeAppointmentId?: string;
    excludeAppointmentIds?: string[];
    excludeCoStaffSessionId?: string;
  },
) {
  const excludeIds = new Set(options?.excludeAppointmentIds ?? []);
  if (options?.excludeAppointmentId) excludeIds.add(options.excludeAppointmentId);

  return db.appointments.some((a) => {
    if (a.status === "CANCELLED" || a.clientId !== clientId || a.date !== date) return false;
    if (excludeIds.has(a.id)) return false;
    if (
      options?.excludeCoStaffSessionId &&
      a.coStaffSessionId &&
      a.coStaffSessionId === options.excludeCoStaffSessionId
    ) {
      return false;
    }
    return overlaps(interval, { startMin: a.startMin, endMin: a.endMin });
  });
}

export function validateJoinGroupSession(
  members: DemoDb["appointments"],
  args: {
    date: string;
    startMin: number;
    endMin: number;
    employeeId: string;
    serviceId: string;
    clientId: string;
  },
) {
  if (!members.length) return "Групповое занятие не найдено";
  const ref = members[0]!;
  if (
    ref.date !== args.date ||
    ref.startMin !== args.startMin ||
    ref.endMin !== args.endMin ||
    ref.serviceId !== args.serviceId
  ) {
    return "Параметры не совпадают с групповым занятием";
  }
  const employeeIds = [...new Set(members.map((m) => m.employeeId))];
  if (!employeeIds.includes(args.employeeId)) {
    return "Параметры не совпадают с групповым занятием";
  }
  if (members.some((m) => m.clientId === args.clientId)) {
    return "Клиент уже записан на это занятие";
  }
  return null;
}

export function resolveGroupAgeRange(
  db: DemoDb,
  members: DemoDb["appointments"],
  clientIds: string[],
  date: string,
): { range: GroupAgeRange | null; error: string | null } {
  let sessionAgeRange = (members[0]?.groupAgeRange as GroupAgeRange | null) ?? null;
  if (!sessionAgeRange && members[0]) {
    const anchor = db.clients.find((c) => c.id === members[0]!.clientId);
    sessionAgeRange = groupAgeRangeFromBirthDate(anchor?.birthDate, date);
  }
  if (!sessionAgeRange && clientIds[0]) {
    const first = db.clients.find((c) => c.id === clientIds[0]);
    sessionAgeRange = groupAgeRangeFromBirthDate(first?.birthDate, date);
  }
  if (sessionAgeRange) {
    for (const clientId of clientIds) {
      const client = db.clients.find((c) => c.id === clientId);
      if (!client) return { range: null, error: "client not found" };
      if (!clientFitsGroupAgeRange(client.birthDate, sessionAgeRange, date)) {
        return { range: sessionAgeRange, error: groupAgeRangeMismatchMessage(sessionAgeRange) };
      }
    }
  }
  return { range: sessionAgeRange, error: null };
}

/** Полная проверка создания/переноса записи как в оригинале (без advisory locks). */
export function validateAppointmentWrite(
  db: DemoDb,
  args: {
    date: string;
    startMin: number;
    endMin: number;
    clientIds: string[];
    employeeIds: string[];
    serviceId: string;
    roomId?: string | null;
    groupSessionId?: string | null;
    /** Перенос существующей группы — не валидировать как join */
    movingExistingGroup?: boolean;
    excludeAppointmentId?: string;
    excludeAppointmentIds?: string[];
    excludeCoStaffSessionId?: string;
  },
): string | null {
  if (!isSlotAligned(args.startMin)) {
    return "startMin должно быть кратно 15 минутам";
  }
  if (!args.clientIds.length || !args.employeeIds.length) {
    return "Нужны клиент и специалист";
  }

  for (const employeeId of args.employeeIds) {
    const emp = db.employees.find((e) => e.id === employeeId);
    if (!emp || !emp.isActive) return "Специалист удалён из системы";
  }

  const service = db.services.find((s) => s.id === args.serviceId && s.isActive);
  if (!service) return "service not found";
  if (!service.isGroup && args.groupSessionId) {
    return "Индивидуальная услуга не может быть добавлена в группу";
  }
  if (!service.isGroup && args.clientIds.length > 1) {
    return "Индивидуальная услуга допускает только одного клиента";
  }

  const interval = { startMin: args.startMin, endMin: args.endMin };

  if (service.isGroup && args.groupSessionId && !args.movingExistingGroup) {
    if (args.clientIds.length !== 1) return "В группу добавляется один клиент за раз";
    const members = db.appointments.filter(
      (a) => a.groupSessionId === args.groupSessionId && a.status !== "CANCELLED",
    );
    const joinError = validateJoinGroupSession(members, {
      date: args.date,
      startMin: args.startMin,
      endMin: args.endMin,
      employeeId: args.employeeIds[0]!,
      serviceId: args.serviceId,
      clientId: args.clientIds[0]!,
    });
    if (joinError) return joinError;
    const age = resolveGroupAgeRange(db, members, args.clientIds, args.date);
    if (age.error) return age.error;
  } else if (service.isGroup && !args.movingExistingGroup) {
    const age = resolveGroupAgeRange(db, [], args.clientIds, args.date);
    if (age.error) return age.error;
  }

  for (const clientId of args.clientIds) {
    if (
      clientHasBookingOverlap(db, clientId, args.date, interval, {
        excludeAppointmentId: args.excludeAppointmentId,
        excludeAppointmentIds: args.excludeAppointmentIds,
        excludeCoStaffSessionId: args.excludeCoStaffSessionId,
      })
    ) {
      return "У клиента уже есть запись в это время";
    }
  }

  for (const employeeId of args.employeeIds) {
    const employeeError = assertEmployeeSlotAvailable(db, {
      employeeId,
      date: args.date,
      interval,
      excludeAppointmentId: args.excludeAppointmentId,
      excludeAppointmentIds: args.excludeAppointmentIds,
      excludeGroupSessionId: args.groupSessionId ?? undefined,
      excludeCoStaffSessionId: args.excludeCoStaffSessionId,
    });
    if (employeeError) return employeeError;
  }

  const roomError = assertRoomAvailable(db, {
    date: args.date,
    roomId: args.roomId,
    interval,
    isGroupService: service.isGroup,
    excludeAppointmentId: args.excludeAppointmentId,
    excludeAppointmentIds: args.excludeAppointmentIds,
    excludeCoStaffSessionId: args.excludeCoStaffSessionId,
  });
  if (roomError) return roomError;

  return null;
}

export function diagnosticSlotFree(
  db: DemoDb,
  periodId: string,
  date: string,
  startMin: number,
) {
  return !db.appointments.some(
    (a) =>
      a.status !== "CANCELLED" &&
      a.diagnosticPeriodId === periodId &&
      a.date === date &&
      a.startMin === startMin,
  );
}
