import { overlaps, type Interval } from "./availability";
import type { Appointment } from "./types";

/**
 * Сколько мест кабинета занято на интервале.
 * Групповые услуги не учитываются; co-staff сессия = 1 место.
 */
export function countRoomOccupancy(
  appointments: Appointment[],
  roomId: string,
  interval: Interval,
  options?: {
    excludeAppointmentId?: string;
    excludeAppointmentIds?: string[];
    excludeCoStaffSessionId?: string;
  },
): number {
  const excludeIds = new Set(options?.excludeAppointmentIds ?? []);
  if (options?.excludeAppointmentId) excludeIds.add(options.excludeAppointmentId);

  const seenCoStaff = new Set<string>();
  let used = 0;

  for (const appointment of appointments) {
    if (appointment.status === "CANCELLED") continue;
    if (excludeIds.has(appointment.id)) continue;
    if (appointment.service.isGroup) continue;
    if (appointment.room?.id !== roomId) continue;
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
