import type { InternalAxiosRequestConfig } from "axios";
import { addDays, format, getISODay, parseISO } from "date-fns";
import { freeGapsInShift, freeWindows, mergeIntervals, type Interval } from "../lib/availability";
import { minToTime } from "../lib/format";
import { groupAgeRangeFromBirthDate } from "../lib/group-age";
import {
  clientHasBookingOverlap,
  diagnosticSlotFree,
  employeeBusyForDate,
  isSlotAligned,
  resolveGroupAgeRange,
  validateAppointmentWrite,
  validateJoinGroupSession,
} from "./bookingRules";
import { loadDb, newId, saveDb } from "./store";
import type { DemoDb } from "./seed";

type DemoResponse = { status: number; data: unknown; headers?: Record<string, string> };

function ok(data: unknown, status = 200): DemoResponse {
  return { status, data };
}

function err(message: string, status = 400): DemoResponse {
  return { status, data: { error: message } };
}

function publicUser(db: DemoDb, userId: string) {
  const user = db.users.find((u) => u.id === userId);
  if (!user) return null;
  const employee = user.employeeId ? db.employees.find((e) => e.id === user.employeeId) : null;
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    displayName: user.displayName,
    employeeId: user.employeeId,
    employeeName: employee?.shortName ?? null,
    employeeFullName: employee?.fullName ?? null,
    employeeActive: user.employeeId ? (employee?.isActive ?? false) : null,
  };
}

function serializeUserRow(db: DemoDb, userId: string) {
  const user = db.users.find((u) => u.id === userId);
  if (!user) return null;
  const employee = user.employeeId ? db.employees.find((e) => e.id === user.employeeId) : null;
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    employeeId: user.employeeId,
    employee: employee ? { id: employee.id, shortName: employee.shortName, fullName: employee.fullName } : null,
    createdAt: user.createdAt ?? new Date().toISOString(),
  };
}

function serializeCourse(course: DemoDb["clientCourses"][number]) {
  return {
    id: course.id,
    clientId: course.clientId,
    startedAt: course.startedAt,
    completedAt: course.completedAt,
    isCompleted: course.isCompleted,
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
    notes: course.notes,
  };
}

function enrichDiagnostic(db: DemoDb, period: DemoDb["diagnosticPeriods"][number], date?: string) {
  return {
    id: period.id,
    title: period.title,
    startDate: period.startDate,
    endDate: period.endDate,
    note: period.note,
    roomId: period.roomId,
    durationMin: period.durationMin,
    room: db.rooms.find((r) => r.id === period.roomId) ?? null,
    participants: period.participantIds.map((employeeId) => {
      const employee = db.employees.find((e) => e.id === employeeId);
      return {
        employeeId,
        employee: employee ?? { id: employeeId, shortName: "—", fullName: "—", color: "#888", isActive: true },
      };
    }),
    intervals: date ? period.intervals.filter((i) => i.date === date) : period.intervals,
  };
}

function intervalsOverlap(a: Interval, b: Interval) {
  return a.startMin < b.endMin && a.endMin > b.startMin;
}

/** Опции времени для «+ Интервал» — как в оригинальном CRM. */
function diagnosticIntervalStartOptions(
  db: DemoDb,
  period: DemoDb["diagnosticPeriods"][number],
  date: string,
) {
  const weekday = getISODay(parseISO(date));
  const clinicDay = db.clinicWorkDays.find((day) => day.weekday === weekday);
  if (!clinicDay?.isOpen) {
    return [] as Array<{ startMin: number; endMin: number; available: boolean; shortLabel: string }>;
  }

  const shifts = period.participantIds.map((employeeId) => {
    const employee = db.employees.find((item) => item.id === employeeId);
    return employee?.workShifts?.find((shift) => shift.weekday === weekday) ?? null;
  });
  if (shifts.some((shift) => !shift) || shifts.length !== period.participantIds.length) {
    return [];
  }

  const windowStart = Math.max(clinicDay.startMin, ...shifts.map((shift) => shift!.startMin));
  const windowEnd = Math.min(clinicDay.endMin, ...shifts.map((shift) => shift!.endMin));
  if (windowEnd <= windowStart) return [];

  const durationMin = period.durationMin;
  const existing = period.intervals.filter((item) => item.date === date);
  const takenStarts = new Set(existing.map((item) => item.startMin));
  const lunchBlocks = shifts
    .filter((shift) => shift!.lunchStartMin != null && shift!.lunchEndMin != null)
    .map((shift) => ({ startMin: shift!.lunchStartMin!, endMin: shift!.lunchEndMin! }));

  const appointments = db.appointments.filter(
    (appointment) =>
      appointment.status !== "CANCELLED" &&
      appointment.date === date &&
      period.participantIds.includes(appointment.employeeId),
  );
  const absences = db.absences.filter(
    (absence) =>
      period.participantIds.includes(absence.employeeId) &&
      absence.startDate <= date &&
      absence.endDate >= date,
  );
  const roomCapacity = db.rooms.find((room) => room.id === period.roomId)?.capacity ?? 1;

  const options: Array<{ startMin: number; endMin: number; available: boolean; shortLabel: string }> = [];
  for (let startMin = windowStart; startMin + durationMin <= windowEnd; startMin += 15) {
    const endMin = startMin + durationMin;
    const interval = { startMin, endMin };

    if (takenStarts.has(startMin)) {
      options.push({ startMin, endMin, available: false, shortLabel: "в списке" });
      continue;
    }
    if (
      existing.some((item) =>
        intervalsOverlap(interval, { startMin: item.startMin, endMin: item.startMin + durationMin }),
      )
    ) {
      options.push({ startMin, endMin, available: false, shortLabel: "пересекает слот" });
      continue;
    }
    if (lunchBlocks.some((lunch) => intervalsOverlap(interval, lunch))) {
      options.push({ startMin, endMin, available: false, shortLabel: "обед" });
      continue;
    }

    const absenceHit = absences.some((absence) => {
      const index = period.participantIds.indexOf(absence.employeeId);
      const shift = index >= 0 ? shifts[index] : null;
      const absenceStart = absence.startMin ?? shift?.startMin ?? windowStart;
      const absenceEnd = absence.endMin ?? shift?.endMin ?? windowEnd;
      return intervalsOverlap(interval, { startMin: absenceStart, endMin: absenceEnd });
    });
    if (absenceHit) {
      options.push({ startMin, endMin, available: false, shortLabel: "отсутствие" });
      continue;
    }

    const appointmentHit = appointments.some(
      (appointment) =>
        appointment.diagnosticPeriodId !== period.id &&
        intervalsOverlap(interval, { startMin: appointment.startMin, endMin: appointment.endMin }),
    );
    if (appointmentHit) {
      options.push({ startMin, endMin, available: false, shortLabel: "запись" });
      continue;
    }

    const seenCoStaff = new Set<string>();
    let roomUsed = 0;
    for (const appointment of db.appointments) {
      if (appointment.status === "CANCELLED" || appointment.date !== date) continue;
      if (appointment.roomId !== period.roomId) continue;
      if (appointment.diagnosticPeriodId === period.id) continue;
      const service = db.services.find((item) => item.id === appointment.serviceId);
      if (service?.isGroup) continue;
      if (!intervalsOverlap(interval, { startMin: appointment.startMin, endMin: appointment.endMin })) continue;
      if (appointment.coStaffSessionId) {
        if (seenCoStaff.has(appointment.coStaffSessionId)) continue;
        seenCoStaff.add(appointment.coStaffSessionId);
      }
      roomUsed += 1;
    }
    if (roomUsed >= roomCapacity) {
      options.push({ startMin, endMin, available: false, shortLabel: "кабинет" });
      continue;
    }

    options.push({ startMin, endMin, available: true, shortLabel: "" });
  }

  return options;
}

function enrichAppointment(db: DemoDb, apt: DemoDb["appointments"][number]) {
  const client = db.clients.find((c) => c.id === apt.clientId);
  const employee = db.employees.find((e) => e.id === apt.employeeId);
  const service = db.services.find((s) => s.id === apt.serviceId);
  const room = apt.roomId ? db.rooms.find((r) => r.id === apt.roomId) : null;
  return {
    ...apt,
    client: client ? { id: client.id, fullName: client.fullName } : { id: apt.clientId, fullName: "—" },
    employee: employee
      ? { id: employee.id, shortName: employee.shortName, color: employee.color }
      : { id: apt.employeeId, shortName: "—", color: "#888" },
    service: service
      ? {
          id: service.id,
          name: service.name,
          color: service.color,
          isGroup: service.isGroup,
          durationMin: service.durationMin,
        }
      : { id: apt.serviceId, name: "—", color: "#888", isGroup: false, durationMin: 30 },
    room: room ? { id: room.id, name: room.name, capacity: room.capacity } : null,
  };
}

function bodyOf(config: InternalAxiosRequestConfig) {
  if (config.data == null || config.data === "") return {};
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    const out: Record<string, unknown> = {};
    for (const [key, value] of config.data.entries()) {
      if (typeof value === "string") out[key] = value;
      else if (value && typeof value === "object" && "name" in value) {
        out[key] = value;
        out.fileName = (value as File).name;
      }
    }
    return out;
  }
  if (typeof config.data === "string") {
    try {
      return JSON.parse(config.data);
    } catch {
      return {};
    }
  }
  return config.data as Record<string, unknown>;
}

function paramsOf(config: InternalAxiosRequestConfig) {
  const params = config.params as Record<string, string> | undefined;
  if (params) return params;
  const url = config.url ?? "";
  const q = url.includes("?") ? url.slice(url.indexOf("?") + 1) : "";
  return Object.fromEntries(new URLSearchParams(q));
}

function pathOf(config: InternalAxiosRequestConfig) {
  const raw = (config.url ?? "").split("?")[0];
  return raw.replace(/\/$/, "") || "/";
}

function authUserId(config: InternalAxiosRequestConfig, db: DemoDb) {
  const header = config.headers?.Authorization ?? config.headers?.authorization;
  const token = typeof header === "string" && header.startsWith("Bearer ") ? header.slice(7) : "";
  return token ? db.sessions[token] : undefined;
}

function requireAuth(config: InternalAxiosRequestConfig, db: DemoDb) {
  const userId = authUserId(config, db);
  if (!userId) return { error: err("Unauthorized", 401) as DemoResponse };
  const user = publicUser(db, userId);
  if (!user) return { error: err("Unauthorized", 401) as DemoResponse };
  return { user };
}

function listActive<T extends { isActive?: boolean }>(items: T[], all?: string) {
  if (all === "true" || all === "1") return items;
  return items.filter((item) => item.isActive !== false);
}

