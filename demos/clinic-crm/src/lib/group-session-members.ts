import { api } from "./api";
import type { Appointment } from "./types";

export async function fetchGroupSessionMembers(
  groupSessionId: string,
  fallback: Appointment[] = [],
): Promise<Appointment[]> {
  try {
    const { data } = await api.get<Appointment[]>(`/api/appointments/group/${groupSessionId}`);
    if (!data.length) return fallback;
    return [...data].sort((a, b) => a.client.fullName.localeCompare(b.client.fullName, "ru"));
  } catch {
    return fallback;
  }
}

export async function fetchCoStaffSessionMembers(
  coStaffSessionId: string,
  fallback: Appointment[] = [],
): Promise<Appointment[]> {
  try {
    const { data } = await api.get<Appointment[]>(`/api/appointments/co-staff/${coStaffSessionId}`);
    if (!data.length) return fallback;
    return [...data].sort((a, b) => a.employee.shortName.localeCompare(b.employee.shortName, "ru"));
  } catch {
    return fallback;
  }
}
