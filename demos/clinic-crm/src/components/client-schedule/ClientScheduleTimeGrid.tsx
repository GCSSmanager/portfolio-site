import { useEffect, useMemo, useRef, useState } from "react";
import { parseISO } from "date-fns";
import type { Appointment } from "../../lib/types";
import { buildSlots } from "../../lib/time";
import {
  CLIENT_ROW_H,
  DAY_LABEL_W,
  gridWidth,
  hoursAcross,
} from "../../lib/schedule/coordinates";
import { formatClientScheduleDayLabel } from "../client-schedule-toolbar";
import { scheduleStyles } from "../schedule/scheduleStyles";
import { useClientAppointmentDrag } from "../../hooks/useClientAppointmentDrag";
import { useClientAppointmentPaste } from "../../hooks/useClientAppointmentPaste";
import type { Absence, ClinicWorkDay, DiagnosticPeriod, Employee, Room, Service } from "../../lib/types";
import { buildSlotSuggestions, pickUniqueSuggestionsByTime, type SlotSuggestion } from "../../lib/slot-suggestions";
import { overlaps } from "../../lib/availability";
import { getClientConflict } from "../../lib/conflicts";
import { clientFitsGroupAgeRange, groupAgeRangeLabel } from "../../lib/group-age";
import {
  buildGroupSizeBySessionId,
  clientAlreadyInGroup,
  findOpenGroupSessions,
} from "../../lib/group-sessions";
import { parseStaffFilter } from "../../lib/staff-filter";
import { findClientCopyAppointmentId } from "../../lib/client-schedule-copy";
import { isCopyShortcut, isEditableTarget, isUndoShortcut } from "../../lib/keyboard-shortcuts";
import { isConfirmOpen } from "../../lib/overlay-stack";
import { ClientDayRow } from "./ClientDayRow";
import type { ClientJoinableGroup } from "./ClientJoinableGroupBlock";
import { ClientGridCorner, ClientTimeHeader, clientGridTemplate } from "./ClientTimeHeader";

interface Props {
  days: string[];
  clientId: string;
  clientBirthDate?: string | null;
  activeDay: string;
  appointmentsByDate: Map<string, Appointment[]>;
  diagnosticPeriodsByDate: Map<string, DiagnosticPeriod[]>;
  absences: Absence[];
  employees: Employee[];
  rooms: Room[];
  clinicDays: ClinicWorkDay[];
  highlightService?: Service | null;
  employeeId?: string;
  roomId?: string;
  onSelectDay: (date: string) => void;
  onAdd: (date: string, startMin: number) => void;
  onPickSuggestion: (suggestion: SlotSuggestion, date: string) => void;
  onJoinGroup: (group: ClientJoinableGroup, date: string) => void;
  onMoveAppointment: (id: string, date: string, startMin: number) => void;
  onPasteAppointment: (payload: {
    date: string;
    startMin: number;
    clientId: string;
    employeeId: string;
    serviceId: string;
    roomId?: string;
    note?: string;
  }) => void;
  onEditAppointment: (appointment: Appointment) => void;
  onEditGroup: (appointments: Appointment[]) => void;
  onUndo: () => void;
  slotWidth: number;
}

function absencesForDate(absences: Absence[], date: string) {
  const day = parseISO(date);
  return absences.filter((absence) => {
    const start = parseISO(absence.startDate.slice(0, 10));
    const end = parseISO(absence.endDate.slice(0, 10));
    return day >= start && day <= end;
  });
}

function clinicGridRange(clinicDays: ClinicWorkDay[]) {
  const openDays = clinicDays.filter((day) => day.isOpen);
  if (openDays.length === 0) return { startMin: 540, endMin: 1080 };
  return {
    startMin: Math.min(...openDays.map((day) => day.startMin)),
    endMin: Math.max(...openDays.map((day) => day.endMin)),
  };
}

