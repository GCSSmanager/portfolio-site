import { useState } from "react";
import type { MouseEvent } from "react";
import { isSlotBusy } from "../../lib/availability";
import type { Absence, Appointment, ClinicWorkDay, DiagnosticPeriod, Employee, Service } from "../../lib/types";
import type { SlotSuggestion } from "../../lib/slot-suggestions";
import { employeeShift, lunchInterval } from "../../lib/schedule";
import { scheduleDayBlocks } from "../../lib/schedule/dayBlocks";
import { features } from "../../lib/features";
import { clusterAppointmentsForColumn, resolveGroupJoinVisual } from "../../lib/group-sessions";
import { gridHeight, rangeTopPx, ROW_H } from "../../lib/schedule/coordinates";
import type { AppointmentDragState, MoveTarget } from "../../hooks/useAppointmentDrag";
import { scheduleStyles } from "./scheduleStyles";
import { GridLinesLayer } from "./GridLinesLayer";
import { MoveTargetsLayer } from "./MoveTargetsLayer";
import { SlotSuggestionsLayer } from "./SlotSuggestionsLayer";
import { LunchBlock } from "./LunchBlock";
import { AbsenceHourCells } from "./AbsenceHourCells";
import { AppointmentBlock } from "./AppointmentBlock";
import { GroupAppointmentBlock } from "./GroupAppointmentBlock";

interface Props {
  employee: Employee;
  date: string;
  slots: number[];
  rangeStart: number;
  rangeEnd: number;
  clinicDay?: ClinicWorkDay | null;
  appointments: Appointment[];
  dayAppointments: Appointment[];
  diagnosticPeriods: DiagnosticPeriod[];
  absences: Absence[];
  suggestions: SlotSuggestion[];
  highlightService?: Service | null;
  highlightClientId?: string;
  highlightClientBirthDate?: string | null;
  roomMode: "auto" | "fixed";
  readOnly?: boolean;
  allowOpen?: boolean;
  hoverSlot: { employeeId: string; startMin: number } | null;
  dragState: AppointmentDragState;
  registerColumn: (employeeId: string) => (element: HTMLDivElement | null) => void;
  startDrag: (
    appointment: Appointment,
    employeeId: string,
    event: MouseEvent<HTMLElement>,
    options?: { groupMembers?: Appointment[] },
  ) => void;
  isDraggingAppointment: (appointmentId: string) => boolean;
  moveTarget: (employee: Employee, startMin: number, movingAppointment: Appointment) => MoveTarget;
  onHoverSlot: (slot: { employeeId: string; startMin: number } | null) => void;
  onSelectSuggestion: (suggestion: SlotSuggestion) => void;
  onAddSlot?: (employee: Employee, startMin: number) => void;
  onOpenAppointment: (appointment: Appointment) => void;
  onOpenGroup: (appointments: Appointment[]) => void;
  onJoinGroup?: (appointments: Appointment[]) => void;
  onOpenAbsence?: (absence: Absence) => void;
}

