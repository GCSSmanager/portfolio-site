import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
import type { Absence, Appointment, DiagnosticPeriod, Employee } from "../lib/types";
import { DAY_END, DAY_START, SLOT_MIN } from "../lib/time";
import { ROW_H } from "../lib/schedule/coordinates";
import { getAppointmentConflict, getClientConflict, type ScheduleConflict } from "../lib/conflicts";

const DRAG_THRESHOLD_PX = 6;

export type MoveTarget =
  | { ok: true; label: "доступно" }
  | { ok: false; conflict: ScheduleConflict };

type MovingAppointment = {
  appointment: Appointment;
  groupMembers?: Appointment[];
  employeeId: string;
  startMin: number;
  moved: boolean;
};

type PendingPointer = {
  appointment: Appointment;
  groupMembers?: Appointment[];
  employeeId: string;
  startX: number;
  startY: number;
};

export type AppointmentDragState = {
  moveAppt: MovingAppointment | null;
  dragProbe: { employeeId: string; startMin: number } | null;
  dragOutOfBounds: boolean;
  dragging: boolean;
};

interface UseAppointmentDragParams {
  date: string;
  employees: Employee[];
  appointments: Appointment[];
  diagnosticPeriods?: DiagnosticPeriod[];
  absences: Absence[];
  rangeStart?: number;
  rangeEnd?: number;
  onMoveAppointment: (id: string, employeeId: string, startMin: number) => void;
  onEditAppointment: (appointment: Appointment) => void;
  onEditGroup?: (appointments: Appointment[]) => void;
}

