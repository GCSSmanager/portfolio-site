import { useCallback, useEffect, useState } from "react";
import type { Absence, Appointment, DiagnosticPeriod, Employee } from "../lib/types";
import { checkClientScheduleSlot, type ClientScheduleSlotTarget } from "../lib/client-schedule-slot-check";

export type ClientPasteTarget = ClientScheduleSlotTarget;

export type ClientPasteState = {
  template: Appointment | null;
};

interface UseClientAppointmentPasteParams {
  employees: Employee[];
  appointmentsByDate: Map<string, Appointment[]>;
  diagnosticPeriodsByDate: Map<string, DiagnosticPeriod[]>;
  absences: Absence[];
  onPasteAppointment: (payload: {
    date: string;
    startMin: number;
    clientId: string;
    employeeId: string;
    serviceId: string;
    roomId?: string;
    note?: string;
  }) => void;
}

export function useClientAppointmentPaste({
  employees,
  appointmentsByDate,
  diagnosticPeriodsByDate,
  absences,
  onPasteAppointment,
}: UseClientAppointmentPasteParams) {
  const [template, setTemplate] = useState<Appointment | null>(null);

  const resolveEmployee = useCallback(
    (appointment: Appointment): Employee | null =>
      employees.find((employee) => employee.id === appointment.employee.id) ?? null,
    [employees],
  );

  const pasteTarget = useCallback(
    (date: string, startMin: number, source: Appointment): ClientPasteTarget =>
      checkClientScheduleSlot({
        date,
        startMin,
        appointment: source,
        employee: resolveEmployee(source),
        appointmentsByDate,
        diagnosticPeriodsByDate,
        absences,
      }),
    [absences, appointmentsByDate, diagnosticPeriodsByDate, resolveEmployee],
  );

  const copy = useCallback((appointment: Appointment) => {
    if (appointment.diagnosticPeriodId) return;
    setTemplate(appointment);
  }, []);

  const cancel = useCallback(() => {
    setTemplate(null);
  }, []);

  const confirmPaste = useCallback(
    (date: string, startMin: number) => {
      if (!template) return;
      const target = pasteTarget(date, startMin, template);
      if (!target.ok) return;

      onPasteAppointment({
        date,
        startMin,
        clientId: template.client.id,
        employeeId: template.employee.id,
        serviceId: template.service.id,
        roomId: template.room?.id,
        note: template.note ?? undefined,
      });
    },
    [onPasteAppointment, pasteTarget, template],
  );

  useEffect(() => {
    if (!template) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      const target = event.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable) return;
      }

      event.preventDefault();
      cancel();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cancel, template]);

  return {
    pasteState: { template } satisfies ClientPasteState,
    pasteTarget,
    copy,
    cancel,
    confirmPaste,
    active: !!template,
  };
}
