import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent, RefObject } from "react";
import type { Absence, Appointment, DiagnosticPeriod, Employee } from "../lib/types";
import { SLOT_MIN } from "../lib/time";
import { DEFAULT_CLIENT_SLOT_WIDTH } from "../lib/client-schedule-preferences";
import { checkClientScheduleSlot, type ClientScheduleSlotTarget } from "../lib/client-schedule-slot-check";

const DRAG_THRESHOLD_PX = 6;

export type ClientMoveTarget = ClientScheduleSlotTarget;

type MovingAppointment = {
  appointment: Appointment;
  groupMembers?: Appointment[];
  date: string;
  startMin: number;
  moved: boolean;
};

type PendingPointer = {
  appointment: Appointment;
  groupMembers?: Appointment[];
  date: string;
  startX: number;
  startY: number;
};

export type ClientAppointmentDragState = {
  moveAppt: MovingAppointment | null;
  dragProbe: { date: string; startMin: number } | null;
  dragOutOfBounds: boolean;
  dragging: boolean;
};

interface UseClientAppointmentDragParams {
  days: string[];
  employees: Employee[];
  appointmentsByDate: Map<string, Appointment[]>;
  diagnosticPeriodsByDate: Map<string, DiagnosticPeriod[]>;
  absences: Absence[];
  rangeStart: number;
  rangeEnd: number;
  slotWidth?: number;
  onMoveAppointment: (id: string, date: string, startMin: number) => void;
  onEditAppointment: (appointment: Appointment) => void;
  onEditGroup?: (appointments: Appointment[]) => void;
  interactionLockedRef?: RefObject<boolean>;
}