export function useAppointmentDrag({
  date,
  employees,
  appointments,
  diagnosticPeriods = [],
  absences,
  rangeStart = DAY_START,
  rangeEnd = DAY_END,
  onMoveAppointment,
  onEditAppointment,
  onEditGroup,
}: UseAppointmentDragParams) {
  const [moveAppt, setMoveAppt] = useState<MovingAppointment | null>(null);
  const [dragProbe, setDragProbe] = useState<AppointmentDragState["dragProbe"]>(null);
  const [dragOutOfBounds, setDragOutOfBounds] = useState(false);
  const [listening, setListening] = useState(false);

  const movingRef = useRef<MovingAppointment | null>(null);
  const pendingRef = useRef<PendingPointer | null>(null);
  const dragActivatedRef = useRef(false);
  const dropAllowedRef = useRef(true);
  const columnRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const moveTarget = useCallback(
    (employee: Employee, startMin: number, moving: Appointment, groupMembers?: Appointment[]): MoveTarget => {
      const duration = moving.endMin - moving.startMin;
      const endMin = startMin + duration;
      const interval = { startMin, endMin };
      const coStaffMembers = moving.coStaffSessionId
        ? appointments.filter((item) => item.coStaffSessionId === moving.coStaffSessionId)
        : [];
      const members = groupMembers?.length
        ? groupMembers
        : coStaffMembers.length
          ? coStaffMembers
          : [moving];
      // Исключаем всю сессию (группа / мульти-штат), иначе соседние ±15 мин
      // пересекаются с «своими» строками → ложный «клиент занят».
      const excludeIds = new Set(members.map((member) => member.id));
      excludeIds.add(moving.id);
      if (moving.coStaffSessionId) {
        for (const item of appointments) {
          if (item.coStaffSessionId === moving.coStaffSessionId) excludeIds.add(item.id);
        }
      }
      if (moving.groupSessionId) {
        for (const item of appointments) {
          if (item.groupSessionId === moving.groupSessionId) excludeIds.add(item.id);
        }
      }
      const excludeAppointmentIds = [...excludeIds];
      const service = {
        ...moving.service,
        durationMin: duration,
        isActive: true,
      };

      // Мульти-штат: нельзя переносить в другую колонку.
      if (moving.coStaffSessionId && employee.id !== moving.employee.id) {
        return {
          ok: false,
          conflict: {
            kind: "employee_busy",
            title: "Несколько специалистов",
            shortLabel: "только время",
            hint: "Запись с несколькими специалистами можно сдвигать только по времени.",
            tone: "danger",
          },
        };
      }

      const staffEmployees: Employee[] = [];
      const seen = new Set<string>();
      for (const member of members) {
        if (seen.has(member.employee.id)) continue;
        seen.add(member.employee.id);
        const resolved = employees.find((item) => item.id === member.employee.id);
        if (resolved) staffEmployees.push(resolved);
      }
      if (!staffEmployees.length) staffEmployees.push(employee);

      for (const staff of staffEmployees) {
        const slotConflict = getAppointmentConflict({
          employee: staff,
          date,
          interval,
          appointments,
          diagnosticPeriods,
          absences,
          roomId: moving.room?.id,
          service,
          excludeAppointmentIds,
          joinGroupSessionId: moving.groupSessionId ?? undefined,
          excludeCoStaffSessionId: moving.coStaffSessionId ?? undefined,
        });
        if (slotConflict) return { ok: false, conflict: slotConflict };
      }

      const uniqueClients = [...new Set(members.map((member) => member.client.id))];
      for (const clientId of uniqueClients) {
        const clientConflict = getClientConflict({
          clientId,
          interval,
          appointments,
          excludeAppointmentIds,
        });
        if (clientConflict) return { ok: false, conflict: clientConflict };
      }

      return { ok: true, label: "доступно" };
    },
    [absences, appointments, date, diagnosticPeriods, employees],
  );

  const registerColumn = useCallback((employeeId: string) => (el: HTMLDivElement | null) => {
    if (el) columnRefs.current.set(employeeId, el);
    else columnRefs.current.delete(employeeId);
  }, []);

  const applyPointerPosition = useCallback(
    (clientX: number, clientY: number) => {
      const current = movingRef.current;
      if (!current) return;

      const duration = current.appointment.endMin - current.appointment.startMin;
      const columns = employees
        .map((employee) => ({ employee, rect: columnRefs.current.get(employee.id)?.getBoundingClientRect() }))
        .filter((item): item is { employee: Employee; rect: DOMRect } => !!item.rect);

      if (columns.length === 0) return;

      const gridLeft = Math.min(...columns.map((item) => item.rect.left));
      const gridRight = Math.max(...columns.map((item) => item.rect.right));
      const boundedColumn =
        clientX < gridLeft ? columns[0] : clientX > gridRight ? columns[columns.length - 1] : null;

      const updateOutOfBounds = (employee: Employee, rect: DOMRect) => {
        const y = clientY - rect.top;
        const raw = rangeStart + Math.floor(y / ROW_H) * SLOT_MIN;
        const startMin = Math.max(rangeStart, Math.min(rangeEnd - duration, raw));

        setDragProbe({ employeeId: employee.id, startMin });
        setDragOutOfBounds(true);
        dropAllowedRef.current = false;
      };

      if (boundedColumn) {
        updateOutOfBounds(boundedColumn.employee, boundedColumn.rect);
        return;
      }

      const lockEmployeeId = current.appointment.coStaffSessionId
        ? current.appointment.employee.id
        : null;

      const hoveredColumn = columns.find(({ rect }) => clientX >= rect.left && clientX <= rect.right);
      const activeColumn =
        lockEmployeeId
          ? columns.find((item) => item.employee.id === lockEmployeeId) ?? hoveredColumn
          : hoveredColumn;

      if (!activeColumn) {
        setDragProbe(null);
        setDragOutOfBounds(true);
        dropAllowedRef.current = false;
        return;
      }

      const y = clientY - activeColumn.rect.top;
      const raw = rangeStart + Math.floor(y / ROW_H) * SLOT_MIN;
      const startMin = Math.max(rangeStart, Math.min(rangeEnd - duration, raw));

      if (y < 0 || y > activeColumn.rect.height) {
        updateOutOfBounds(activeColumn.employee, activeColumn.rect);
        return;
      }

      const target = moveTarget(
        activeColumn.employee,
        startMin,
        current.appointment,
        current.groupMembers,
      );
      setDragProbe({ employeeId: activeColumn.employee.id, startMin });
      setDragOutOfBounds(false);
      dropAllowedRef.current = target.ok;

      if (target.ok) {
        const moved =
          startMin !== current.appointment.startMin ||
          activeColumn.employee.id !== current.appointment.employee.id;
        const next = {
          ...current,
          employeeId: activeColumn.employee.id,
          startMin,
          moved: current.moved || moved,
        };
        movingRef.current = next;
        setMoveAppt(next);
      }
    },
    [employees, moveTarget, rangeEnd, rangeStart],
  );

  const clearDragState = useCallback(() => {
    movingRef.current = null;
    pendingRef.current = null;
    dragActivatedRef.current = false;
    dropAllowedRef.current = true;
    setMoveAppt(null);
    setDragProbe(null);
    setDragOutOfBounds(false);
  }, []);

  const activateDrag = useCallback((pending: PendingPointer) => {
    const next: MovingAppointment = {
      appointment: pending.appointment,
      groupMembers: pending.groupMembers,
      employeeId: pending.employeeId,
      startMin: pending.appointment.startMin,
      moved: false,
    };

    dragActivatedRef.current = true;
    dropAllowedRef.current = true;
    movingRef.current = next;
    setDragProbe({ employeeId: pending.employeeId, startMin: pending.appointment.startMin });
    setDragOutOfBounds(false);
    setMoveAppt(next);
  }, []);

  const finishDrag = useCallback(() => {
    const pending = pendingRef.current;
    const current = movingRef.current;

    if (!dragActivatedRef.current && pending) {
      if (pending.groupMembers?.length) {
        onEditGroup?.(pending.groupMembers);
      } else {
        onEditAppointment(pending.appointment);
      }
      clearDragState();
      return;
    }

    if (!current) {
      clearDragState();
      return;
    }

    if (current.moved && dropAllowedRef.current) {
      onMoveAppointment(current.appointment.id, current.employeeId, current.startMin);
    }

    clearDragState();
  }, [clearDragState, onEditAppointment, onEditGroup, onMoveAppointment]);

  useEffect(() => {
    if (!listening) return;

    const onMove = (event: PointerEvent) => {
      const currentPending = pendingRef.current;
      if (!currentPending) return;

      if (!dragActivatedRef.current) {
        if (currentPending.appointment.diagnosticPeriodId) return;
        const dx = event.clientX - currentPending.startX;
        const dy = event.clientY - currentPending.startY;
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
        activateDrag(currentPending);
      }

      applyPointerPosition(event.clientX, event.clientY);
    };

    const onUp = (event: Event) => {
      if (event instanceof MouseEvent && event.button !== 0) {
        clearDragState();
        setListening(false);
        return;
      }
      finishDrag();
      setListening(false);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("pointerup", onUp);
    };
  }, [activateDrag, applyPointerPosition, finishDrag, listening]);

  const startDrag = useCallback(
    (
      appointment: Appointment,
      employeeId: string,
      event: MouseEvent<HTMLElement>,
      options?: { groupMembers?: Appointment[] },
    ) => {
      if (event.button !== 0) return;
      event.stopPropagation();
      event.preventDefault();

      pendingRef.current = {
        appointment,
        groupMembers: options?.groupMembers,
        employeeId,
        startX: event.clientX,
        startY: event.clientY,
      };
      dragActivatedRef.current = false;
      dropAllowedRef.current = true;
      setMoveAppt(null);
      setDragProbe(null);
      setDragOutOfBounds(false);
      setListening(true);
    },
    [],
  );

  const isDraggingAppointment = useCallback(
    (appointmentId: string) => {
      if (!moveAppt) return false;
      if (moveAppt.appointment.id === appointmentId) return true;
      if (moveAppt.groupMembers?.some((member) => member.id === appointmentId)) return true;
      if (moveAppt.appointment.coStaffSessionId) {
        return appointments.some(
          (item) =>
            item.id === appointmentId &&
            item.coStaffSessionId === moveAppt.appointment.coStaffSessionId,
        );
      }
      return false;
    },
    [appointments, moveAppt],
  );

  return {
    dragState: {
      moveAppt,
      dragProbe,
      dragOutOfBounds,
      dragging: !!moveAppt,
    },
    registerColumn,
    startDrag,
    moveTarget,
    isDraggingAppointment,
  };
}