export function EmployeeColumn({
  employee,
  date,
  slots,
  rangeStart,
  rangeEnd,
  clinicDay,
  appointments,
  dayAppointments,
  diagnosticPeriods,
  absences,
  suggestions,
  highlightService,
  highlightClientId = "",
  highlightClientBirthDate,
  roomMode,
  readOnly = false,
  allowOpen = false,
  hoverSlot,
  dragState,
  registerColumn,
  startDrag,
  isDraggingAppointment,
  moveTarget,
  onHoverSlot,
  onSelectSuggestion,
  onAddSlot,
  onOpenAppointment,
  onOpenGroup,
  onJoinGroup,
  onOpenAbsence,
}: Props) {
  const [hoverApptId, setHoverApptId] = useState<string | null>(null);
  const [hoverGroupId, setHoverGroupId] = useState<string | null>(null);
  const shift = employeeShift(employee, date);
  const lunch = lunchInterval(shift);
  const blockedIntervals = blockedWorkIntervals(rangeStart, rangeEnd, shift, clinicDay);
  const hasWorkWindow = blockedIntervals.some((interval) => interval.startMin === rangeStart && interval.endMin === rangeEnd);
  const dayBlocks = scheduleDayBlocks({
    employeeId: employee.id,
    date,
    absences,
    diagnosticPeriods,
    shift,
    rangeStart,
    rangeEnd,
    clinicDay,
  });
  const workWindow = workInterval(rangeStart, rangeEnd, shift, clinicDay);
  // В parallel диагностика не в busy; в windows/day — блокирует клики.
  const busyIntervals = [
    ...appointments.map((appointment) => ({ startMin: appointment.startMin, endMin: appointment.endMin })),
    ...(lunch ? [lunch] : []),
    ...dayBlocks
      .filter((block) => (features.diagnosticBookingMode === "parallel" ? !block.isDiagnostic : true))
      .map((block) => ({ startMin: block.startMin, endMin: block.endMin })),
  ];
  const canAddSlots = !!onAddSlot && !!workWindow && !dragState.dragging;

  return (
    <div
      ref={registerColumn(employee.id)}
      className={scheduleStyles.column}
      style={{ height: gridHeight(rangeStart, rangeEnd) }}
      onMouseLeave={() => {
        if (!dragState.dragging) onHoverSlot(null);
      }}
    >
      <GridLinesLayer slots={slots} rangeStart={rangeStart} />

      {blockedIntervals.map((interval) => (
        <LunchBlock key={`${interval.startMin}-${interval.endMin}`} lunch={interval} rangeStart={rangeStart} label={interval.label} />
      ))}
      {dragState.moveAppt && !shift && <div className={scheduleStyles.noShiftDrag}>нет смены</div>}

      {dragState.moveAppt && shift && (
        <MoveTargetsLayer
          employee={employee}
          slots={slots}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          dragState={dragState}
          moveTarget={moveTarget}
        />
      )}

      {!dragState.moveAppt && highlightService && shift && (
        <SlotSuggestionsLayer
          employeeId={employee.id}
          service={highlightService}
          suggestions={suggestions}
          rangeStart={rangeStart}
          roomMode={roomMode}
          hoverSlot={hoverSlot}
          onHoverSlot={onHoverSlot}
          onSelect={onSelectSuggestion}
        />
      )}

      {canAddSlots &&
        workWindow &&
        slots
          .filter(
            (min) =>
              min >= workWindow.startMin &&
              min < workWindow.endMin &&
              !isSlotBusy(min, busyIntervals),
          )
          .map((min) => (
            <button
              key={`add-slot-${employee.id}-${min}`}
              type="button"
              tabIndex={-1}
              className="absolute left-0 right-0 z-[2] cursor-pointer border-0 bg-transparent p-0 outline-none hover:bg-surface/30 focus:outline-none"
              style={{ top: rangeTopPx(min, rangeStart), height: ROW_H }}
              onMouseDown={(event) => event.preventDefault()}
              onClick={(event) => {
                event.stopPropagation();
                onAddSlot?.(employee, min);
              }}
            />
          ))}

      {lunch && !hasWorkWindow && <LunchBlock lunch={lunch} rangeStart={rangeStart} />}

      {dayBlocks.map((block) => {
        if (block.absenceId) {
          const absence = absences.find((item) => item.id === block.absenceId);
          return (
            <AbsenceHourCells
              key={block.absenceId}
              startMin={block.startMin}
              endMin={block.endMin}
              rangeStart={rangeStart}
              label={block.label}
              onOpen={
                onOpenAbsence && absence
                  ? () => onOpenAbsence(absence)
                  : undefined
              }
            />
          );
        }
        return (
          <AbsenceHourCells
            key={`${block.label}-${block.startMin}-${block.endMin}`}
            startMin={block.startMin}
            endMin={block.endMin}
            rangeStart={rangeStart}
            label={block.label}
            tone="diagnostic"
            hideLabelOver={appointments.map((appointment) => ({
              startMin: appointment.startMin,
              endMin: appointment.endMin,
            }))}
          />
        );
      })}

      {clusterAppointmentsForColumn(appointments)
        .filter((item) => {
          if (item.kind === "single") return !isDraggingAppointment(item.appointment.id);
          return !item.appointments.some((member) => isDraggingAppointment(member.id));
        })
        .map((item) => {
          if (item.kind === "group") {
            const joinHighlight =
              !readOnly && onJoinGroup
                ? resolveGroupJoinVisual({
                    highlightService,
                    highlightClientId,
                    highlightClientBirthDate,
                    members: item.appointments,
                    dayAppointments,
                  })
                : null;
            return (
              <GroupAppointmentBlock
                key={item.groupSessionId}
                appointments={item.appointments}
                rangeStart={rangeStart}
                isDragLocked={dragState.dragging}
                isHover={hoverGroupId === item.groupSessionId}
                readOnly={readOnly}
                allowOpen={allowOpen}
                joinHighlight={joinHighlight}
                onHover={setHoverGroupId}
                onOpen={onOpenGroup}
                onJoin={onJoinGroup}
                onDragStart={(groupAppointments, event) => {
                  onHoverSlot(null);
                  const primary = groupAppointments[0]!;
                  startDrag(primary, employee.id, event, { groupMembers: groupAppointments });
                }}
              />
            );
          }

          const appointment = item.kind === "single" ? item.appointment : item.appointments[0]!;
          return (
            <AppointmentBlock
              key={appointment.id}
              appointment={appointment}
              diagnosticPeriods={diagnosticPeriods}
              rangeStart={rangeStart}
              isDragLocked={dragState.dragging}
              isHover={hoverApptId === appointment.id}
              readOnly={readOnly}
              allowOpen={allowOpen}
              onHover={(id) => setHoverApptId(id === appointment.id ? id : null)}
              onOpen={onOpenAppointment}
              onDragStart={(next, event) => {
                onHoverSlot(null);
                startDrag(next, employee.id, event);
              }}
            />
          );
        })}
    </div>
  );
}

function workInterval(
  rangeStart: number,
  rangeEnd: number,
  shift: ReturnType<typeof employeeShift>,
  clinicDay?: ClinicWorkDay | null,
) {
  if (!clinicDay?.isOpen || !shift) return null;
  const startMin = Math.max(rangeStart, clinicDay.startMin, shift.startMin);
  const endMin = Math.min(rangeEnd, clinicDay.endMin, shift.endMin);
  if (endMin <= startMin) return null;
  return { startMin, endMin };
}

function blockedWorkIntervals(
  rangeStart: number,
  rangeEnd: number,
  shift: ReturnType<typeof employeeShift>,
  clinicDay?: ClinicWorkDay | null,
) {
  const fullLabel = !clinicDay?.isOpen ? "клиника закрыта" : "нет смены";
  if (!clinicDay?.isOpen || !shift) return [{ startMin: rangeStart, endMin: rangeEnd, label: fullLabel }];

  const window = workInterval(rangeStart, rangeEnd, shift, clinicDay);
  if (!window) return [{ startMin: rangeStart, endMin: rangeEnd, label: "не работает" }];

  return [
    { startMin: rangeStart, endMin: window.startMin, label: "не работает" },
    { startMin: window.endMin, endMin: rangeEnd, label: "не работает" },
  ].filter((interval) => interval.endMin > interval.startMin);
}
