import { minToTime } from "../../lib/format";
import type { Employee } from "../../lib/types";
import { timedBlockStyle } from "../../lib/schedule/coordinates";
import type { AppointmentDragState, MoveTarget } from "../../hooks/useAppointmentDrag";
import { moveTargetClass, moveTargetLabel, moveTargetLabelClass, moveTargetTimeClass } from "./scheduleStyles";

type MovingAppointment = NonNullable<AppointmentDragState["moveAppt"]>["appointment"];

interface Props {
  employee: Employee;
  slots: number[];
  rangeStart: number;
  rangeEnd: number;
  dragState: AppointmentDragState;
  moveTarget: (
    employee: Employee,
    startMin: number,
    movingAppointment: MovingAppointment,
    groupMembers?: MovingAppointment[],
  ) => MoveTarget;
}

export function MoveTargetsLayer({ employee, slots, rangeStart, rangeEnd, dragState, moveTarget }: Props) {
  if (!dragState.moveAppt) return null;

  const duration = dragState.moveAppt.appointment.endMin - dragState.moveAppt.appointment.startMin;
  const groupMembers = dragState.moveAppt.groupMembers;

  return (
    <>
      {slots.map((min) => {
        const target = moveTarget(employee, min, dragState.moveAppt!.appointment, groupMembers);
        const active = dragState.dragProbe?.employeeId === employee.id && dragState.dragProbe.startMin === min;
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
            key={`move-target-${employee.id}-${min}`}
            className={moveTargetClass(active, target.ok, activeInvalid)}
            style={timedBlockStyle(min, endMin, 2, rangeStart)}
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