export function ClientScheduleTimeGrid({
  days,
  clientId,
  clientBirthDate,
  activeDay,
  appointmentsByDate,
  diagnosticPeriodsByDate,
  absences,
  employees,
  rooms,
  clinicDays,
  highlightService,
  employeeId = "",
  roomId = "",
  onSelectDay,
  onAdd,
  onPickSuggestion,
  onJoinGroup,
  onMoveAppointment,
  onPasteAppointment,
  onEditAppointment,
  onEditGroup,
  onUndo,
  slotWidth,
}: Props) {
  const [hoverSlot, setHoverSlot] = useState<{ date: string; startMin: number } | null>(null);
  const pointerRef = useRef({ x: -1, y: -1 });
  const pasteActiveRef = useRef(false);
  const gridRange = useMemo(() => clinicGridRange(clinicDays), [clinicDays]);
  const slots = useMemo(() => buildSlots(gridRange.startMin, gridRange.endMin), [gridRange]);
  const hours = useMemo(() => hoursAcross(gridRange.startMin, gridRange.endMin), [gridRange]);

  const groupSizeBySessionId = useMemo(() => {
    const allAppointments: Appointment[] = [];
    for (const appointments of appointmentsByDate.values()) allAppointments.push(...appointments);
    return buildGroupSizeBySessionId(allAppointments);
  }, [appointmentsByDate]);

  const clientAppointmentsByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const date of days) {
      map.set(
        date,
        (appointmentsByDate.get(date) ?? []).filter(
          (appointment) => appointment.client.id === clientId && appointment.status !== "CANCELLED",
        ),
      );
    }
    return map;
  }, [appointmentsByDate, clientId, days]);

  const appointmentById = useMemo(() => {
    const map = new Map<string, Appointment>();
    for (const appointments of clientAppointmentsByDate.values()) {
      for (const appointment of appointments) map.set(appointment.id, appointment);
    }
    return map;
  }, [clientAppointmentsByDate]);

  const staffFilter = useMemo(() => parseStaffFilter(employeeId), [employeeId]);

  const joinableGroupsByDate = useMemo(() => {
    const map = new Map<string, ClientJoinableGroup[]>();
    if (!highlightService?.isGroup) return map;

    for (const date of days) {
      const dayAppointments = appointmentsByDate.get(date) ?? [];
      const groups = findOpenGroupSessions({
        appointments: dayAppointments,
        serviceId: highlightService.id,
        employeeId: staffFilter.employeeId,
        date,
      })
        .filter((group) => {
          if (!staffFilter.specialtyId) return true;
          const employee = employees.find((item) => item.id === group.appointment.employee.id);
          return employee?.specialtyId === staffFilter.specialtyId;
        })
        .filter((group) => !clientAlreadyInGroup(clientId, group.members))
        .filter((group) =>
          clientFitsGroupAgeRange(clientBirthDate, group.appointment.groupAgeRange, date),
        )
        .filter(
          (group) =>
            !getClientConflict({
              clientId,
              interval: { startMin: group.appointment.startMin, endMin: group.appointment.endMin },
              appointments: dayAppointments.filter(
                (appointment) => appointment.groupSessionId !== group.groupSessionId,
              ),
            }),
        )
        .map(
          (group) =>
            ({
              groupSessionId: group.groupSessionId,
              startMin: group.appointment.startMin,
              endMin: group.appointment.endMin,
              employeeId: group.appointment.employee.id,
              employeeName: group.appointment.employee.shortName,
              roomName: group.appointment.room?.name,
              groupSize: group.members.length,
              groupAgeRangeLabel: groupAgeRangeLabel(group.appointment.groupAgeRange) || undefined,
              joinHighlight: "available",
            }) satisfies ClientJoinableGroup,
        );

      if (groups.length) map.set(date, groups);
    }

    return map;
  }, [appointmentsByDate, clientBirthDate, clientId, days, employees, highlightService, staffFilter]);

  const suggestionsByDate = useMemo(() => {
    const map = new Map<string, SlotSuggestion[]>();
    if (!highlightService) return map;
    for (const date of days) {
      const dayAppointments = appointmentsByDate.get(date) ?? [];
      const joinable = joinableGroupsByDate.get(date) ?? [];
      const suggestions = pickUniqueSuggestionsByTime(
        buildSlotSuggestions({
          date,
          employees,
          appointments: dayAppointments,
          diagnosticPeriods: diagnosticPeriodsByDate.get(date) ?? [],
          absences: absencesForDate(absences, date),
          rooms,
          service: highlightService,
          roomId: roomId || undefined,
          employeeId: staffFilter.employeeId,
          specialtyId: staffFilter.specialtyId,
          clientId,
          clientBirthDate,
          limit: 500,
        }),
      ).filter((suggestion) => {
        const interval = { startMin: suggestion.startMin, endMin: suggestion.endMin };
        if (getClientConflict({ clientId, interval, appointments: dayAppointments })) return false;
        return !joinable.some((group) =>
          overlaps(interval, { startMin: group.startMin, endMin: group.endMin }),
        );
      });
      map.set(date, suggestions);
    }
    return map;
  }, [
    absences,
    appointmentsByDate,
    clientBirthDate,
    clientId,
    days,
    diagnosticPeriodsByDate,
    staffFilter,
    employees,
    highlightService,
    joinableGroupsByDate,
    roomId,
    rooms,
  ]);

  const {
    dragState,
    registerRow,
    startDrag,
    moveTarget,
    isDraggingAppointment,
    resetDrag,
  } = useClientAppointmentDrag({
    days,
    employees,
    appointmentsByDate,
    diagnosticPeriodsByDate,
    absences,
    rangeStart: gridRange.startMin,
    rangeEnd: gridRange.endMin,
    slotWidth,
    onMoveAppointment,
    onEditAppointment,
    onEditGroup,
    interactionLockedRef: pasteActiveRef,
  });

  const {
    pasteState,
    pasteTarget,
    copy,
    cancel: cancelPaste,
    confirmPaste,
    active: pasteActive,
  } = useClientAppointmentPaste({
    employees,
    appointmentsByDate,
    diagnosticPeriodsByDate,
    absences,
    onPasteAppointment,
  });

  pasteActiveRef.current = pasteActive;

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      pointerRef.current = { x: event.clientX, y: event.clientY };
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;

      if (isUndoShortcut(event)) {
        if (dragState.dragging || pasteActive || isConfirmOpen()) return;
        event.preventDefault();
        onUndo();
        return;
      }

      if (!isCopyShortcut(event)) return;
      if (dragState.dragging) return;

      if (pasteActive) {
        event.preventDefault();
        cancelPaste();
        return;
      }

      const { x, y } = pointerRef.current;
      if (x < 0) return;

      const appointmentId = findClientCopyAppointmentId(x, y);
      if (!appointmentId) return;

      const source = appointmentById.get(appointmentId);
      if (!source || source.groupSessionId || source.status === "CANCELLED") return;

      event.preventDefault();
      resetDrag();
      copy(source);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [appointmentById, cancelPaste, copy, dragState.dragging, onUndo, pasteActive, resetDrag]);

  if (!days.length) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-surface/40 px-6 py-12 text-center text-sm text-ink-muted">
        Укажите корректный период.
      </div>
    );
  }

  return (
    <div className={scheduleStyles.shell}>
      <div className={scheduleStyles.scroll}>
        <div
          className={scheduleStyles.grid}
          style={{ gridTemplateColumns: clientGridTemplate(gridRange.startMin, gridRange.endMin, slotWidth) }}
        >
          <ClientGridCorner />
          <ClientTimeHeader
            hours={hours}
            rangeStart={gridRange.startMin}
            rangeEnd={gridRange.endMin}
            slotWidth={slotWidth}
          />

          {days.map((date) => {
            const label = formatClientScheduleDayLabel(date);
            const selected = activeDay === date;
            const appointments = clientAppointmentsByDate.get(date) ?? [];

            return (
              <div key={date} className="contents">
                <button
                  type="button"
                  className={[
                    "flex flex-col items-center justify-center border-t border-r border-line px-0.5 py-1 text-center transition-colors",
                    selected ? "bg-brand-light" : "bg-panel hover:bg-surface/80",
                  ].join(" ")}
                  style={{ width: DAY_LABEL_W, minHeight: CLIENT_ROW_H }}
                  onClick={() => onSelectDay(date)}
                  aria-pressed={selected}
                  aria-label={`Автоподбор на ${label.short}`}
                >
                  <div
                    className={[
                      "text-[11px] font-semibold tabular-nums leading-tight",
                      selected ? "text-brand-dark" : "text-ink",
                    ].join(" ")}
                  >
                    {label.short}
                  </div>
                  <div className="text-[9px] uppercase leading-tight text-ink-muted">{label.weekday}</div>
                  {label.isToday && <div className="mt-0.5 h-1 w-1 rounded-full bg-brand" aria-hidden />}
                </button>

                <ClientDayRow
                  date={date}
                  appointments={appointments}
                  diagnosticPeriods={diagnosticPeriodsByDate.get(date) ?? []}
                  slots={slots}
                  rangeStart={gridRange.startMin}
                  rangeEnd={gridRange.endMin}
                  slotWidth={slotWidth}
                  active={selected}
                  highlightService={highlightService}
                  scheduleSlots={suggestionsByDate.get(date) ?? []}
                  joinableGroups={joinableGroupsByDate.get(date) ?? []}
                  hoverSlot={hoverSlot}
                  onHoverSlot={setHoverSlot}
                  onPickSlot={(suggestion) => {
                    setHoverSlot(null);
                    onPickSuggestion(suggestion, date);
                  }}
                  onJoinGroup={(group) => {
                    setHoverSlot(null);
                    onJoinGroup(group, date);
                  }}
                  dragState={dragState}
                  registerRow={registerRow}
                  startDrag={startDrag}
                  isDraggingAppointment={isDraggingAppointment}
                  moveTarget={moveTarget}
                  pasteState={pasteState}
                  pasteTarget={pasteTarget}
                  onPaste={confirmPaste}
                  onSelectDay={onSelectDay}
                  onAdd={(date, startMin) => {
                    setHoverSlot(null);
                    onAdd(date, startMin);
                  }}
                  groupSizeBySessionId={groupSizeBySessionId}
                />
              </div>
            );
          })}
        </div>
      </div>
      <div className="border-t border-line px-4 py-2 text-[11px] text-ink-muted">
        {pasteActive
          ? "Кликайте по зелёным слотам, чтобы добавить копии. Esc или Ctrl+C — выход."
          : highlightService?.isGroup
            ? "Пунктир — существующие группы (клик — добавить клиента). Зелёные окна — новые слоты. Ctrl+C — дублировать, Ctrl+Z — отменить."
            : highlightService
              ? "Зелёные окна — свободные слоты. Перетаскивайте записи для переноса. Ctrl+C — дублировать, Ctrl+Z — отменить."
              : "Перетаскивайте записи для переноса. Ctrl+C — дублировать, Ctrl+Z — отменить."}
      </div>
    </div>
  );
}

export { gridWidth };
