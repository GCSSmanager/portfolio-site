import { useCallback, useMemo, useState } from "react";
import type { Absence, Appointment, ClinicWorkDay, DiagnosticPeriod, Employee, Service } from "../lib/types";
import { buildSlots } from "../lib/time";
import type { SlotSuggestion } from "../lib/slot-suggestions";
import type { SlotDraft } from "../types/slot-draft";
import { hoursInDay } from "../lib/schedule/coordinates";
import { groupAppointmentsByEmployee, groupSuggestionsByEmployee } from "../lib/schedule/grouping";
import { slotSuggestionToDraft } from "../lib/schedule/draft";
import { fetchCoStaffSessionMembers } from "../lib/group-session-members";
import { useAppointmentDrag } from "../hooks/useAppointmentDrag";
import { weekdayFromDate } from "../lib/schedule";
import { ScheduleGridShell } from "./schedule/ScheduleGridShell";
import { EmployeeHeader } from "./schedule/EmployeeHeader";
import { TimeColumn } from "./schedule/TimeColumn";
import { EmployeeColumn } from "./schedule/EmployeeColumn";
import { scheduleStyles } from "./schedule/scheduleStyles";

interface Props {
  date: string;
  employees: Employee[];
  appointments: Appointment[];
  diagnosticPeriods?: DiagnosticPeriod[];
  absences: Absence[];
  clinicDays?: ClinicWorkDay[];
  highlightService?: Service | null;
  highlightClientId?: string;
  highlightClientBirthDate?: string | null;
  slotSuggestions?: SlotSuggestion[];
  roomMode?: "auto" | "fixed";
  fixedRoomId?: string;
  readOnly?: boolean;
  allowAttendance?: boolean;
  /** Клик по слоту только для отметки отсутствия (специалист). */
  allowAbsenceOnly?: boolean;
  /** Клик по отсутствию — открыть редактирование. */
  allowOpenAbsence?: boolean;
  /** После клика по свободному окну можно сменить специалиста (фильтр по специальности). */
  suggestionAllowPickSlot?: boolean;
  columnWidth: number;
  onSlotAction: (draft: SlotDraft) => void;
  onMoveAppointment: (id: string, employeeId: string, startMin: number) => void;
  onOpenGroup: (appointments: Appointment[]) => void;
  onJoinGroup?: (appointments: Appointment[]) => void;
}

