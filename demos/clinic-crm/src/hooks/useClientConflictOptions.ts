import { useMemo } from "react";
import type { SearchOption } from "../components/ui";
import { getClientConflict, type ScheduleConflict } from "../lib/conflicts";
import type { Interval } from "../lib/availability";
import { clientFitsGroupAgeRange, type GroupAgeRange } from "../lib/group-age";
import type { Appointment, Client } from "../lib/types";

interface Params {
  clients: Client[];
  interval: Interval;
  appointments: Appointment[];
  excludeAppointmentId?: string;
  excludeAppointmentIds?: string[];
  groupAgeRange?: GroupAgeRange | null;
  date?: string;
}

export function useClientConflictOptions({
  clients,
  interval,
  appointments,
  excludeAppointmentId,
  excludeAppointmentIds = [],
  groupAgeRange,
  date,
}: Params) {
  return useMemo(() => {
    const conflicts = new Map<string, ScheduleConflict | null>();
    const options: SearchOption[] = clients.map((client) => {
      const conflict = getClientConflict({
        clientId: client.id,
        interval,
        appointments,
        excludeAppointmentId,
        excludeAppointmentIds,
      });
      const ageMismatch =
        !!groupAgeRange &&
        !!date &&
        !clientFitsGroupAgeRange(client.birthDate, groupAgeRange, date);

      conflicts.set(client.id, conflict);
      return {
        value: client.id,
        label: client.fullName,
        hint: conflict?.shortLabel ?? (ageMismatch ? "не тот возраст" : client.phone ?? undefined),
        disabled: !!conflict || ageMismatch,
      };
    });

    return { options, conflicts };
  }, [appointments, clients, date, excludeAppointmentId, excludeAppointmentIds, groupAgeRange, interval]);
}
