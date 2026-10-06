import type { Absence, Appointment, DiagnosticPeriod, Employee, Room, Service } from "./types";
import { buildSlots } from "./time";
import { getAppointmentConflict, getClientConflict } from "./conflicts";
import { clientFitsGroupAgeRange } from "./group-age";
import { clientAlreadyInGroup, findOpenGroupSessions } from "./group-sessions";
import { pickAvailableRoom } from "./room-selection";
import { matchesStaffFilter } from "./staff-filter";

export interface SlotSuggestion {
  id: string;
  employee: Employee;
  room?: Room;
  startMin: number;
  endMin: number;
  label: "Лучшее" | "Рано" | "Свободно" | "В группу";
  groupSessionId?: string;
  groupSize?: number;
}

function loadMinutes(employeeId: string, appointments: Appointment[]) {
  return appointments
    .filter((a) => a.employee.id === employeeId)
    .reduce((sum, a) => sum + (a.endMin - a.startMin), 0);
}

/** Конец последней записи клиента в этот день — якорь для последовательности автоподбора. */
export function clientLastEndOnDay(
  clientId: string | undefined,
  date: string,
  appointments: Appointment[],
): number | null {
  if (!clientId) return null;
  const day = date.slice(0, 10);
  let lastEnd: number | null = null;
  for (const appointment of appointments) {
    if (appointment.status === "CANCELLED") continue;
    if (appointment.client.id !== clientId) continue;
    if (appointment.date.slice(0, 10) !== day) continue;
    if (lastEnd == null || appointment.endMin > lastEnd) lastEnd = appointment.endMin;
  }
  return lastEnd;
}

/** Чем меньше score — тем лучше. При якоре клиента сначала слоты после его последней записи. */
function scoreSuggestionStart(startMin: number, anchorMin: number | null, employeeLoad = 0) {
  const load = employeeLoad * 0.18;
  if (anchorMin == null) return startMin + load;
  if (startMin >= anchorMin) return startMin - anchorMin + load;
  return 50_000 + (anchorMin - startMin) + load;
}

export function buildSlotSuggestions({
  date,
  employees,
  appointments,
  diagnosticPeriods = [],
  absences,
  rooms,
  service,
  roomId,
  employeeId,
  specialtyId,
  clientId,
  clientBirthDate,
  limit = 8,
}: {
  date: string;
  employees: Employee[];
  appointments: Appointment[];
  diagnosticPeriods?: DiagnosticPeriod[];
  absences: Absence[];
  rooms: Room[];
  service: Service | null;
  roomId?: string;
  employeeId?: string;
  specialtyId?: string;
  clientId?: string;
  clientBirthDate?: string | null;
  limit?: number;
}): SlotSuggestion[] {
  if (!service) return [];

  const staffFilter = { employeeId, specialtyId };
  const activeEmployees = employees.filter((employee) => matchesStaffFilter(employee, staffFilter));
  const activeRooms = rooms.filter((r) => !roomId || r.id === roomId);
  const candidates: Array<SlotSuggestion & { score: number }> = [];
  const clientAnchorMin = clientLastEndOnDay(clientId, date, appointments);
  const openGroups = service.isGroup
    ? findOpenGroupSessions({
        appointments,
        serviceId: service.id,
        employeeId: employeeId || undefined,
        date,
      }).filter((group) => activeEmployees.some((employee) => employee.id === group.appointment.employee.id))
    : [];
  const hasOpenGroupAt = (employeeIdValue: string, startMin: number) =>
    openGroups.some(
      (group) => group.appointment.employee.id === employeeIdValue && group.appointment.startMin === startMin,
    );

  if (service.isGroup) {
    for (const group of openGroups) {
      if (clientId && clientAlreadyInGroup(clientId, group.members)) continue;
      if (
        clientId &&
        group.appointment.groupAgeRange &&
        !clientFitsGroupAgeRange(clientBirthDate, group.appointment.groupAgeRange, date)
      ) {
        continue;
      }
      const employee = activeEmployees.find((item) => item.id === group.appointment.employee.id);
      if (!employee) continue;
      const room = activeRooms.find((item) => item.id === group.appointment.room?.id);
      const interval = { startMin: group.appointment.startMin, endMin: group.appointment.endMin };
      if (
        clientId &&
        getClientConflict({
          clientId,
          interval,
          appointments: appointments.filter(
            (appointment) => appointment.groupSessionId !== group.groupSessionId,
          ),
        })
      ) {
        continue;
      }
      candidates.push({
        id: `group-${group.groupSessionId}`,
        employee,
        room,
        startMin: group.appointment.startMin,
        endMin: group.appointment.endMin,
        label: "В группу",
        groupSessionId: group.groupSessionId,
        groupSize: group.members.length,
        // Группы чуть предпочтительнее свободного слота в то же время.
        score: scoreSuggestionStart(group.appointment.startMin, clientAnchorMin) - 1000,
      });
    }
  }

  for (const employee of activeEmployees) {
    const employeeLoad = loadMinutes(employee.id, appointments);

    for (const startMin of buildSlots()) {
      if (hasOpenGroupAt(employee.id, startMin)) continue;
      const endMin = startMin + service.durationMin;
      const interval = { startMin, endMin };
      if (
        getAppointmentConflict({
          employee,
          date,
          interval,
          appointments,
          diagnosticPeriods,
          absences,
          rooms,
          clientId,
          service,
        })
      ) {
        continue;
      }

      const room = pickAvailableRoom({
        rooms: activeRooms,
        interval,
        appointments,
        isGroupService: service.isGroup,
        fixedRoomId: roomId,
        preferredRoomId: employee.defaultRoomId ?? undefined,
      });
      if (!service.isGroup && activeRooms.length > 0 && !room) continue;

      candidates.push({
        id: `${employee.id}-${room?.id ?? "no-room"}-${startMin}`,
        employee,
        room,
        startMin,
        endMin,
        label: "Свободно",
        score: scoreSuggestionStart(startMin, clientAnchorMin, employeeLoad),
      });
    }
  }

  return candidates
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map((candidate, index) => ({
      id: candidate.id,
      employee: candidate.employee,
      room: candidate.room,
      startMin: candidate.startMin,
      endMin: candidate.endMin,
      label: candidate.label === "В группу" ? "В группу" : index === 0 ? "Лучшее" : index < 3 ? "Рано" : "Свободно",
      groupSessionId: candidate.groupSessionId,
      groupSize: candidate.groupSize,
    }));
}

export function pickUniqueSuggestionsByTime(suggestions: SlotSuggestion[], limit?: number): SlotSuggestion[] {
  const gridSuggestions = suggestions.filter((suggestion) => suggestion.label !== "В группу");
  const seen = new Set<number>();
  const unique: SlotSuggestion[] = [];

  for (const suggestion of gridSuggestions) {
    if (seen.has(suggestion.startMin)) continue;
    seen.add(suggestion.startMin);
    unique.push(suggestion);
    if (limit !== undefined && unique.length >= limit) break;
  }

  return unique;
}
