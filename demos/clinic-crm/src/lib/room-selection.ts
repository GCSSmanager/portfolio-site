import type { Interval } from "./availability";
import { getRoomConflict } from "./conflicts";
import type { Appointment, Room } from "./types";

interface PickRoomParams {
  rooms: Room[];
  interval: Interval;
  appointments: Appointment[];
  isGroupService?: boolean;
  fixedRoomId?: string;
  preferredRoomId?: string;
  excludeAppointmentId?: string;
  excludeAppointmentIds?: string[];
}

function isRoomFree({
  room,
  interval,
  appointments,
  isGroupService,
  excludeAppointmentId,
  excludeAppointmentIds,
}: {
  room: Room;
  interval: Interval;
  appointments: Appointment[];
  isGroupService?: boolean;
  excludeAppointmentId?: string;
  excludeAppointmentIds?: string[];
}) {
  return !getRoomConflict({
    roomId: room.id,
    interval,
    appointments,
    capacity: room.capacity ?? 1,
    isGroupService,
    excludeAppointmentId,
    excludeAppointmentIds,
  });
}

export function pickAvailableRoom({
  rooms,
  interval,
  appointments,
  isGroupService = false,
  fixedRoomId,
  preferredRoomId,
  excludeAppointmentId,
  excludeAppointmentIds,
}: PickRoomParams): Room | undefined {
  if (isGroupService) return undefined;

  const freeCheck = (roomId: string) => {
    const room = rooms.find((item) => item.id === roomId);
    if (!room) return false;
    return isRoomFree({
      room,
      interval,
      appointments,
      isGroupService,
      excludeAppointmentId,
      excludeAppointmentIds,
    });
  };

  if (fixedRoomId) {
    const fixed = rooms.find((room) => room.id === fixedRoomId);
    return fixed && freeCheck(fixedRoomId) ? fixed : undefined;
  }

  if (preferredRoomId && freeCheck(preferredRoomId)) {
    return rooms.find((room) => room.id === preferredRoomId);
  }

  return rooms.find((room) => freeCheck(room.id));
}

export function resolveRoomId(params: PickRoomParams): string {
  return pickAvailableRoom(params)?.id ?? "";
}
