import { useMemo } from "react";
import type { SearchOption } from "../components/ui";
import { getAppointmentConflict, type ScheduleConflict } from "../lib/conflicts";
import { minToTime } from "../lib/format";
import type { Absence, Appointment, DiagnosticPeriod, Employee, Room, Service } from "../lib/types";

interface Params {
  date: string;
  employee?: Employee;
  employees?: Employee[];
  service: Service | null;
  slots: number[];
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

export function useTimeConflictOptions({
  date,
  employee,
  employees: staffList,
  service,
  slots,
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
    const conflicts = new Map<number, ScheduleConflict | null>();
    const staff = staffList?.length ? staffList : employee ? [employee] : [];

    const options: SearchOption[] = slots.map((startMin) => {
      if (!staff.length || !service) {
        return {
          value: String(startMin),
          label: minToTime(startMin),
          disabled: true,
          hint: !staff.length ? "выберите специалиста" : "выберите услугу",
        };
      }

      let conflict: ScheduleConflict | null = null;
      for (const next of staff) {
        conflict = getAppointmentConflict({
          employee: next,
          date,
          interval: { startMin, endMin: startMin + service.durationMin },
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
        });
        if (conflict) break;
      }

      conflicts.set(startMin, conflict);
      return {
        value: String(startMin),
        label: minToTime(startMin),
        hint: conflict?.shortLabel,
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
    employee,
    excludeAppointmentId,
    excludeAppointmentIds,
    excludeCoStaffSessionId,
    joinGroupSessionId,
    roomId,
    rooms,
    service,
    slots,
    staffList,
  ]);
}
