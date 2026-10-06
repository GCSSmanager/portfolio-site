import { minToTime } from "../../lib/format";
import { timedBlockStyleH } from "../../lib/schedule/coordinates";
import type { ClientAppointmentDragState, ClientMoveTarget } from "../../hooks/useClientAppointmentDrag";
import {
  moveTargetLabel,
  moveTargetLabelClass,
  moveTargetTimeClass,
  scheduleZ,
} from "../schedule/scheduleStyles";

function moveTargetClassH(active: boolean, ok: boolean, activeInvalid: boolean) {
  return [
    "absolute rounded-lg border pointer-events-none transition-all duration-75 top-1 bottom-1",
    active ? scheduleZ.dragTarget : "z-[6]",
    ok && !activeInvalid
      ? active
        ? "border-brand bg-brand-light shadow-[0_10px_24px_rgba(82,148,77,0.16)]"
        : "border-brand-soft bg-brand-light"
      : active
        ? "border-red-300 bg-red-50 shadow-[0_10px_24px_rgba(220,38,38,0.18)]"
        : "border-red-200 bg-red-50",
  ].join(" ");
}

type MovingAppointment = NonNullable<ClientAppointmentDragState["moveAppt"]>["appointment"];

interface Props {
  slots: number[];
  rangeStart: number;
  rangeEnd: number;
  slotWidth: number;
  dragState: ClientAppointmentDragState;
  moveTarget: (
    date: string,
    startMin: number,
    movingAppointment: MovingAppointment,
    groupMembers?: MovingAppointment[],
  ) => ClientMoveTarget;
  date: string;
}

export function ClientMoveTargetsLayer({ slots, rangeStart, rangeEnd, slotWidth, dragState, moveTarget, date }: Props) {
  if (!dragState.moveAppt) return null;

  const duration = dragState.moveAppt.appointment.endMin - dragState.moveAppt.appointment.startMin;
  const groupMembers = dragState.moveAppt.groupMembers;

  return (
    <>
      {slots.map((min) => {
        const target = moveTarget(date, min, dragState.moveAppt!.appointment, groupMembers);
        const active = dragState.dragProbe?.date === date && dragState.dragProbe.startMin === min;
        const activeInvalid = active && (dragState.dragOutOfBounds || !target.ok);
        const endMin = Math.min(min + duration, rangeEnd);
        const label = moveTargetLabel(
          activeInvalid,
          target.ok,
          target.ok ? null : target.conflict,
          dragState.dragOutOfBounds,
        );

        return (
          <div
            key={`move-target-${date}-${min}`}
            className={moveTargetClassH(active, target.ok, activeInvalid)}
            style={timedBlockStyleH(min, endMin, 2, rangeStart, slotWidth)}
          >
            {active && (
              <>
                <div className={moveTargetTimeClass(!activeInvalid && target.ok)}>
                  {minToTime(min)}–{minToTime(endMin)}
                </div>
                <div className={moveTargetLabelClass(!activeInvalid && target.ok)}>
                  {label}
                </div>
              </>
            )}
          </div>
        );
      })}
    </>
  );
}