export function useClientAppointmentDrag({
  days,
  employees,
  appointmentsByDate,
  diagnosticPeriodsByDate,
  absences,
  rangeStart,
  rangeEnd,
  slotWidth = DEFAULT_CLIENT_SLOT_WIDTH,
  onMoveAppointment,
  onEditAppointment,
  onEditGroup,
  interactionLockedRef,
}: UseClientAppointmentDragParams) {
  const [moveAppt, setMoveAppt] = useState<MovingAppointment | null>(null);
  const [dragProbe, setDragProbe] = useState<ClientAppointmentDragState["dragProbe"]>(null);
  const [dragOutOfBounds, setDragOutOfBounds] = useState(false);
  const [listening, setListening] = useState(false);

  const movingRef = useRef<MovingAppointment | null>(null);
  const pendingRef = useRef<PendingPointer | null>(null);
  const dragActivatedRef = useRef(false);
  const dropAllowedRef = useRef(true);
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const resolveEmployee = useCallback(
    (appointment: Appointment): Employee | null =>
      employees.find((employee) => employee.id === appointment.employee.id) ?? null,
    [employees],
  );

  const moveTarget = useCallback(
    (date: string, startMin: number, moving: Appointment, groupMembers?: Appointment[]): ClientMoveTarget =>
      checkClientScheduleSlot({
        date,
        startMin,
        appointment: moving,
        groupMembers,
        excludeAppointmentId: moving.id,
        employee: resolveEmployee(moving),
        employees,
        appointmentsByDate,
        diagnosticPeriodsByDate,
        absences,
      }),
    [absences, appointmentsByDate, diagnosticPeriodsByDate, employees, resolveEmployee],
  );

  const registerRow = useCallback((date: string) => (el: HTMLDivElement | null) => {
    if (el) rowRefs.current.set(date, el);
    else rowRefs.current.delete(date);
  }, []);

  const applyPointerPosition = useCallback(
    (clientX: number, clientY: number) => {
      const current = movingRef.current;
      if (!current) return;

      const duration = current.appointment.endMin - current.appointment.startMin;
      const rows = days
        .map((date) => ({ date, rect: rowRefs.current.get(date)?.getBoundingClientRect() }))
        .filter((item): item is { date: string; rect: DOMRect } => !!item.rect);

      if (rows.length === 0) return;

      const gridTop = Math.min(...rows.map((item) => item.rect.top));
      const gridBottom = Math.max(...rows.map((item) => item.rect.bottom));
      const boundedRow =
        clientY < gridTop ? rows[0] : clientY > gridBottom ? rows[rows.length - 1] : null;

      const updateOutOfBounds = (date: string, rect: DOMRect) => {
        const x = clientX - rect.left;
        const raw = rangeStart + Math.floor(x / slotWidth) * SLOT_MIN;
        const startMin = Math.max(rangeStart, Math.min(rangeEnd - duration, raw));

        setDragProbe({ date, startMin });
        setDragOutOfBounds(true);
        dropAllowedRef.current = false;
      };

      if (boundedRow) {
        updateOutOfBounds(boundedRow.date, boundedRow.rect);
        return;
      }

      const hoveredRow = rows.find(({ rect }) => clientY >= rect.top && clientY <= rect.bottom);
      if (!hoveredRow) {
        setDragProbe(null);
        setDragOutOfBounds(true);
        dropAllowedRef.current = false;
        return;
      }

      const x = clientX - hoveredRow.rect.left;
      const raw = rangeStart + Math.floor(x / slotWidth) * SLOT_MIN;
      const startMin = Math.max(rangeStart, Math.min(rangeEnd - duration, raw));

      if (x < 0 || x > hoveredRow.rect.width) {
        updateOutOfBounds(hoveredRow.date, hoveredRow.rect);
        return;
      }

      const target = moveTarget(
        hoveredRow.date,
        startMin,
        current.appointment,
        current.groupMembers,
      );
      setDragProbe({ date: hoveredRow.date, startMin });
      setDragOutOfBounds(false);
      dropAllowedRef.current = target.ok;

      if (target.ok) {
        const moved =
          startMin !== current.appointment.startMin ||
          hoveredRow.date !== current.date;
        const next = {
          ...current,
          date: hoveredRow.date,
          startMin,
          moved: current.moved || moved,
        };
        movingRef.current = next;
        setMoveAppt(next);
      }
    },
    [days, moveTarget, rangeEnd, rangeStart, slotWidth],
  );

  const clearDragState = useCallback(() => {
    movingRef.current = null;
    pendingRef.current = null;
    dragActivatedRef.current = false;
    dropAllowedRef.current = true;
    setMoveAppt(null);
    setDragProbe(null);
    setDragOutOfBounds(false);
    setListening(false);
  }, []);

  const activateDrag = useCallback((pending: PendingPointer) => {
    const next: MovingAppointment = {
      appointment: pending.appointment,
      groupMembers: pending.groupMembers,
      date: pending.date,
      startMin: pending.appointment.startMin,
      moved: false,
    };

    dragActivatedRef.current = true;
    dropAllowedRef.current = true;
    movingRef.current = next;
    setDragProbe({ date: pending.date, startMin: pending.appointment.startMin });
    setDragOutOfBounds(false);
    setMoveAppt(next);
  }, []);

  const finishDrag = useCallback(() => {
    if (interactionLockedRef?.current) {
      clearDragState();
      return;
    }

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
      onMoveAppointment(current.appointment.id, current.date, current.startMin);
    }

    clearDragState();
  }, [clearDragState, interactionLockedRef, onEditAppointment, onEditGroup, onMoveAppointment]);

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
      date: string,
      event: MouseEvent<HTMLElement>,
      options?: { groupMembers?: Appointment[] },
    ) => {
      if (event.button !== 0) return;
      event.stopPropagation();
      event.preventDefault();

      pendingRef.current = {
        appointment,
        groupMembers: options?.groupMembers,
        date,
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
      return moveAppt.groupMembers?.some((member) => member.id === appointmentId) ?? false;
    },
    [moveAppt],
  );

  return {
    dragState: {
      moveAppt,
      dragProbe,
      dragOutOfBounds,
      dragging: !!moveAppt,
    },
    registerRow,
    startDrag,
    moveTarget,
    isDraggingAppointment,
    resetDrag: clearDragState,
  };
}
