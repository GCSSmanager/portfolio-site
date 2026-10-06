import { useEffect, useState } from "react";
import type { MouseEvent } from "react";
import { isSlotBusy } from "../../lib/availability";
import type { Appointment, DiagnosticPeriod, Service } from "../../lib/types";
import { CLIENT_ROW_H, rangeLeftPx, verticalLineStyle } from "../../lib/schedule/coordinates";
import { clusterAppointmentsForClientDay } from "../../lib/group-sessions";
import type { SlotSuggestion } from "../../lib/slot-suggestions";
import type { ClientAppointmentDragState, ClientMoveTarget } from "../../hooks/useClientAppointmentDrag";
import type { ClientPasteState, ClientPasteTarget } from "../../hooks/useClientAppointmentPaste";
import { ClientMoveTargetsLayer } from "./ClientMoveTargetsLayer";
import { ClientPasteTargetsLayer } from "./ClientPasteTargetsLayer";
import { ClientSlotSuggestionsLayer } from "./ClientSlotSuggestionsLayer";
import { ClientAppointmentBlock } from "./ClientAppointmentBlock";
import { ClientGroupAppointmentBlock } from "./ClientGroupAppointmentBlock";
import { ClientJoinableGroupBlock, type ClientJoinableGroup } from "./ClientJoinableGroupBlock";

interface Props {
  date: string;
  appointments: Appointment[];
  diagnosticPeriods?: DiagnosticPeriod[];
  slots: number[];
  rangeStart: number;
  rangeEnd: number;
  slotWidth: number;
  active: boolean;
  highlightService?: Service | null;
  scheduleSlots?: SlotSuggestion[];
  joinableGroups?: ClientJoinableGroup[];
  hoverSlot: { date: string; startMin: number } | null;
  onHoverSlot: (slot: { date: string; startMin: number } | null) => void;
  onPickSlot: (suggestion: SlotSuggestion) => void;
  onJoinGroup?: (group: ClientJoinableGroup) => void;
  dragState: ClientAppointmentDragState;
  registerRow: (date: string) => (element: HTMLDivElement | null) => void;
  startDrag: (
    appointment: Appointment,
    date: string,
    event: MouseEvent<HTMLElement>,
    options?: { groupMembers?: Appointment[] },
  ) => void;
  isDraggingAppointment: (appointmentId: string) => boolean;
  moveTarget: (
    date: string,
    startMin: number,
    movingAppointment: Appointment,
    groupMembers?: Appointment[],
  ) => ClientMoveTarget;
  pasteState: ClientPasteState;
  pasteTarget: (date: string, startMin: number, source: Appointment) => ClientPasteTarget;
  onPaste: (date: string, startMin: number) => void;
  onSelectDay: (date: string) => void;
  onAdd: (date: string, startMin: number) => void;
  groupSizeBySessionId: Map<string, number>;
}

