import type { Absence, Appointment } from "../lib/types";

export interface SlotDraft {
  employeeId: string;
  employeeName: string;
  date: string;
  startMin: number;
  endMin?: number;
  serviceId?: string;
  roomId?: string;
  clientId?: string;
  joinGroupSessionId?: string;
  groupMembers?: Appointment[];
  allowPickSlot?: boolean;
  appointment?: Appointment;
  attendanceOnly?: boolean;
  /** Только создание отсутствия (для специалиста / клика по слоту). */
  absenceOnly?: boolean;
  /** Редактирование существующего отсутствия. */
  absence?: Absence;
}
