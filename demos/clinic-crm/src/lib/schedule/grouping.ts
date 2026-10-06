import type { Appointment } from "../types";
import type { SlotSuggestion } from "../slot-suggestions";

export function groupBy<T>(items: T[], keyFn: (item: T) => string) {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return map;
}

export function groupAppointmentsByEmployee(appointments: Appointment[]) {
  return groupBy(appointments, (appointment) => appointment.employee.id);
}

export function groupSuggestionsByEmployee(suggestions: SlotSuggestion[]) {
  return groupBy(suggestions, (suggestion) => suggestion.employee.id);
}