export function ClientDayRow({
  date,
  appointments,
  diagnosticPeriods = [],
  slots,
  rangeStart,
  rangeEnd,
  slotWidth,
  active,
  highlightService,
  scheduleSlots = [],
  joinableGroups = [],
  hoverSlot,
  onHoverSlot,
  onPickSlot,
  onJoinGroup,
  dragState,
  registerRow,
  startDrag,
  isDraggingAppointment,
  moveTarget,
  pasteState,
  pasteTarget,
  onPaste,
  onSelectDay,
  onAdd,
  groupSizeBySessionId,
}: Props) {
  const [hoverApptId, setHoverApptId] = useState<string | null>(null);
  const [hoverGroupId, setHoverGroupId] = useState<string | null>(null);
  const pasteMode = !!pasteState.template;
  const busyIntervals = appointments.map((appointment) => ({
    startMin: appointment.startMin,
    endMin: appointment.endMin,
  }));

  useEffect(() => {
    if (pasteMode) {
      setHoverApptId(null);
      setHoverGroupId(null);
    }
  }, [pasteMode]);

  return (
    <div
      ref={registerRow(date)}
      className={[
        "relative border-t border-line",
        active ? "bg-brand-light/20" : "",
      ].join(" ")}
      style={{ height: CLIENT_ROW_H }}
      onClick={() => {
        if (!pasteMode) onSelectDay(date);
      }}
      onMouseLeave={() => {
        if (!dragState.dragging && !pasteMode) onHoverSlot(null);
      }}
    >
      {slots.map((min) => (
        <div
          key={min}
          className={[
            "absolute top-0 bottom-0 border-l pointer-events-none",
            min % 60 === 0 ? "border-line/80" : "border-line/25",
          ].join(" ")}
          style={verticalLineStyle(min, rangeStart, slotWidth)}
        />
      ))}

      {dragState.moveAppt && (
        <ClientMoveTargetsLayer
          date={date}
          slots={slots}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          slotWidth={slotWidth}
          dragState={dragState}
          moveTarget={moveTarget}
        />
      )}

      {!dragState.moveAppt && !pasteState.template && highlightService && (
        <ClientSlotSuggestionsLayer
          date={date}
          service={highlightService}
          suggestions={scheduleSlots}
          rangeStart={rangeStart}
          slotWidth={slotWidth}
          hoverSlot={hoverSlot}
          onHoverSlot={onHoverSlot}
          onSelect={onPickSlot}
        />
      )}

      {!dragState.moveAppt &&
        !pasteState.template &&
        joinableGroups.map((group) => (
          <ClientJoinableGroupBlock
            key={`join-${group.groupSessionId}`}
            group={group}
            rangeStart={rangeStart}
            slotWidth={slotWidth}
            onJoin={() => onJoinGroup?.(group)}
          />
        ))}

      {clusterAppointmentsForClientDay(appointments)
        .filter((item) => {
          if (item.kind === "single") return !isDraggingAppointment(item.appointment.id);
          return !item.appointments.some((member) => isDraggingAppointment(member.id));
        })
        .map((item) =>
          item.kind === "group" ? (
            <ClientGroupAppointmentBlock
              key={item.groupSessionId}
              appointments={item.appointments}
              groupSize={groupSizeBySessionId.get(item.groupSessionId) ?? item.appointments.length}
              rangeStart={rangeStart}
              slotWidth={slotWidth}
              isDragLocked={dragState.dragging || pasteMode}
              isHover={hoverGroupId === item.groupSessionId}
              onHover={setHoverGroupId}
              onDragStart={(groupAppointments, event) => {
                event.stopPropagation();
                const primary = groupAppointments[0]!;
                startDrag(primary, date, event, { groupMembers: groupAppointments });
              }}
            />
          ) : item.kind === "coStaff" ? (
            <ClientAppointmentBlock
              key={item.coStaffSessionId}
              appointment={item.appointments[0]!}
              coStaffMembers={item.appointments}
              diagnosticPeriods={diagnosticPeriods}
              rangeStart={rangeStart}
              slotWidth={slotWidth}
              pasteMode={pasteMode}
              isPasteSource={item.appointments.some((member) => pasteState.template?.id === member.id)}
              isHover={item.appointments.some((member) => hoverApptId === member.id)}
              onHover={setHoverApptId}
              onDragStart={(appointment, event) => {
                event.stopPropagation();
                startDrag(appointment, date, event, { groupMembers: item.appointments });
              }}
            />
          ) : (
            <ClientAppointmentBlock
              key={item.appointment.id}
              appointment={item.appointment}
              diagnosticPeriods={diagnosticPeriods}
              rangeStart={rangeStart}
              slotWidth={slotWidth}
              pasteMode={pasteMode}
              isPasteSource={pasteState.template?.id === item.appointment.id}
              isHover={hoverApptId === item.appointment.id}
              onHover={setHoverApptId}
              onDragStart={(appointment, event) => {
                event.stopPropagation();
                startDrag(appointment, date, event);
              }}
            />
          ),
        )}

      {pasteState.template && !dragState.dragging && (
        <ClientPasteTargetsLayer
          date={date}
          slots={slots}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          slotWidth={slotWidth}
          pasteState={pasteState}
          pasteTarget={pasteTarget}
          onPaste={onPaste}
        />
      )}

      {!dragState.dragging &&
        !pasteMode &&
        slots
          .filter((min) => !isSlotBusy(min, busyIntervals))
          .map((min) => (
            <button
              key={`add-slot-${date}-${min}`}
              type="button"
              tabIndex={-1}
              className="absolute top-0 bottom-0 z-[2] cursor-pointer border-0 bg-transparent p-0 outline-none hover:bg-surface/25 focus:outline-none"
              style={{
                left: rangeLeftPx(min, rangeStart, slotWidth),
                width: slotWidth,
              }}
              onMouseDown={(event) => event.preventDefault()}
              onClick={(event) => {
                event.stopPropagation();
                onAdd(date, min);
              }}
            />
          ))}
    </div>
  );
}