function refreshClientGroupCounts(db: DemoDb) {
  for (const group of db.clientGroups) {
    group._count = {
      clients: db.clients.filter((c) => c.groupId === group.id && c.isActive !== false).length,
    };
  }
}

function crudCollection<T extends { id: string }>(
  method: string,
  collection: T[],
  id: string | undefined,
  body: Record<string, unknown>,
  create: (body: Record<string, unknown>) => T,
) {
  if (method === "get" && !id) return ok(collection);
  if (method === "post" && !id) {
    const row = create(body);
    collection.push(row);
    return ok(row, 201);
  }
  if (!id) return err("Not found", 404);
  const idx = collection.findIndex((row) => row.id === id);
  if (idx < 0) return err("Not found", 404);
  if (method === "patch") {
    collection[idx] = { ...collection[idx], ...body, id };
    return ok(collection[idx]);
  }
  if (method === "delete") {
    const row = collection[idx] as T & { isActive?: boolean };
    if ("isActive" in row) row.isActive = false;
    else collection.splice(idx, 1);
    return ok({ ok: true });
  }
  return err("Method not allowed", 405);
}

export async function handleDemoRequest(config: InternalAxiosRequestConfig): Promise<DemoResponse> {
  const method = (config.method ?? "get").toLowerCase();
  const path = pathOf(config);
  const params = paramsOf(config);
  const body = bodyOf(config);
  const db = loadDb();

  if (path === "/api/auth/login" && method === "post") {
    const username = String(body.username ?? "");
    const password = String(body.password ?? "");
    const user = db.users.find((u) => u.username === username && u.password === password);
    if (!user) return err("Неверный логин или пароль", 401);
    const token = `demo_${crypto.randomUUID()}`;
    db.sessions[token] = user.id;
    saveDb(db);
    return ok({ token, user: publicUser(db, user.id) });
  }

  if (path === "/api/auth/logout" && method === "post") {
    const header = config.headers?.Authorization ?? config.headers?.authorization;
    const token = typeof header === "string" && header.startsWith("Bearer ") ? header.slice(7) : "";
    if (token) delete db.sessions[token];
    saveDb(db);
    return ok({ ok: true });
  }

  if (path === "/api/auth/me" && method === "get") {
    const gated = requireAuth(config, db);
    if ("error" in gated) return gated.error!;
    return ok({ user: gated.user });
  }

  if (path === "/api/auth/change-password" && method === "post") {
    const gated = requireAuth(config, db);
    if ("error" in gated) return gated.error!;
    const user = db.users.find((u) => u.id === gated.user!.id);
    if (!user || user.password !== String(body.currentPassword ?? "")) {
      return err("Текущий пароль указан неверно");
    }
    user.password = String(body.newPassword ?? "");
    saveDb(db);
    return ok({ ok: true });
  }

  const gated = requireAuth(config, db);
  if ("error" in gated) return gated.error!;

  if (path === "/api/employees") {
    if (method === "get") {
      const ownEmployeeId = gated.user!.role === "SPECIALIST" ? gated.user!.employeeId : null;
      if (ownEmployeeId) {
        return ok(db.employees.filter((employee) => employee.id === ownEmployeeId));
      }
      return ok(listActive(db.employees, params.all));
    }
    if (method === "post") {
      if (gated.user!.role === "SPECIALIST") return err("Недостаточно прав", 403);
      const row = {
        id: newId("emp"),
        fullName: String(body.fullName ?? ""),
        shortName: String(body.shortName ?? ""),
        position: String(body.position ?? ""),
        specialtyId: (body.specialtyId as string | null) ?? null,
        specialty: db.specialties.find((s) => s.id === body.specialtyId) ?? null,
        color: String(body.color ?? "#52944d"),
        isActive: true,
        showInCalendar: body.showInCalendar !== false,
        defaultRoomId: (body.defaultRoomId as string | null) ?? null,
        defaultRoom: db.rooms.find((r) => r.id === body.defaultRoomId) ?? null,
        workShifts: WEEK_DEFAULT(),
      };
      db.employees.push(row);
      saveDb(db);
      return ok(row, 201);
    }
  }
  if (path.startsWith("/api/employees/") && path.endsWith("/work-shifts") && method === "put") {
    const empId = path.split("/")[3];
    const ownEmployeeId = gated.user!.role === "SPECIALIST" ? gated.user!.employeeId : null;
    if (ownEmployeeId && empId !== ownEmployeeId) return err("Недостаточно прав", 403);
    const emp = db.employees.find((e) => e.id === empId);
    if (!emp) return err("Not found", 404);
    const shifts = Array.isArray(body.shifts) ? body.shifts : [];
    emp.workShifts = shifts.map((s: Record<string, unknown>) => ({
      id: String(s.id ?? newId("shift")),
      weekday: Number(s.weekday),
      startMin: Number(s.startMin),
      endMin: Number(s.endMin),
      lunchStartMin: (s.lunchStartMin as number | null | undefined) ?? null,
      lunchEndMin: (s.lunchEndMin as number | null | undefined) ?? null,
    }));
    saveDb(db);
    return ok(emp);
  }
  if (path.startsWith("/api/employees/")) {
    const empId = path.split("/")[3];
    const ownEmployeeId = gated.user!.role === "SPECIALIST" ? gated.user!.employeeId : null;
    if (ownEmployeeId && empId !== ownEmployeeId) return err("Недостаточно прав", 403);
    if (gated.user!.role === "SPECIALIST" && method !== "get") return err("Недостаточно прав", 403);
    const result = crudCollection(method, db.employees, empId, body, (b) => ({
      id: newId("emp"),
      fullName: String(b.fullName ?? ""),
      shortName: String(b.shortName ?? ""),
      position: (b.position as string | null) ?? null,
      specialtyId: (b.specialtyId as string | null) ?? null,
      specialty: db.specialties.find((s) => s.id === b.specialtyId) ?? null,
      color: String(b.color ?? "#52944d"),
      isActive: true,
      showInCalendar: b.showInCalendar !== false,
      defaultRoomId: (b.defaultRoomId as string | null) ?? null,
      defaultRoom: db.rooms.find((r) => r.id === b.defaultRoomId) ?? null,
      workShifts: WEEK_DEFAULT(),
    }));
    if (method === "patch") {
      const emp = db.employees.find((e) => e.id === empId);
      if (emp) {
        emp.specialty = db.specialties.find((s) => s.id === emp.specialtyId) ?? null;
        emp.defaultRoom = db.rooms.find((r) => r.id === emp.defaultRoomId) ?? null;
        saveDb(db);
        return ok(emp);
      }
    }
    saveDb(db);
    return result;
  }

  if (path === "/api/services" || path.startsWith("/api/services/")) {
    const sid = path === "/api/services" ? undefined : path.split("/")[3];
    if (method === "get" && !sid) return ok(listActive(db.services, params.all));
    const result = crudCollection(method, db.services, sid, body, (b) => ({
      id: newId("svc"),
      name: String(b.name ?? ""),
      durationMin: Number(b.durationMin ?? 30),
      color: String(b.color ?? "#52944d"),
      isGroup: Boolean(b.isGroup),
      isActive: true,
    }));
    saveDb(db);
    return result;
  }

  if (path === "/api/rooms" || path.startsWith("/api/rooms/")) {
    const rid = path === "/api/rooms" ? undefined : path.split("/")[3];
    if (method === "get" && !rid) return ok(listActive(db.rooms, params.all));
    const result = crudCollection(method, db.rooms, rid, body, (b) => ({
      id: newId("room"),
      name: String(b.name ?? ""),
      capacity: Number(b.capacity ?? 1),
      isActive: true,
    }));
    saveDb(db);
    return result;
  }

  if (path === "/api/specialties" || path.startsWith("/api/specialties/")) {
    const sid = path === "/api/specialties" ? undefined : path.split("/")[3];
    if (method === "get" && !sid) return ok(db.specialties.filter((s) => s.isActive));
    const result = crudCollection(method, db.specialties, sid, body, (b) => ({
      id: newId("spec"),
      name: String(b.name ?? ""),
      isActive: true,
    }));
    saveDb(db);
    return result;
  }

  if (path === "/api/clients" || (path.startsWith("/api/clients/") && path.split("/").length === 4 && !path.includes("/card") && !path.includes("/courses") && !path.includes("/analytics") && !path.includes("/schedule") && !path.includes("/history"))) {
    const cid = path === "/api/clients" ? undefined : path.split("/")[3];
    if (method === "get" && !cid) return ok(listActive(db.clients, params.all));
    const result = crudCollection(method, db.clients, cid, body, (b) => ({
      id: newId("cli"),
      fullName: String(b.fullName ?? ""),
      phone: (b.phone as string | null) ?? null,
      note: (b.note as string | null) ?? null,
      birthDate: (b.birthDate as string | null) ?? null,
      ageCategory: (b.ageCategory as "ADULT" | "CHILD" | null) ?? null,
      categories: Array.isArray(b.categories) ? (b.categories as string[]) : [],
      groupId: (b.groupId as string | null) ?? null,
      isPrimary: Boolean(b.isPrimary),
      isActive: true,
    }));
    if (method === "post" || method === "patch" || method === "delete") {
      refreshClientGroupCounts(db);
    }
    saveDb(db);
    return result;
  }

  if (path.endsWith("/card") && method === "get") {
    const cid = path.split("/")[3];
    const client = db.clients.find((c) => c.id === cid);
    if (!client) return err("Not found", 404);
    const courses = db.clientCourses.filter((c) => c.clientId === cid).map(serializeCourse);
    const activeCourse = courses.find((c) => !c.isCompleted) ?? null;
    return ok({ client, courses, activeCourse });
  }

  if (path.endsWith("/history") && method === "get") {
    const cid = path.split("/")[3];
    const client = db.clients.find((c) => c.id === cid);
    if (!client) return err("Not found", 404);
    return ok({
      client,
      appointments: db.appointments
        .filter((a) => a.clientId === cid && a.status !== "CANCELLED")
        .map((a) => enrichAppointment(db, a)),
      courses: db.clientCourses.filter((c) => c.clientId === cid).map(serializeCourse),
    });
  }

  if (path.endsWith("/schedule") && method === "get") {
    const cid = path.split("/")[3];
    const client = db.clients.find((c) => c.id === cid);
    if (!client) return err("Not found", 404);
    const start = params.startDate ?? db.demoDay;
    const end = params.endDate ?? db.demoDay;
    const rows = db.appointments.filter(
      (a) => a.clientId === cid && a.status !== "CANCELLED" && a.date >= start && a.date <= end,
    );
    const entries = rows.map((a) => {
      const enriched = enrichAppointment(db, a);
      return {
        id: a.id,
        date: a.date,
        startMin: a.startMin,
        endMin: a.endMin,
        title: enriched.service.name,
        clientName: enriched.client.fullName,
        specialist: enriched.employee.shortName,
        room: enriched.room?.name,
        kind: "appointment" as const,
        employeeId: a.employeeId,
        serviceId: a.serviceId,
        isGroup: enriched.service.isGroup,
        groupSessionId: a.groupSessionId,
        coStaffSessionId: a.coStaffSessionId,
      };
    });
    const groupClients = client.groupId
      ? db.clients.filter((c) => c.groupId === client.groupId)
      : [client];
    return ok({ client, clients: groupClients, isGroupSchedule: false, entries });
  }

  // Courses
  if (path.match(/^\/api\/clients\/[^/]+\/courses$/) && method === "post") {
    const cid = path.split("/")[3];
    const now = new Date().toISOString();
    const course = {
      id: newId("course"),
      clientId: cid,
      startedAt: String(body.startedAt ?? db.demoDay),
      completedAt: null as string | null,
      isCompleted: false,
      createdAt: now,
      updatedAt: now,
      notes: [] as DemoDb["clientCourses"][number]["notes"],
    };
    db.clientCourses.push(course);
    saveDb(db);
    return ok(serializeCourse(course), 201);
  }

  if (path.match(/^\/api\/clients\/[^/]+\/courses\/[^/]+\/complete$/) && method === "post") {
    const courseId = path.split("/")[5];
    const course = db.clientCourses.find((c) => c.id === courseId);
    if (!course) return err("Not found", 404);
    course.isCompleted = true;
    course.completedAt = String(body.completedAt ?? db.demoDay);
    course.updatedAt = new Date().toISOString();
    saveDb(db);
    return ok(serializeCourse(course));
  }

  if (path.match(/^\/api\/clients\/[^/]+\/courses\/[^/]+\/notes$/) && method === "post") {
    const courseId = path.split("/")[5];
    const course = db.clientCourses.find((c) => c.id === courseId);
    if (!course) return err("Not found", 404);
    const now = new Date().toISOString();
    const note = {
      id: newId("note"),
      courseId,
      body: String(body.body ?? ""),
      createdAt: now,
      updatedAt: now,
      authorUserId: gated.user!.id,
      authorName: gated.user!.employeeName ?? gated.user!.username,
      authorUsername: gated.user!.username,
    };
    course.notes.push(note);
    course.updatedAt = now;
    saveDb(db);
    return ok(note, 201);
  }

  if (path.match(/^\/api\/clients\/[^/]+\/courses\/[^/]+\/notes\/[^/]+$/) && method === "patch") {
    const courseId = path.split("/")[5];
    const noteId = path.split("/")[7];
    const course = db.clientCourses.find((c) => c.id === courseId);
    if (!course) return err("Not found", 404);
    const note = course.notes.find((n) => n.id === noteId);
    if (!note) return err("Not found", 404);
    note.body = String(body.body ?? note.body);
    note.updatedAt = new Date().toISOString();
    course.updatedAt = note.updatedAt;
    saveDb(db);
    return ok(note);
  }

  if (path.match(/^\/api\/clients\/[^/]+\/courses\/[^/]+\/notes\/[^/]+$/) && method === "delete") {
    const courseId = path.split("/")[5];
    const noteId = path.split("/")[7];
    const course = db.clientCourses.find((c) => c.id === courseId);
    if (!course) return err("Not found", 404);
    const before = course.notes.length;
    course.notes = course.notes.filter((n) => n.id !== noteId);
    if (course.notes.length === before) return err("Not found", 404);
    course.updatedAt = new Date().toISOString();
    saveDb(db);
    return ok({ ok: true });
  }

  if (path.match(/^\/api\/clients\/[^/]+\/courses\/[^/]+$/) && method === "patch") {
    const courseId = path.split("/")[5];
    const course = db.clientCourses.find((c) => c.id === courseId);
    if (!course) return err("Not found", 404);
    if (body.startedAt != null) course.startedAt = String(body.startedAt);
    if (body.completedAt !== undefined) {
      course.completedAt = body.completedAt as string | null;
      course.isCompleted = body.completedAt != null;
    }
    course.updatedAt = new Date().toISOString();
    saveDb(db);
    return ok(serializeCourse(course));
  }

  if (path === "/api/client-groups" || path.startsWith("/api/client-groups/")) {
    const gid = path === "/api/client-groups" ? undefined : path.split("/")[3];
    if (method === "get" && !gid) return ok(db.clientGroups);
    const result = crudCollection(method, db.clientGroups, gid, body, (b) => ({
      id: newId("grp"),
      name: String(b.name ?? ""),
      _count: { clients: 0 },
    }));
    saveDb(db);
    return result;
  }

  if (path === "/api/absences" || path.startsWith("/api/absences/")) {
    const aid = path === "/api/absences" ? undefined : path.split("/")[3];

    const absenceConflictsAppointments = (data: {
      employeeId: string;
      startDate: string;
      endDate: string;
      startMin?: number | null;
      endMin?: number | null;
    }) => {
      const allDay = data.startMin == null || data.endMin == null;
      return db.appointments.some((a) => {
        if (a.status === "CANCELLED" || a.employeeId !== data.employeeId) return false;
        if (a.date < data.startDate || a.date > data.endDate) return false;
        if (allDay) return true;
        return a.startMin < data.endMin! && data.startMin! < a.endMin;
      });
    };

    if (method === "get" && !aid) {
      return ok(
        db.absences.map((a) => ({
          ...a,
          employee: db.employees.find((e) => e.id === a.employeeId)
            ? {
                id: a.employeeId,
                shortName: db.employees.find((e) => e.id === a.employeeId)!.shortName,
              }
            : null,
        })),
      );
    }
    if (method === "post") {
      const row = {
        id: newId("abs"),
        employeeId: String(body.employeeId ?? ""),
        type: (body.type as DemoDb["absences"][number]["type"]) ?? "OTHER",
        startDate: String(body.startDate ?? db.demoDay),
        endDate: String(body.endDate ?? body.startDate ?? db.demoDay),
        startMin: (body.startMin as number | null | undefined) ?? null,
        endMin: (body.endMin as number | null | undefined) ?? null,
        note: (body.note as string | null) ?? null,
      };
      if (
        absenceConflictsAppointments({
          employeeId: row.employeeId,
          startDate: row.startDate,
          endDate: row.endDate,
          startMin: row.startMin,
          endMin: row.endMin,
        })
      ) {
        return err(
          "На это время у специалиста уже есть запись. Сначала перенесите или удалите запись.",
          409,
        );
      }
      db.absences.push(row);
      saveDb(db);
      const emp = db.employees.find((e) => e.id === row.employeeId);
      return ok({ ...row, employee: emp ? { id: emp.id, shortName: emp.shortName } : null }, 201);
    }
    if (aid && method === "delete") {
      db.absences = db.absences.filter((a) => a.id !== aid);
      saveDb(db);
      return ok({ ok: true });
    }
    if (aid && method === "patch") {
      const idx = db.absences.findIndex((a) => a.id === aid);
      if (idx < 0) return err("Not found", 404);
      const merged = {
        ...db.absences[idx],
        ...body,
        id: aid,
        employeeId: body.employeeId != null ? String(body.employeeId) : db.absences[idx].employeeId,
        startDate: body.startDate != null ? String(body.startDate) : db.absences[idx].startDate,
        endDate: body.endDate != null ? String(body.endDate) : db.absences[idx].endDate,
        startMin:
          body.startMin !== undefined
            ? (body.startMin as number | null)
            : db.absences[idx].startMin ?? null,
        endMin:
          body.endMin !== undefined ? (body.endMin as number | null) : db.absences[idx].endMin ?? null,
      };
      if (
        absenceConflictsAppointments({
          employeeId: merged.employeeId,
          startDate: merged.startDate,
          endDate: merged.endDate,
          startMin: merged.startMin,
          endMin: merged.endMin,
        })
      ) {
        return err(
          "На это время у специалиста уже есть запись. Сначала перенесите или удалите запись.",
          409,
        );
      }
      db.absences[idx] = merged as DemoDb["absences"][number];
      saveDb(db);
      const emp = db.employees.find((e) => e.id === db.absences[idx].employeeId);
      return ok({
        ...db.absences[idx],
        employee: emp ? { id: emp.id, shortName: emp.shortName } : null,
      });
    }
  }

  if (path === "/api/appointments" && method === "get") {
    const date = params.date;
    if (!date) return err("query ?date=YYYY-MM-DD required");
    const ownEmployeeId = gated.user!.role === "SPECIALIST" ? gated.user!.employeeId : null;
    const rows = db.appointments
      .filter(
        (a) =>
          a.date === date &&
          a.status !== "CANCELLED" &&
          (!ownEmployeeId || a.employeeId === ownEmployeeId),
      )
      .map((a) => enrichAppointment(db, a))
      .sort((a, b) => a.employeeId.localeCompare(b.employeeId) || a.startMin - b.startMin);
    return ok(rows);
  }

  if (path === "/api/appointments" && method === "post") {
    const service = db.services.find((s) => s.id === body.serviceId && s.isActive);
    if (!service) return err("service not found", 404);
    const startMin = Number(body.startMin ?? 540);
    const date = String(body.date ?? "");
    const clientIds = [
      ...new Set(
        Array.isArray(body.clientIds)
          ? (body.clientIds as string[])
          : body.clientId
            ? [String(body.clientId)]
            : [],
      ),
    ];
    const employeeIds = [
      ...new Set(
        Array.isArray(body.employeeIds)
          ? (body.employeeIds as string[])
          : body.employeeId
            ? [String(body.employeeId)]
            : [],
      ),
    ];
    const roomId = (body.roomId as string | null | undefined) ?? null;
    const note = String(body.note ?? "");
    const joinGroupSessionId = body.groupSessionId ? String(body.groupSessionId) : null;
    const endMin = startMin + service.durationMin;
    const interval = { startMin, endMin };

    if (!date) return err("date required");
    if (!isSlotAligned(startMin)) return err("startMin должно быть кратно 15 минутам");
    if (!clientIds.length || !employeeIds.length) return err("Нужны клиент и специалист");

    // Присоединение к существующей группе
    if (service.isGroup && joinGroupSessionId) {
      if (clientIds.length !== 1) return err("В группу добавляется один клиент за раз");
      const members = db.appointments.filter(
        (a) => a.groupSessionId === joinGroupSessionId && a.status !== "CANCELLED",
      );
      const staffEmployeeIds = [...new Set(members.map((m) => m.employeeId))];
      const joinClientId = clientIds[0]!;
      const joinError = validateJoinGroupSession(members, {
        date,
        startMin,
        endMin,
        employeeId: employeeIds[0]!,
        serviceId: service.id,
        clientId: joinClientId,
      });
      if (joinError) return err(joinError, 409);
      const age = resolveGroupAgeRange(db, members, [joinClientId], date);
      if (age.error) return err(age.error, age.error === "client not found" ? 404 : 409);

      if (
        clientHasBookingOverlap(db, joinClientId, date, interval, {
          excludeCoStaffSessionId: members[0]?.coStaffSessionId ?? undefined,
        })
      ) {
        return err("У клиента уже есть запись в это время", 409);
      }

      const sharedRoomId = members[0]?.roomId ?? roomId;
      const sharedCoStaff = members[0]?.coStaffSessionId ?? null;
      const created = [];
      for (const nextEmployeeId of staffEmployeeIds) {
        const row = {
          id: newId("apt"),
          date,
          startMin,
          endMin,
          status: "PLANNED" as const,
          clientNoShow: false,
          note,
          groupSessionId: joinGroupSessionId,
          groupAgeRange: age.range,
          coStaffSessionId: sharedCoStaff,
          diagnosticPeriodId: null as string | null,
          clientId: joinClientId,
          employeeId: nextEmployeeId,
          serviceId: service.id,
          roomId: sharedRoomId,
        };
        db.appointments.push(row);
        created.push(enrichAppointment(db, row));
      }
      saveDb(db);
      return ok(created[0] ?? null, 201);
    }

    const writeError = validateAppointmentWrite(db, {
      date,
      startMin,
      endMin,
      clientIds,
      employeeIds,
      serviceId: service.id,
      roomId,
    });
    if (writeError) {
      const status =
        writeError === "service not found" || writeError === "client not found"
          ? 404
          : writeError.includes("кратно") || writeError.includes("Нужны") || writeError.includes("допускает")
            ? 400
            : 409;
      return err(writeError, status);
    }

    const nextGroupAgeRange = service.isGroup
      ? groupAgeRangeFromBirthDate(db.clients.find((c) => c.id === clientIds[0])?.birthDate, date)
      : null;
    const groupSessionId = service.isGroup ? newId("gs") : null;
    const coStaffSessionId = employeeIds.length > 1 ? newId("cs") : null;
    const created = [];
    for (const clientId of clientIds) {
      for (const employeeId of employeeIds) {
        const row = {
          id: newId("apt"),
          date,
          startMin,
          endMin,
          status: "PLANNED" as const,
          clientNoShow: false,
          note,
          groupSessionId,
          groupAgeRange: nextGroupAgeRange,
          coStaffSessionId,
          diagnosticPeriodId: null as string | null,
          clientId,
          employeeId,
          serviceId: service.id,
          roomId,
        };
        db.appointments.push(row);
        created.push(enrichAppointment(db, row));
      }
    }
    saveDb(db);
    return ok(created.length === 1 ? created[0] : created, 201);
  }

  if (path.startsWith("/api/appointments/group/") && method === "get") {
    const gid = path.split("/")[4];
    const rows = db.appointments
      .filter((a) => a.groupSessionId === gid && a.status !== "CANCELLED")
      .map((a) => enrichAppointment(db, a));
    return ok(rows);
  }

  if (path.startsWith("/api/appointments/co-staff/") && method === "get") {
    const cid = path.split("/")[4];
    const rows = db.appointments
      .filter((a) => a.coStaffSessionId === cid && a.status !== "CANCELLED")
      .map((a) => enrichAppointment(db, a));
    return ok(rows);
  }

  if (path.startsWith("/api/appointments/") && path.split("/").length === 4) {
    const aptId = path.split("/")[3];
    const idx = db.appointments.findIndex((a) => a.id === aptId);
    if (idx < 0) return err("Not found", 404);
    if (method === "patch") {
      const prev = db.appointments[idx];

      // Диагностика: только клиент / явка / заметка
      if (prev.diagnosticPeriodId) {
        const keys = Object.keys(body).filter((key) => body[key] !== undefined);
        const allowed = new Set(["clientId", "clientNoShow", "note"]);
        if (keys.some((key) => !allowed.has(key))) {
          return err("Запись диагностики нельзя переносить. Меняйте клиента или явку.", 409);
        }
        const slotSiblings = db.appointments.filter(
          (a) =>
            a.diagnosticPeriodId === prev.diagnosticPeriodId &&
            a.date === prev.date &&
            a.startMin === prev.startMin &&
            a.status !== "CANCELLED",
        );
        if (body.clientId != null) {
          const nextClientId = String(body.clientId);
          if (
            clientHasBookingOverlap(db, nextClientId, prev.date, {
              startMin: prev.startMin,
              endMin: prev.endMin,
            }, { excludeAppointmentIds: slotSiblings.map((a) => a.id) })
          ) {
            return err("У клиента уже есть запись в это время", 409);
          }
          for (const sibling of slotSiblings) {
            sibling.clientId = nextClientId;
            if (body.note !== undefined) sibling.note = String(body.note ?? "");
          }
        } else if (body.note !== undefined) {
          for (const sibling of slotSiblings) sibling.note = String(body.note ?? "");
        }
        if (body.clientNoShow != null) {
          db.appointments[idx].clientNoShow = Boolean(body.clientNoShow);
        }
        saveDb(db);
        return ok(enrichAppointment(db, db.appointments[idx]));
      }

      const serviceId = body.serviceId != null ? String(body.serviceId) : prev.serviceId;
      const service = db.services.find((s) => s.id === serviceId);
      if (!service) return err("service not found", 404);
      const startMin = body.startMin != null ? Number(body.startMin) : prev.startMin;
      const date = body.date != null ? String(body.date) : prev.date;
      const endMin =
        body.endMin != null
          ? Number(body.endMin)
          : body.startMin != null
            ? startMin + service.durationMin
            : prev.endMin;
      const clientId = body.clientId != null ? String(body.clientId) : prev.clientId;
      const employeeId = body.employeeId != null ? String(body.employeeId) : prev.employeeId;
      const roomId = body.roomId !== undefined ? (body.roomId as string | null) : prev.roomId;
      const movingSlot =
        body.startMin !== undefined ||
        body.employeeId !== undefined ||
        body.serviceId !== undefined ||
        body.date !== undefined;

      if (!isSlotAligned(startMin)) return err("startMin должно быть кратно 15 минутам");

      // Перенос группового занятия целиком
      if (prev.groupSessionId && movingSlot) {
        if (body.serviceId !== undefined) {
          return err("Для группового занятия нельзя менять услугу при переносе", 409);
        }
        const members = db.appointments.filter(
          (a) => a.groupSessionId === prev.groupSessionId && a.status !== "CANCELLED",
        );
        const memberIds = members.map((m) => m.id);
        const clientIds = [...new Set(members.map((m) => m.clientId))];
        const writeError = validateAppointmentWrite(db, {
          date,
          startMin,
          endMin,
          clientIds,
          employeeIds: [employeeId],
          serviceId: prev.serviceId,
          roomId: members[0]?.roomId ?? roomId,
          groupSessionId: prev.groupSessionId,
          movingExistingGroup: true,
          excludeAppointmentIds: memberIds,
        });
        if (writeError) return err(writeError, 409);
        for (const member of members) {
          member.date = date;
          member.startMin = startMin;
          member.endMin = endMin;
          member.employeeId = employeeId;
        }
        saveDb(db);
        return ok(enrichAppointment(db, db.appointments[idx]));
      }

      const excludeIds = prev.coStaffSessionId
        ? db.appointments.filter((a) => a.coStaffSessionId === prev.coStaffSessionId).map((a) => a.id)
        : prev.groupSessionId
          ? db.appointments.filter((a) => a.groupSessionId === prev.groupSessionId).map((a) => a.id)
          : [aptId];

      const writeError = validateAppointmentWrite(db, {
        date,
        startMin,
        endMin,
        clientIds: [clientId],
        employeeIds: [employeeId],
        serviceId,
        roomId,
        groupSessionId: null,
        excludeAppointmentIds: excludeIds,
        excludeCoStaffSessionId: prev.coStaffSessionId ?? undefined,
      });
      if (writeError) {
        const status = writeError.includes("кратно") || writeError.includes("Нужны") ? 400 : 409;
        return err(writeError, status);
      }

      // Не размазывать сырой body (employeeIds и т.п.) по строке
      db.appointments[idx] = {
        ...prev,
        id: aptId,
        startMin,
        endMin,
        date,
        clientId,
        employeeId,
        serviceId,
        roomId,
        status: body.status != null ? (body.status as typeof prev.status) : prev.status,
        note: body.note != null ? String(body.note) : prev.note,
        clientNoShow: body.clientNoShow != null ? Boolean(body.clientNoShow) : prev.clientNoShow,
      };

      if (prev.coStaffSessionId && (body.startMin != null || body.date != null || body.roomId !== undefined)) {
        for (const sibling of db.appointments) {
          if (sibling.id === aptId) continue;
          if (sibling.coStaffSessionId !== prev.coStaffSessionId || sibling.status === "CANCELLED") continue;
          sibling.date = date;
          sibling.startMin = startMin;
          sibling.endMin = endMin;
          if (body.roomId !== undefined) sibling.roomId = roomId;
          if (body.serviceId != null) sibling.serviceId = serviceId;
        }
      }

      saveDb(db);
      return ok(enrichAppointment(db, db.appointments[idx]));
    }
    if (method === "delete") {
      db.appointments[idx].status = "CANCELLED";
      saveDb(db);
      return ok({ ok: true });
    }
  }

  if (path === "/api/availability/load" && method === "get") {
    const date = params.date;
    const byEmp = new Map<string, number>();
    for (const a of db.appointments) {
      if (a.date !== date || a.status === "CANCELLED") continue;
      byEmp.set(a.employeeId, (byEmp.get(a.employeeId) ?? 0) + (a.endMin - a.startMin) / 60);
    }
    return ok(
      db.employees
        .filter((e) => e.isActive && e.showInCalendar !== false)
        .map((e) => ({
          employeeId: e.id,
          shortName: e.shortName,
          hours: Math.round((byEmp.get(e.id) ?? 0) * 100) / 100,
        })),
    );
  }

  if (path === "/api/availability/analytics" && method === "get") {
    const startDate = params.startDate ?? db.demoDay;
    const endDate = params.endDate ?? db.demoDay;
    if (endDate < startDate) return err("endDate must be after startDate");

    const days: string[] = [];
    {
      let cur = parseISO(startDate);
      const last = parseISO(endDate);
      while (cur <= last) {
        days.push(format(cur, "yyyy-MM-dd"));
        cur = addDays(cur, 1);
      }
    }
    if (days.length > 93) return err("Период не должен быть больше 93 дней");

    const employeeFilter = params.employeeId;
    const employees = db.employees.filter((e) => !employeeFilter || e.id === employeeFilter);

    const totalLoadMin = (intervals: Interval[]) =>
      intervals.reduce((sum, i) => sum + Math.max(0, i.endMin - i.startMin), 0);

    const items = employees.map((employee) => {
      let workMinutes = 0;
      let availableMinutes = 0;
      let appointmentMinutes = 0;
      let diagnosticMinutes = 0;
      let absenceMinutes = 0;
      let overloadDays = 0;
      let workDays = 0;
      let freeMinutesTotal = 0;
      const daysList: Array<{
        date: string;
        workMinutes: number;
        busyMinutes: number;
        freeMinutes: number;
        utilization: number;
        overload: boolean;
      }> = [];

      for (const date of days) {
        const weekday = getISODay(parseISO(date));
        const shift = employee.workShifts?.find((s) => s.weekday === weekday);
        if (!shift) {
          daysList.push({ date, workMinutes: 0, busyMinutes: 0, freeMinutes: 0, utilization: 0, overload: false });
          continue;
        }

        workDays += 1;
        const shiftInterval = { startMin: shift.startMin, endMin: shift.endMin };
        const lunch: Interval[] =
          shift.lunchStartMin != null && shift.lunchEndMin != null
            ? [{ startMin: shift.lunchStartMin, endMin: shift.lunchEndMin }]
            : [];

        const dayAppointments = db.appointments.filter(
          (a) => a.employeeId === employee.id && a.date === date && a.status !== "CANCELLED",
        );
        const appointmentIntervals = dayAppointments.map((a) => ({
          startMin: a.startMin,
          endMin: a.endMin,
        }));

        const diagnosticIntervals: Interval[] = [];
        for (const period of db.diagnosticPeriods) {
          if (date < period.startDate || date > period.endDate) continue;
          if (!period.participantIds.includes(employee.id)) continue;
          for (const interval of period.intervals) {
            if (interval.date !== date) continue;
            diagnosticIntervals.push({
              startMin: interval.startMin,
              endMin: interval.startMin + period.durationMin,
            });
          }
        }

        const absenceIntervals = db.absences
          .filter((a) => a.employeeId === employee.id && a.startDate <= date && a.endDate >= date)
          .map((a) => ({
            startMin: a.startMin ?? shift.startMin,
            endMin: a.endMin ?? shift.endMin,
          }));

        const clippedAbsences = mergeIntervals(
          absenceIntervals
            .map((i) => ({
              startMin: Math.max(i.startMin, shift.startMin),
              endMin: Math.min(i.endMin, shift.endMin),
            }))
            .filter((i) => i.endMin > i.startMin),
        );

        const dayWorkMinutes = shift.endMin - shift.startMin - totalLoadMin(lunch);
        const dayAppointmentMinutes = totalLoadMin(appointmentIntervals);
        const dayDiagnosticMinutes = totalLoadMin(diagnosticIntervals);
        const dayAbsenceMinutes = totalLoadMin(clippedAbsences);
        const busy = [...appointmentIntervals, ...diagnosticIntervals, ...absenceIntervals, ...lunch];
        const free = freeGapsInShift(shiftInterval, busy);
        const dayFreeMinutes = totalLoadMin(free);
        const dayAvailableMinutes = Math.max(0, dayWorkMinutes - dayAbsenceMinutes);
        const dayBusyMinutes = dayAppointmentMinutes + dayDiagnosticMinutes;
        const utilization =
          dayAvailableMinutes > 0 ? Math.round((dayBusyMinutes / dayAvailableMinutes) * 100) : 0;
        const overload = dayAvailableMinutes > 0 && utilization >= 85;

        workMinutes += dayWorkMinutes;
        availableMinutes += dayAvailableMinutes;
        appointmentMinutes += dayAppointmentMinutes;
        diagnosticMinutes += dayDiagnosticMinutes;
        absenceMinutes += dayAbsenceMinutes;
        freeMinutesTotal += dayFreeMinutes;
        if (overload) overloadDays += 1;
        daysList.push({
          date,
          workMinutes: dayWorkMinutes,
          busyMinutes: dayBusyMinutes,
          freeMinutes: dayFreeMinutes,
          utilization,
          overload,
        });
      }

      const busyMinutes = appointmentMinutes + diagnosticMinutes;
      const utilization =
        availableMinutes > 0 ? Math.round((busyMinutes / availableMinutes) * 100) : 0;
      const avgBusyMinutesPerWorkDay = workDays > 0 ? Math.round(busyMinutes / workDays) : 0;

      return {
        employeeId: employee.id,
        shortName: employee.shortName,
        fullName: employee.fullName,
        position: employee.position,
        color: employee.color,
        workDays,
        workMinutes,
        availableMinutes,
        busyMinutes,
        appointmentMinutes,
        diagnosticMinutes,
        absenceMinutes,
        freeMinutes: freeMinutesTotal,
        overloadDays,
        utilization,
        avgBusyMinutesPerWorkDay,
        avgBusyMinutesPerMonth: avgBusyMinutesPerWorkDay * workDays,
        days: daysList,
      };
    });

    const totals = items.reduce(
      (acc, item) => ({
        workMinutes: acc.workMinutes + item.workMinutes,
        availableMinutes: acc.availableMinutes + item.availableMinutes,
        busyMinutes: acc.busyMinutes + item.busyMinutes,
        freeMinutes: acc.freeMinutes + item.freeMinutes,
        overloadDays: acc.overloadDays + item.overloadDays,
        workDays: acc.workDays + item.workDays,
      }),
      { workMinutes: 0, availableMinutes: 0, busyMinutes: 0, freeMinutes: 0, overloadDays: 0, workDays: 0 },
    );

    return ok({
      startDate,
      endDate,
      days: days.length,
      totals: {
        ...totals,
        utilization:
          totals.availableMinutes > 0
            ? Math.round((totals.busyMinutes / totals.availableMinutes) * 100)
            : 0,
        avgBusyMinutesPerWorkDay:
          totals.workDays > 0 ? Math.round(totals.busyMinutes / totals.workDays) : 0,
        avgBusyMinutesPerMonth:
          items.length > 0
            ? Math.round(
                items.reduce((sum, item) => sum + item.avgBusyMinutesPerMonth, 0) / items.length,
              )
            : 0,
      },
      items,
    });
  }

  if (path === "/api/clients/analytics" && method === "get") {
    const startDate = params.startDate ?? db.demoDay;
    const endDate = params.endDate ?? db.demoDay;
    if (endDate < startDate) return err("Дата окончания раньше даты начала");

    const daysCount = (() => {
      let n = 0;
      let cur = parseISO(startDate);
      const last = parseISO(endDate);
      while (cur <= last) {
        n += 1;
        cur = addDays(cur, 1);
      }
      return n;
    })();
    if (daysCount > 93) return err("Период не должен быть больше 93 дней");

    let clients = db.clients.filter((c) => c.isActive);
    if (params.clientId) clients = clients.filter((c) => c.id === params.clientId);
    if (params.ageCategory) clients = clients.filter((c) => c.ageCategory === params.ageCategory);

    if (!clients.length) {
      return ok({
        startDate,
        endDate,
        days: daysCount,
        totals: {
          activeClients: 0,
          clientsWithVisits: 0,
          clientsWithoutVisits: 0,
          primaryClients: 0,
          returningClients: 0,
          appointmentCount: 0,
          visitCount: 0,
          visitMinutes: 0,
          noShowCount: 0,
        },
        byAge: { ADULT: 0, CHILD: 0, unset: 0 },
        byCategory: {
          DISABILITY_1: 0,
          DISABILITY_2: 0,
          DISABILITY_3: 0,
          CHILD_DISABILITY: 0,
          OJD: 0,
          OVZ: 0,
        },
        byMonth: [],
        items: [],
      });
    }

    const clientIds = new Set(clients.map((c) => c.id));
    const appointments = db.appointments.filter(
      (a) =>
        clientIds.has(a.clientId) &&
        a.status !== "CANCELLED" &&
        a.date >= startDate &&
        a.date <= endDate,
    );

    const firstVisitByClient = new Map<string, string>();
    for (const a of db.appointments) {
      if (a.status === "CANCELLED" || a.clientNoShow || !clientIds.has(a.clientId)) continue;
      const prev = firstVisitByClient.get(a.clientId);
      if (!prev || a.date < prev) firstVisitByClient.set(a.clientId, a.date);
    }

    type ServiceStat = { serviceId: string; name: string; count: number; minutes: number };
    const stats = new Map<
      string,
      {
        appointmentCount: number;
        visitMinutes: number;
        noShowCount: number;
        lastVisitDate: string | null;
        visitMonths: Set<string>;
        services: Map<string, ServiceStat>;
      }
    >();
    for (const client of clients) {
      stats.set(client.id, {
        appointmentCount: 0,
        visitMinutes: 0,
        noShowCount: 0,
        lastVisitDate: null,
        visitMonths: new Set(),
        services: new Map(),
      });
    }

    for (const appointment of appointments) {
      const item = stats.get(appointment.clientId);
      if (!item) continue;
      const minutes = Math.max(0, appointment.endMin - appointment.startMin);
      item.appointmentCount += 1;
      if (appointment.clientNoShow) {
        item.noShowCount += 1;
        continue;
      }
      if (!item.lastVisitDate || appointment.date > item.lastVisitDate) {
        item.lastVisitDate = appointment.date;
      }
      item.visitMinutes += minutes;
      item.visitMonths.add(appointment.date.slice(0, 7));
      const service = db.services.find((s) => s.id === appointment.serviceId);
      const serviceStat = item.services.get(appointment.serviceId) ?? {
        serviceId: appointment.serviceId,
        name: service?.name ?? "—",
        count: 0,
        minutes: 0,
      };
      serviceStat.count += 1;
      serviceStat.minutes += minutes;
      item.services.set(appointment.serviceId, serviceStat);
    }

    const byAge = { ADULT: 0, CHILD: 0, unset: 0 };
    const byCategory = {
      DISABILITY_1: 0,
      DISABILITY_2: 0,
      DISABILITY_3: 0,
      CHILD_DISABILITY: 0,
      OJD: 0,
      OVZ: 0,
    };
    for (const client of clients) {
      if (client.ageCategory === "ADULT") byAge.ADULT += 1;
      else if (client.ageCategory === "CHILD") byAge.CHILD += 1;
      else byAge.unset += 1;
      for (const category of client.categories ?? []) {
        if (category in byCategory) {
          byCategory[category as keyof typeof byCategory] += 1;
        }
      }
    }

    const groupName = (client: (typeof clients)[number]) =>
      client.groupId ? (db.clientGroups.find((g) => g.id === client.groupId)?.name ?? null) : null;

    const items = clients
      .map((client) => {
        const item = stats.get(client.id)!;
        const visitCount = item.appointmentCount - item.noShowCount;
        const activeInPeriod = visitCount > 0;
        const firstVisitDate = firstVisitByClient.get(client.id) ?? null;
        let visitKind: "primary" | "returning" | null = null;
        if (activeInPeriod) {
          if (!client.isPrimary) visitKind = "returning";
          else if (!firstVisitDate) visitKind = "primary";
          else if (firstVisitDate >= startDate && firstVisitDate <= endDate) visitKind = "primary";
          else if (firstVisitDate < startDate) visitKind = "returning";
        }
        const topServices = [...item.services.values()].sort(
          (a, b) => b.count - a.count || b.minutes - a.minutes,
        );
        return {
          clientId: client.id,
          fullName: client.fullName,
          ageCategory: client.ageCategory,
          categories: client.categories ?? [],
          groupName: groupName(client),
          isPrimary: client.isPrimary,
          appointmentCount: item.appointmentCount,
          visitCount,
          visitMinutes: item.visitMinutes,
          noShowCount: item.noShowCount,
          lastVisitDate: item.lastVisitDate,
          firstVisitDate,
          visitKind,
          topService: topServices[0]?.name ?? null,
          activeInPeriod,
          visitMonths: [...item.visitMonths],
        };
      })
      .sort(
        (a, b) =>
          b.visitCount - a.visitCount ||
          b.visitMinutes - a.visitMinutes ||
          a.fullName.localeCompare(b.fullName, "ru"),
      );

    const totals = items.reduce(
      (acc, item) => {
        acc.appointmentCount += item.appointmentCount;
        acc.visitCount += item.visitCount;
        acc.visitMinutes += item.visitMinutes;
        acc.noShowCount += item.noShowCount;
        if (item.activeInPeriod) acc.clientsWithVisits += 1;
        if (item.visitKind === "primary") acc.primaryClients += 1;
        if (item.visitKind === "returning") acc.returningClients += 1;
        return acc;
      },
      {
        activeClients: clients.length,
        clientsWithVisits: 0,
        clientsWithoutVisits: 0,
        primaryClients: 0,
        returningClients: 0,
        appointmentCount: 0,
        visitCount: 0,
        visitMinutes: 0,
        noShowCount: 0,
      },
    );
    totals.clientsWithoutVisits = totals.activeClients - totals.clientsWithVisits;

    const monthKeys: string[] = [];
    {
      let [year, month] = startDate.slice(0, 7).split("-").map(Number);
      const endKey = endDate.slice(0, 7);
      for (;;) {
        const key = `${year}-${String(month).padStart(2, "0")}`;
        monthKeys.push(key);
        if (key >= endKey) break;
        month! += 1;
        if (month! > 12) {
          month = 1;
          year! += 1;
        }
      }
    }

    const visitsByMonth = new Map<string, number>();
    for (const appointment of appointments) {
      if (appointment.clientNoShow) continue;
      const key = appointment.date.slice(0, 7);
      visitsByMonth.set(key, (visitsByMonth.get(key) ?? 0) + 1);
    }

    const byMonth = monthKeys.map((month) => {
      let uniqueClients = 0;
      let primaryClients = 0;
      let returningClients = 0;
      for (const item of items) {
        if (!item.visitMonths.includes(month)) continue;
        uniqueClients += 1;
        if (!item.isPrimary) {
          returningClients += 1;
          continue;
        }
        const firstMonth = item.firstVisitDate?.slice(0, 7);
        if (firstMonth === month) primaryClients += 1;
        else if (firstMonth && firstMonth < month) returningClients += 1;
      }
      return {
        month,
        uniqueClients,
        primaryClients,
        returningClients,
        visitCount: visitsByMonth.get(month) ?? 0,
      };
    });

    return ok({
      startDate,
      endDate,
      days: daysCount,
      totals,
      byAge,
      byCategory,
      byMonth,
      items: items.map(({ visitMonths: _vm, ...item }) => item),
    });
  }

  if (path === "/api/availability" && method === "get") {
    const date = params.date;
    const employeeId = params.employeeId;
    const serviceId = params.serviceId;
    if (!date || !employeeId || !serviceId) {
      return err("query ?date=&employeeId=&serviceId= required");
    }
    const service = db.services.find((s) => s.id === serviceId);
    if (!service) return err("service not found", 404);
    const { shift, busy, error } = employeeBusyForDate(db, employeeId, date);
    if (error) return err(error, 404);
    if (!shift) return ok({ free: [], reason: "нет рабочей смены в этот день" });
    // lunch уже в busy — в freeWindows передаём смену без lunch*, чтобы не задвоить
    const windows = freeWindows(
      { startMin: shift.startMin, endMin: shift.endMin },
      busy,
      service.durationMin,
    );
    return ok({
      free: windows.map((w) => ({
        ...w,
        label: `${minToTime(w.startMin)}–${minToTime(w.endMin)}`,
      })),
    });
  }

  if (path === "/api/settings/clinic-work-days") {
    if (method === "get") return ok(db.clinicWorkDays);
    if (method === "put") {
      const days = Array.isArray(body.days) ? body.days : [];
      db.clinicWorkDays = days.map((d: Record<string, unknown>, i: number) => ({
        id: String(d.id ?? db.clinicWorkDays[i]?.id ?? newId("cwd")),
        weekday: Number(d.weekday),
        isOpen: Boolean(d.isOpen),
        startMin: Number(d.startMin),
        endMin: Number(d.endMin),
      }));
      saveDb(db);
      return ok(db.clinicWorkDays);
    }
  }

  if (path === "/api/settings/features" && method === "get") {
    return ok(db.features);
  }

  // Diagnostics
  if (path === "/api/diagnostic-periods" && method === "get") {
    const date = params.date;
    return ok(db.diagnosticPeriods.map((p) => enrichDiagnostic(db, p, date)));
  }

  if (path === "/api/diagnostic-periods/participant-status" && method === "get") {
    const startDate = params.startDate;
    const endDate = params.endDate;
    if (!startDate || !endDate) {
      return err("query ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD required");
    }
    if (endDate < startDate) return err("Дата окончания раньше даты начала");
    const excludePeriodId = params.excludePeriodId;

    const days: string[] = [];
    {
      let cur = parseISO(startDate);
      const last = parseISO(endDate);
      while (cur <= last) {
        days.push(format(cur, "yyyy-MM-dd"));
        cur = addDays(cur, 1);
      }
    }
    if (days.length > 93) return err("Период не должен быть больше 93 дней");

    const periods = db.diagnosticPeriods.filter(
      (p) =>
        p.id !== excludePeriodId &&
        p.startDate <= endDate &&
        p.endDate >= startDate,
    );

    return ok(
      db.employees
        .filter((e) => e.isActive)
        .map((employee) => {
          for (const day of days) {
            const period = periods.find(
              (item) =>
                item.startDate <= day &&
                item.endDate >= day &&
                item.participantIds.includes(employee.id),
            );
            if (period) {
              const formattedDay = day.split("-").reverse().join(".");
              return {
                employeeId: employee.id,
                shortName: employee.shortName,
                available: false,
                shortLabel: "диагностика",
                detail: `${formattedDay} — другой период`,
              };
            }
          }
          return {
            employeeId: employee.id,
            shortName: employee.shortName,
            available: true,
            shortLabel: "свободен",
          };
        }),
    );
  }

  if (path === "/api/diagnostic-periods" && method === "post") {
    const period = {
      id: newId("diag"),
      title: String(body.title ?? "Диагностика"),
      startDate: String(body.startDate ?? db.demoDay),
      endDate: String(body.endDate ?? body.startDate ?? db.demoDay),
      note: (body.note as string | null) ?? null,
      roomId: String(body.roomId ?? db.rooms[0]?.id ?? ""),
      durationMin: Number(body.durationMin ?? 30),
      participantIds: Array.isArray(body.participantIds)
        ? (body.participantIds as string[])
        : Array.isArray(body.employeeIds)
          ? (body.employeeIds as string[])
          : [],
      intervals: [] as Array<{ id: string; date: string; startMin: number }>,
    };
    db.diagnosticPeriods.push(period);
    saveDb(db);
    return ok(enrichDiagnostic(db, period), 201);
  }

  if (path.match(/^\/api\/diagnostic-periods\/[^/]+\/intervals$/) && method === "post") {
    const pid = path.split("/")[3];
    const period = db.diagnosticPeriods.find((p) => p.id === pid);
    if (!period) return err("Not found", 404);
    const date = String(body.date ?? db.demoDay);
    const startMin = Number(body.startMin ?? 540);
    if (!isSlotAligned(startMin)) return err("startMin должно быть кратно 15 минутам");
    if (date < period.startDate || date > period.endDate) {
      return err("Дата вне периода диагностики");
    }
    const options = diagnosticIntervalStartOptions(db, period, date);
    const option = options.find((item) => item.startMin === startMin);
    if (!option) return err("Интервал вне рабочего окна комиссии");
    if (!option.available) {
      if (option.shortLabel === "обед") return err("Интервал пересекается с обедом");
      if (option.shortLabel === "запись") return err("Специалист занят записью в это время");
      if (option.shortLabel === "кабинет") return err("Кабинет занят в это время");
      if (option.shortLabel === "отсутствие") return err("Специалист отсутствует в это время");
      if (option.shortLabel === "в списке" || option.shortLabel === "пересекает слот") {
        return err("Этот интервал уже добавлен в список дня");
      }
      return err("Интервал недоступен");
    }
    const interval = {
      id: newId("dint"),
      date,
      startMin,
    };
    period.intervals.push(interval);
    saveDb(db);
    return ok(interval, 201);
  }

  if (path.match(/^\/api\/diagnostic-periods\/[^/]+\/intervals$/) && method === "delete") {
    const pid = path.split("/")[3];
    const period = db.diagnosticPeriods.find((p) => p.id === pid);
    if (!period) return err("Not found", 404);
    const date = params.date;
    const startMin = Number(params.startMin);
    if (!date || Number.isNaN(startMin)) return err("query ?date=&startMin= required");
    const before = period.intervals.length;
    period.intervals = period.intervals.filter((i) => !(i.date === date && i.startMin === startMin));
    if (period.intervals.length === before) return err("not found", 404);
    saveDb(db);
    return ok({ ok: true });
  }

  if (path.match(/^\/api\/diagnostic-periods\/[^/]+\/intervals\/copy$/) && method === "post") {
    const pid = path.split("/")[3];
    const period = db.diagnosticPeriods.find((p) => p.id === pid);
    if (!period) return err("Not found", 404);
    const sourceDate = String(body.date ?? "");
    if (!sourceDate) return err("date required");
    if (sourceDate < period.startDate || sourceDate > period.endDate) {
      return err("Дата вне периода диагностики");
    }
    const sourceIntervals = period.intervals
      .filter((i) => i.date === sourceDate)
      .sort((a, b) => a.startMin - b.startMin);
    if (!sourceIntervals.length) {
      return err("В выбранном дне нет интервалов для копирования", 409);
    }

    const targetDays: string[] = [];
    {
      let cur = parseISO(period.startDate);
      const last = parseISO(period.endDate);
      while (cur <= last) {
        const key = format(cur, "yyyy-MM-dd");
        const weekday = getISODay(cur);
        if (key !== sourceDate && weekday >= 1 && weekday <= 4) targetDays.push(key);
        cur = addDays(cur, 1);
      }
    }

    let created = 0;
    let skipped = 0;
    const daysTouched = new Set<string>();
    for (const day of targetDays) {
      for (const source of sourceIntervals) {
        const exists = period.intervals.some((i) => i.date === day && i.startMin === source.startMin);
        if (exists) {
          skipped += 1;
          continue;
        }
        const endMin = source.startMin + period.durationMin;
        const staffBusy = period.participantIds.some((employeeId) => {
          const emp = db.employees.find((e) => e.id === employeeId);
          if (!emp) return true;
          const weekday = getISODay(parseISO(day));
          const shift = emp.workShifts?.find((s) => s.weekday === weekday);
          if (!shift) return true;
          if (source.startMin < shift.startMin || endMin > shift.endMin) return true;
          if (
            shift.lunchStartMin != null &&
            shift.lunchEndMin != null &&
            source.startMin < shift.lunchEndMin &&
            shift.lunchStartMin < endMin
          ) {
            return true;
          }
          const aptBusy = db.appointments.some(
            (a) =>
              a.status !== "CANCELLED" &&
              a.employeeId === employeeId &&
              a.date === day &&
              source.startMin < a.endMin &&
              a.startMin < endMin,
          );
          if (aptBusy) return true;
          return db.absences.some((a) => {
            if (a.employeeId !== employeeId || a.startDate > day || a.endDate < day) return false;
            const aStart = a.startMin ?? shift.startMin;
            const aEnd = a.endMin ?? shift.endMin;
            return source.startMin < aEnd && aStart < endMin;
          });
        });
        if (staffBusy) {
          skipped += 1;
          continue;
        }
        period.intervals.push({
          id: newId("dint"),
          date: day,
          startMin: source.startMin,
        });
        created += 1;
        daysTouched.add(day);
      }
    }
    saveDb(db);
    return ok({
      sourceDate,
      targetDays: targetDays.length,
      daysUpdated: daysTouched.size,
      created,
      skipped,
    });
  }

  if (path.match(/^\/api\/diagnostic-periods\/[^/]+\/slots$/) && method === "get") {
    const pid = path.split("/")[3];
    const period = db.diagnosticPeriods.find((p) => p.id === pid);
    if (!period) return err("Not found", 404);
    const date = params.date ?? db.demoDay;
    if (date < period.startDate || date > period.endDate) {
      return err("Дата вне периода диагностики");
    }
    const startOptions = diagnosticIntervalStartOptions(db, period, date);
    const slots = period.intervals
      .filter((i) => i.date === date)
      .sort((a, b) => a.startMin - b.startMin)
      .map((i) => {
        const booking = db.appointments.find(
          (a) =>
            a.status !== "CANCELLED" &&
            a.diagnosticPeriodId === period.id &&
            a.date === date &&
            a.startMin === i.startMin,
        );
        const client = booking ? db.clients.find((c) => c.id === booking.clientId) : null;
        return {
          startMin: i.startMin,
          endMin: i.startMin + period.durationMin,
          free: !booking,
          clientId: booking?.clientId ?? null,
          clientName: client?.fullName ?? null,
          coStaffSessionId: booking?.coStaffSessionId ?? null,
          appointmentId: booking?.id ?? null,
        };
      });
    return ok({ date, durationMin: period.durationMin, startOptions, slots });
  }

  if (path.match(/^\/api\/diagnostic-periods\/[^/]+\/book$/) && method === "post") {
    const pid = path.split("/")[3];
    const period = db.diagnosticPeriods.find((p) => p.id === pid);
    if (!period) return err("Not found", 404);
    const date = String(body.date ?? "");
    const startMin = Number(body.startMin);
    const clientId = String(body.clientId ?? "");
    if (!date || !clientId || Number.isNaN(startMin)) return err("date, startMin, clientId required");
    if (!isSlotAligned(startMin)) return err("startMin должно быть кратно 15 минутам");
    if (date < period.startDate || date > period.endDate) {
      return err("Дата вне периода диагностики");
    }
    const defined = period.intervals.find((i) => i.date === date && i.startMin === startMin);
    if (!defined) return err("Такого интервала нет — сначала добавьте его", 409);
    if (!diagnosticSlotFree(db, period.id, date, startMin)) {
      return err("Слот уже занят", 409);
    }
    const endMin = startMin + period.durationMin;
    if (clientHasBookingOverlap(db, clientId, date, { startMin, endMin })) {
      return err("У клиента уже есть запись в это время", 409);
    }
    const service =
      db.services.find((s) => s.name === "Диагностика" && !s.isGroup) ??
      db.services.find((s) => s.isActive);
    if (!service) return err("service not found", 404);
    const coStaffSessionId = period.participantIds.length > 1 ? newId("cs") : null;
    const created = [];
    for (const employeeId of period.participantIds) {
      const row = {
        id: newId("apt"),
        date,
        startMin,
        endMin,
        status: "PLANNED" as const,
        clientNoShow: false,
        note: String(body.note ?? ""),
        groupSessionId: null as string | null,
        groupAgeRange: null as string | null,
        coStaffSessionId,
        diagnosticPeriodId: period.id,
        clientId,
        employeeId,
        serviceId: service.id,
        roomId: period.roomId,
      };
      db.appointments.push(row);
      created.push(enrichAppointment(db, row));
    }
    saveDb(db);
    return ok(created[0] ?? null, 201);
  }

  if (path.match(/^\/api\/diagnostic-periods\/[^/]+\/bookings$/) && method === "delete") {
    const pid = path.split("/")[3];
    const date = params.date;
    const startMin = Number(params.startMin);
    if (!date || Number.isNaN(startMin)) return err("query ?date=&startMin= required");
    const before = db.appointments.length;
    db.appointments = db.appointments.filter(
      (a) =>
        !(
          a.diagnosticPeriodId === pid &&
          a.date === date &&
          a.startMin === startMin
        ),
    );
    if (db.appointments.length === before) return err("not found", 404);
    saveDb(db);
    return ok(null, 204);
  }

  if (path.match(/^\/api\/diagnostic-periods\/[^/]+$/) && method === "patch") {
    const pid = path.split("/")[3];
    const idx = db.diagnosticPeriods.findIndex((p) => p.id === pid);
    if (idx < 0) return err("Not found", 404);
    db.diagnosticPeriods[idx] = { ...db.diagnosticPeriods[idx], ...body, id: pid } as DemoDb["diagnosticPeriods"][number];
    saveDb(db);
    return ok(enrichDiagnostic(db, db.diagnosticPeriods[idx]));
  }

  if (path.match(/^\/api\/diagnostic-periods\/[^/]+$/) && method === "delete") {
    const pid = path.split("/")[3];
    db.diagnosticPeriods = db.diagnosticPeriods.filter((p) => p.id !== pid);
    db.appointments = db.appointments.filter((a) => a.diagnosticPeriodId !== pid);
    saveDb(db);
    return ok({ ok: true });
  }

  // Document templates
  if (path === "/api/document-templates/variables") {
    if (method === "get") return ok(db.documentVariables);
    if (method === "post") {
      const row = {
        id: newId("var"),
        key: String(body.key ?? "var"),
        label: String(body.label ?? "Переменная"),
        sortOrder: db.documentVariables.length,
      };
      db.documentVariables.push(row);
      saveDb(db);
      return ok(row, 201);
    }
  }

  if (path.startsWith("/api/document-templates/variables/") && path.split("/").length === 5) {
    const vid = path.split("/")[4];
    const idx = db.documentVariables.findIndex((v) => v.id === vid);
    if (idx < 0) return err("Not found", 404);
    if (method === "patch") {
      db.documentVariables[idx] = { ...db.documentVariables[idx], ...body, id: vid };
      saveDb(db);
      return ok(db.documentVariables[idx]);
    }
    if (method === "delete") {
      db.documentVariables.splice(idx, 1);
      saveDb(db);
      return ok({ ok: true });
    }
  }

  if (path === "/api/document-templates/render" && method === "post") {
    const templateId = body.templateId ? String(body.templateId) : null;
    const templates = templateId
      ? db.documentTemplates.filter((t) => t.id === templateId)
      : [...db.documentTemplates].sort((a, b) => a.sortOrder - b.sortOrder);
    if (!templates.length) return err("Нет шаблонов для печати");

    const submitted = (body.values as Record<string, string> | undefined) ?? {};
    const client = body.clientId ? db.clients.find((c) => c.id === String(body.clientId)) : null;
    const values: Record<string, string> = {};
    for (const variable of db.documentVariables) {
      values[variable.key] = String(submitted[variable.key] ?? "").trim();
    }
    for (const [key, value] of Object.entries(submitted)) {
      if (!(key in values)) values[key] = String(value ?? "").trim();
    }

    const accountGroup = (categories: string[]) => {
      if (categories.includes("CHILD_DISABILITY")) return "ребенок-инвалид";
      if (categories.some((item) => item.startsWith("DISABILITY_"))) return "инвалид";
      if (categories.includes("OJD")) return "ОЖД";
      if (categories.includes("OVZ")) return "ОВЗ";
      return "";
    };

    if (client) {
      if (!values.FIO) values.FIO = client.fullName;
      if (!values.PHONE && client.phone) values.PHONE = client.phone;
      if (!values.BIRTH && client.birthDate) values.BIRTH = client.birthDate.slice(0, 10);
      if (!values.GROUP) values.GROUP = accountGroup(client.categories ?? []);
    }
    if (!values.DATE) values.DATE = format(new Date(), "yyyy-MM-dd");
    if (!values.ADDRESS) values.ADDRESS = "г. Примерск, ул. Демонстрационная, д. 1";

    const formatDocDate = (raw: string, birth = false) => {
      if (!/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw;
      const [y, m, d] = raw.slice(0, 10).split("-");
      return birth ? `${d}.${m}.${y} г.р.` : `${d}.${m}.${y}`;
    };
    if (values.BIRTH) values.BIRTH = formatDocDate(values.BIRTH, true);
    if (values.DATE) values.DATE = formatDocDate(values.DATE, false);

    try {
      const { fillDocx, mergeDocx, safeFilePart, base64ToBytes } = await import("./fillDocx");

      const loadTemplateBytes = async (template: (typeof templates)[number]) => {
        const withData = template as { fileDataBase64?: string; assetUrl?: string; fileName?: string; title?: string };
        if (withData.fileDataBase64) return base64ToBytes(withData.fileDataBase64);
        const rel = (withData.assetUrl || `templates/${withData.fileName || "template.docx"}`).replace(/^\//, "");
        const url = `${import.meta.env.BASE_URL}${rel}`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Не удалось загрузить шаблон «${withData.title ?? rel}»`);
        }
        return new Uint8Array(await response.arrayBuffer());
      };

      const filled: Blob[] = [];
      for (const template of templates) {
        filled.push(fillDocx(await loadTemplateBytes(template), values));
      }

      const merge = Boolean(body.merge) || !templateId;
      const blob = merge ? await mergeDocx(filled) : filled[0]!;
      const label = merge && templates.length > 1 ? "документы" : templates[0]!.title;
      const filename = `${safeFilePart(values.FIO || "документ")} — ${safeFilePart(label)}.docx`;
      return {
        status: 200,
        data: blob,
        headers: {
          "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
          "content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        },
      };
    } catch (error) {
      return err(error instanceof Error ? error.message : "Не удалось заполнить шаблон", 400);
    }
  }

  if (path === "/api/document-templates" && method === "get") {
    return ok(
      db.documentTemplates.map((t) => {
        const { fileDataBase64: _omit, ...rest } = t as typeof t & { fileDataBase64?: string };
        return rest;
      }),
    );
  }

  if (path === "/api/document-templates" && method === "post") {
    const file = body.file;
    const fileName =
      typeof file === "object" && file && "name" in file
        ? String((file as File).name)
        : String(body.fileName ?? "demo.docx");
    let fileDataBase64 = "";
    if (typeof File !== "undefined" && file instanceof File) {
      const { bytesToBase64 } = await import("./fillDocx");
      fileDataBase64 = bytesToBase64(await file.arrayBuffer());
    }
    const row = {
      id: newId("tpl"),
      title: String(body.title ?? "Шаблон"),
      fileName,
      assetUrl: "",
      fileDataBase64,
      sortOrder: db.documentTemplates.length,
      createdAt: new Date().toISOString(),
    };
    db.documentTemplates.push(row);
    saveDb(db);
    return ok(row, 201);
  }

  if (path.match(/^\/api\/document-templates\/[^/]+$/) && method === "patch") {
    const tid = path.split("/")[3];
    const idx = db.documentTemplates.findIndex((t) => t.id === tid);
    if (idx < 0) return err("Not found", 404);
    db.documentTemplates[idx] = { ...db.documentTemplates[idx], ...body, id: tid };
    saveDb(db);
    return ok(db.documentTemplates[idx]);
  }

  if (path.match(/^\/api\/document-templates\/[^/]+$/) && method === "delete") {
    const tid = path.split("/")[3];
    db.documentTemplates = db.documentTemplates.filter((t) => t.id !== tid);
    saveDb(db);
    return ok({ ok: true });
  }

  // Document route
  if (path === "/api/document-route/stages" && method === "get") {
    return ok([...db.documentRouteStages].sort((a, b) => a.sortOrder - b.sortOrder));
  }

  if (path === "/api/document-route/stages" && method === "post") {
    const row = {
      id: newId("stg"),
      title: String(body.title ?? "Этап"),
      sortOrder: Number(body.sortOrder ?? db.documentRouteStages.length),
      isActive: body.isActive !== false,
    };
    db.documentRouteStages.push(row);
    saveDb(db);
    return ok(row, 201);
  }

  if (path === "/api/document-route/stages/reorder" && method === "put") {
    const ids = Array.isArray(body.ids) ? (body.ids as string[]) : [];
    ids.forEach((sid, index) => {
      const stage = db.documentRouteStages.find((s) => s.id === sid);
      if (stage) stage.sortOrder = index;
    });
    saveDb(db);
    return ok([...db.documentRouteStages].sort((a, b) => a.sortOrder - b.sortOrder));
  }

  if (path.match(/^\/api\/document-route\/stages\/[^/]+$/) && method === "patch") {
    const sid = path.split("/")[4];
    const idx = db.documentRouteStages.findIndex((s) => s.id === sid);
    if (idx < 0) return err("Not found", 404);
    db.documentRouteStages[idx] = { ...db.documentRouteStages[idx], ...body, id: sid };
    saveDb(db);
    return ok(db.documentRouteStages[idx]);
  }

  if (path.match(/^\/api\/document-route\/stages\/[^/]+$/) && method === "delete") {
    const sid = path.split("/")[4];
    db.documentRouteStages = db.documentRouteStages.filter((s) => s.id !== sid);
    saveDb(db);
    return ok({ ok: true });
  }

  if (path === "/api/document-route/board" && method === "get") {
    const status = params.status ?? "active";
    const stages = [...db.documentRouteStages]
      .filter((s) => s.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const courses = db.clientCourses.filter((c) => {
      if (status === "completed") return c.isCompleted;
      return !c.isCompleted;
    });
    const items = courses
      .map((course) => {
        const client = db.clients.find((c) => c.id === course.clientId);
        if (client && client.isActive === false) return null;
        const checks = stages.map((stage) => {
          const check = db.documentRouteChecks.find(
            (ch) => ch.courseId === course.id && ch.stageId === stage.id,
          );
          const author = check?.checkedByUserId
            ? db.users.find((u) => u.id === check.checkedByUserId)
            : null;
          return {
            stageId: stage.id,
            title: stage.title,
            checked: !!check?.checked,
            checkedAt: check?.checkedAt ?? null,
            checkedByName: author?.displayName ?? author?.username ?? null,
          };
        });
        const checkedCount = checks.filter((c) => c.checked).length;
        const allChecked = stages.length > 0 && checkedCount === stages.length;
        return {
          courseId: course.id,
          clientId: course.clientId,
          clientName: client?.fullName ?? "—",
          startedAt: course.startedAt,
          completedAt: course.completedAt,
          isCompleted: course.isCompleted,
          checkedCount,
          stageCount: stages.length,
          allChecked,
          checks,
        };
      })
      .filter((item): item is NonNullable<typeof item> => {
        if (!item) return false;
        if (status === "finishing") return item.allChecked;
        if (status === "active") return !item.allChecked || stages.length === 0;
        return true;
      });
    return ok({ stages, items });
  }

  if (path.match(/^\/api\/document-route\/courses\/[^/]+\/stages\/[^/]+$/) && method === "put") {
    const courseId = path.split("/")[4];
    const stageId = path.split("/")[6];
    const checked = Boolean(body.checked);
    let row = db.documentRouteChecks.find((c) => c.courseId === courseId && c.stageId === stageId);
    if (!row) {
      row = {
        courseId,
        stageId,
        checked,
        checkedAt: checked ? new Date().toISOString() : null,
        checkedByUserId: checked ? gated.user!.id : null,
      };
      db.documentRouteChecks.push(row);
    } else {
      row.checked = checked;
      row.checkedAt = checked ? new Date().toISOString() : null;
      row.checkedByUserId = checked ? gated.user!.id : null;
    }
    saveDb(db);
    return ok({ ok: true });
  }

  // Users
  if (path === "/api/users" && method === "get") {
    return ok(db.users.map((u) => serializeUserRow(db, u.id)).filter(Boolean));
  }

  if (path === "/api/users" && method === "post") {
    const username = String(body.username ?? "").trim();
    if (!username) return err("Логин не может быть пустым");
    if (db.users.some((u) => u.username === username)) {
      return err("Пользователь с таким логином уже существует", 409);
    }
    if (body.role === "SPECIALIST") {
      const employeeId = String(body.employeeId ?? "");
      if (!employeeId) return err("Для специалиста нужен сотрудник");
      db.users.push({
        id: newId("user"),
        username,
        password: String(body.password ?? "demo"),
        role: "SPECIALIST",
        displayName: username,
        employeeId,
        employeeActive: true,
        createdAt: new Date().toISOString(),
      });
    } else {
      db.users.push({
        id: newId("user"),
        username,
        password: String(body.password ?? "demo"),
        role: "ADMIN",
        displayName: username,
        employeeId: null,
        employeeActive: null,
        createdAt: new Date().toISOString(),
      });
    }
    saveDb(db);
    return ok(serializeUserRow(db, db.users[db.users.length - 1].id), 201);
  }

  if (path.match(/^\/api\/users\/[^/]+\/reset-password$/) && method === "post") {
    const uid = path.split("/")[3];
    const user = db.users.find((u) => u.id === uid);
    if (!user) return err("Not found", 404);
    user.password = String(body.password ?? "demo");
    saveDb(db);
    return ok({ ok: true });
  }

  if (path.match(/^\/api\/users\/[^/]+$/) && method === "patch") {
    const uid = path.split("/")[3];
    const idx = db.users.findIndex((u) => u.id === uid);
    if (idx < 0) return err("Not found", 404);
    if (body.username != null) db.users[idx].username = String(body.username);
    if (body.role != null) db.users[idx].role = body.role as DemoDb["users"][number]["role"];
    if (body.employeeId !== undefined) {
      db.users[idx].employeeId = body.employeeId as string | null;
    }
    saveDb(db);
    return ok(serializeUserRow(db, uid));
  }

  if (path.match(/^\/api\/users\/[^/]+$/) && method === "delete") {
    const uid = path.split("/")[3];
    if (uid === gated.user!.id) return err("Нельзя удалить текущего пользователя");
    db.users = db.users.filter((u) => u.id !== uid);
    saveDb(db);
    return ok({ ok: true });
  }

  return err(`Demo stub: ${method.toUpperCase()} ${path}`, 501);
}

function WEEK_DEFAULT() {
  return [1, 2, 3, 4, 5].map((weekday) => ({
    id: newId("shift"),
    weekday,
    startMin: 540,
    endMin: weekday === 5 ? 1005 : 1080,
    lunchStartMin: 780,
    lunchEndMin: 840,
  }));
}
