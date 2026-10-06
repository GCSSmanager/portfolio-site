import type { Appointment } from "./types";

export type ClientScheduleUndoEntry =
  | {
      kind: "move";
      appointmentId: string;
      date: string;
      startMin: number;
    }
  | {
      kind: "create";
      appointmentId: string;
    }
  | {
      kind: "absence-create";
      absenceId: string;
    }
  | {
      kind: "restore";
      payload: AppointmentRestorePayload;
    };

export type AppointmentRestorePayload = {
  date: string;
  startMin: number;
  clientId: string;
  employeeId: string;
  serviceId: string;
  roomId?: string;
  note?: string;
  groupSessionId?: string;
};

export function appointmentRestorePayload(appointment: Appointment): AppointmentRestorePayload {
  return {
    date: appointment.date.slice(0, 10),
    startMin: appointment.startMin,
    clientId: appointment.client.id,
    employeeId: appointment.employee.id,
    serviceId: appointment.service.id,
    roomId: appointment.room?.id,
    note: appointment.note ?? undefined,
    groupSessionId: appointment.groupSessionId ?? undefined,
  };
}

export function findAppointmentById(
  appointmentsByDate: Map<string, Appointment[]>,
  appointmentId: string,
): Appointment | undefined {
  for (const appointments of appointmentsByDate.values()) {
    const found = appointments.find((appointment) => appointment.id === appointmentId);
    if (found) return found;
  }
  return undefined;
}
