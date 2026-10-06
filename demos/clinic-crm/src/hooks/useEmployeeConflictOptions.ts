import { useMemo } from "react";
import type { SearchOption } from "../components/ui";
import { getAppointmentConflict, type ScheduleConflict } from "../lib/conflicts";
import type { Absence, Appointment, DiagnosticPeriod, Employee, Room, Service } from "../lib/types";

interface Params {
  date: string;
  employees: Employee[];
  startMin: number;
  service: Service | null;
  appointments: Appointment[];
  diagnosticPeriods?: DiagnosticPeriod[];
  absences: Absence[];
  rooms?: Room[];
  clientId?: string;
  roomId?: string;
  joinGroupSessionId?: string;
  excludeCoStaffSessionId?: string;
  excludeAppointmentId?: string;
  excludeAppointmentIds?: string[];
}

export function useEmployeeConflictOptions({
  date,
  employees,
  startMin,
  service,
  appointments,
  diagnosticPeriods = [],
  absences,
  rooms = [],
  clientId,
  roomId,
  joinGroupSessionId,
  excludeCoStaffSessionId,
  excludeAppointmentId,
  excludeAppointmentIds = [],
}: Params) {
  return useMemo(() => {
    const durationMin = service?.durationMin ?? 30;
    const interval = { startMin, endMin: startMin + durationMin };
    const conflicts = new Map<string, ScheduleConflict | null>();

    const options: SearchOption[] = employees.map((employee) => {
        const conflict = service
          ? getAppointmentConflict({
              employee,
              date,
              interval,
              appointments,
              diagnosticPeriods,
              absences,
              rooms,
              clientId,
              roomId,
              service,
              joinGroupSessionId,
              excludeCoStaffSessionId,
              excludeAppointmentId,
              excludeAppointmentIds,
            })
          : null;

        conflicts.set(employee.id, conflict);
        return {
          value: employee.id,
          label: employee.shortName,
          hint: conflict?.shortLabel ?? employee.position ?? undefined,
          disabled: !!conflict,
        };
      });

    return { options, conflicts };
  }, [
    absences,
    appointments,
    clientId,
    date,
    diagnosticPeriods,
    employees,
    rooms,
    roomId,
    joinGroupSessionId,
    excludeCoStaffSessionId,
    excludeAppointmentId,
    excludeAppointmentIds,
    service,
    startMin,
  ]);
}
