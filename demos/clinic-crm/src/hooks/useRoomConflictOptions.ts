import { useMemo } from "react";
import type { SearchOption } from "../components/ui";
import { getRoomConflict, type ScheduleConflict } from "../lib/conflicts";
import { countRoomOccupancy } from "../lib/room-capacity";
import type { Interval } from "../lib/availability";
import type { Appointment, Room } from "../lib/types";

interface Params {
  rooms: Room[];
  interval: Interval;
  appointments: Appointment[];
  excludeAppointmentId?: string;
  excludeAppointmentIds?: string[];
  excludeCoStaffSessionId?: string;
  isGroupService?: boolean;
  emptyLabel?: string;
}

export function useRoomConflictOptions({
  rooms,
  interval,
  appointments,
  excludeAppointmentId,
  excludeAppointmentIds = [],
  excludeCoStaffSessionId,
  isGroupService = false,
  emptyLabel = "— не указан —",
}: Params) {
  return useMemo(() => {
    const conflicts = new Map<string, ScheduleConflict | null>();
    const roomOptions = rooms.map((room) => {
      const capacity = room.capacity ?? 1;
      const conflict = getRoomConflict({
        roomId: room.id,
        interval,
        appointments,
        capacity,
        excludeAppointmentId,
        excludeAppointmentIds,
        excludeCoStaffSessionId,
        isGroupService,
      });

      conflicts.set(room.id, conflict);
      const used = countRoomOccupancy(appointments, room.id, interval, {
        excludeAppointmentId,
        excludeAppointmentIds,
        excludeCoStaffSessionId,
      });
      const freeHint =
        capacity > 1 ? `${Math.max(0, capacity - used)}/${capacity} мест` : "свободен";

      return {
        value: room.id,
        label: room.name,
        hint: conflict?.shortLabel ?? freeHint,
        disabled: !!conflict,
      };
    });

    const options: SearchOption[] = [{ value: "", label: emptyLabel }, ...roomOptions];
    return { options, conflicts };
  }, [
    appointments,
    emptyLabel,
    excludeAppointmentId,
    excludeAppointmentIds,
    excludeCoStaffSessionId,
    interval,
    isGroupService,
    rooms,
  ]);
}