export function ScheduleGrid({
  date,
  employees,
  appointments,
  diagnosticPeriods = [],
  absences,
  clinicDays = [],
  highlightService,
  highlightClientId = "",
  highlightClientBirthDate,
  slotSuggestions = [],
  roomMode = "auto",
  fixedRoomId = "",
  readOnly = false,
  allowAttendance = false,
  allowAbsenceOnly = false,
  allowOpenAbsence = false,
  suggestionAllowPickSlot = false,
  columnWidth,
  onSlotAction,
  onMoveAppointment,
  onOpenGroup,
  onJoinGroup,
}: Props) {
  const gridRange = useMemo(() => clinicGridRange(clinicDays), [clinicDays]);
  const slots = useMemo(() => buildSlots(gridRange.startMin, gridRange.endMin), [gridRange]);
  const hours = useMemo(() => hoursInDay(gridRange.startMin, gridRange.endMin), [gridRange]);
  const clinicDay = useMemo(
    () => clinicDays.find((day) => day.weekday === weekdayFromDate(date)) ?? null,
    [clinicDays, date],
  );
  const [hoverSlot, setHoverSlot] = useState<{ employeeId: string; startMin: number } | null>(null);

  const appointmentsByEmployee = useMemo(() => groupAppointmentsByEmployee(appointments), [appointments]);
  const suggestionsByEmployee = useMemo(() => groupSuggestionsByEmployee(slotSuggestions), [slotSuggestions]);

  const onSlotClick = useCallback(
    (suggestion: SlotSuggestion) => {
      if (readOnly || !highlightService) return;
      onSlotAction(
        slotSuggestionToDraft(suggestion, date, highlightService, highlightClientId || undefined, {
          allowPickSlot: suggestionAllowPickSlot,
        }),
      );
    },
    [date, highlightClientId, highlightService, onSlotAction, readOnly, suggestionAllowPickSlot],
  );

  const onAddSlot = useCallback(
    (employee: Employee, startMin: number) => {
      if (readOnly && !allowAbsenceOnly) return;
      if (allowAbsenceOnly) {
        onSlotAction({
          employeeId: employee.id,
          employeeName: employee.shortName,
          date,
          startMin,
          endMin: startMin + 60,
          absenceOnly: true,
        });
        return;
      }
      onSlotAction({
        employeeId: employee.id,
        employeeName: employee.shortName,
        date,
        startMin,
        serviceId: highlightService?.id,
        roomId: fixedRoomId || undefined,
        clientId: highlightClientId || undefined,
        allowPickSlot: true,
      });
    },
    [
      allowAbsenceOnly,
      date,
      fixedRoomId,
      highlightClientId,
      highlightService?.id,
      onSlotAction,
      readOnly,
    ],
  );

  const canOpenAppointments = !readOnly || allowAttendance;

  const openAbsence = useCallback(
    (absence: Absence) => {
      if (!allowOpenAbsence) return;
      const employee = employees.find((item) => item.id === absence.employeeId);
      const startMin = absence.startMin ?? gridRange.startMin;
      const endMin = absence.endMin ?? startMin + 60;
      onSlotAction({
        employeeId: absence.employeeId,
        employeeName: employee?.shortName ?? "",
        date,
        startMin,
        endMin,
        absence,
        absenceOnly: true,
      });
    },
    [allowOpenAbsence, date, employees, gridRange.startMin, onSlotAction],
  );

  const openAppointment = useCallback(
    async (appointment: Appointment) => {
      if (!canOpenAppointments) return;

      // Групповая услуга — всегда как занятие группы, даже если участник один
      // (иначе нет «+ Клиент» и нельзя добрать состав).
      if (appointment.groupSessionId && appointment.service.isGroup) {
        onOpenGroup([appointment]);
        return;
      }

      const employee = employees.find((item) => item.id === appointment.employee.id);
      const base = {
        employeeId: appointment.employee.id,
        employeeName: employee?.shortName ?? appointment.employee.shortName,
        date,
        startMin: appointment.startMin,
        attendanceOnly: allowAttendance && readOnly,
      };

      if (appointment.coStaffSessionId && !appointment.service.isGroup) {
        const members = await fetchCoStaffSessionMembers(appointment.coStaffSessionId, [appointment]);
        if (members.length > 1) {
          onSlotAction({
            ...base,
            endMin: appointment.endMin,
            serviceId: appointment.service.id,
            roomId: appointment.room?.id,
            clientId: appointment.client.id,
            appointment: members.find((item) => item.id === appointment.id) ?? members[0],
          });
          return;
        }
      }

      onSlotAction({
        ...base,
        appointment,
      });
    },
    [allowAttendance, canOpenAppointments, date, employees, onOpenGroup, onSlotAction, readOnly],
  );

  const openGroup = useCallback(
    (groupAppointments: Appointment[]) => {
      if (!canOpenAppointments) return;
      onOpenGroup(groupAppointments);
    },
    [canOpenAppointments, onOpenGroup],
  );

  const dragEnabled = !readOnly;
  const {
    dragState,
    registerColumn,
    startDrag,
    moveTarget,
    isDraggingAppointment,
  } = useAppointmentDrag({
    date,
    employees,
    appointments,
    diagnosticPeriods,
    absences,
    rangeStart: gridRange.startMin,
    rangeEnd: gridRange.endMin,
    onMoveAppointment: dragEnabled ? onMoveAppointment : () => {},
    onEditAppointment: dragEnabled ? openAppointment : () => {},
    onEditGroup: dragEnabled ? onOpenGroup : canOpenAppointments ? openGroup : undefined,
  });

  return (
    <ScheduleGridShell employees={employees} columnWidth={columnWidth}>
      <div className={scheduleStyles.headerCorner} />
      {employees.map((employee) => (
        <EmployeeHeader key={employee.id} employee={employee} />
      ))}

      <TimeColumn slots={slots} hours={hours} rangeStart={gridRange.startMin} rangeEnd={gridRange.endMin} />
      {employees.map((employee) => (
        <EmployeeColumn
          key={employee.id}
          employee={employee}
          date={date}
          slots={slots}
          rangeStart={gridRange.startMin}
          rangeEnd={gridRange.endMin}
          clinicDay={clinicDay}
          appointments={appointmentsByEmployee.get(employee.id) ?? []}
          dayAppointments={appointments}
          diagnosticPeriods={diagnosticPeriods}
          absences={absences}
          suggestions={suggestionsByEmployee.get(employee.id) ?? []}
          highlightService={readOnly ? null : highlightService}
          highlightClientId={highlightClientId}
          highlightClientBirthDate={highlightClientBirthDate}
          roomMode={roomMode}
          readOnly={readOnly}
          allowOpen={allowAttendance}
          onOpenAppointment={openAppointment}
          onOpenGroup={openGroup}
          onJoinGroup={readOnly ? undefined : onJoinGroup}
          hoverSlot={hoverSlot}
          dragState={dragState}
          registerColumn={registerColumn}
          startDrag={startDrag}
          isDraggingAppointment={isDraggingAppointment}
          moveTarget={moveTarget}
          onHoverSlot={setHoverSlot}
          onSelectSuggestion={onSlotClick}
          onAddSlot={readOnly && !allowAbsenceOnly ? undefined : onAddSlot}
          onOpenAbsence={allowOpenAbsence ? openAbsence : undefined}
        />
      ))}
    </ScheduleGridShell>
  );
}

function clinicGridRange(clinicDays: ClinicWorkDay[]) {
  const openDays = clinicDays.filter((day) => day.isOpen);
  if (openDays.length === 0) return { startMin: 540, endMin: 1080 };
  return {
    startMin: Math.min(...openDays.map((day) => day.startMin)),
    endMin: Math.max(...openDays.map((day) => day.endMin)),
  };
}
