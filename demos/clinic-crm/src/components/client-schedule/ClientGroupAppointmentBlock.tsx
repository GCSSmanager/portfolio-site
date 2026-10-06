import type { Appointment } from "../../lib/types";
import { formatServiceName } from "../../lib/service-label";
import { minToTime } from "../../lib/format";
import { groupAgeRangeLabel } from "../../lib/group-age";
import { formatSpecialistNames } from "../../lib/group-sessions";
import { timedBlockStyleH } from "../../lib/schedule/coordinates";
import { useAppointmentPreview } from "../../hooks/useAppointmentPreview";
import { AttendanceDot } from "../AttendanceChoice";
import { AppointmentDetailsPreview } from "../schedule/AppointmentDetailsPreview";
import { scheduleStyles, scheduleZ } from "../schedule/scheduleStyles";

function clientAppointmentClass(isDragging: boolean, isHover: boolean) {
  return [
    scheduleStyles.appointment.replace("left-1 right-1 ", ""),
    isDragging ? "pointer-events-none" : "",
    isHover && !isDragging ? `${scheduleZ.appointmentHover} ring-2 ring-brand/50 shadow-lg` : `${scheduleZ.appointment} cursor-grab`,
  ].join(" ");
}

interface Props {
  appointments: Appointment[];
  groupSize: number;
  rangeStart: number;
  slotWidth: number;
  isDragLocked: boolean;
  isHover: boolean;
  onHover: (groupSessionId: string | null) => void;
  onDragStart: (appointments: Appointment[], event: React.MouseEvent<HTMLButtonElement>) => void;
}

export function ClientGroupAppointmentBlock({
  appointments,
  groupSize,
  rangeStart,
  slotWidth,
  isDragLocked,
  isHover,
  onHover,
  onDragStart,
}: Props) {
  const preview = useAppointmentPreview(isDragLocked);
  const primary = appointments[0]!;
  const ageLabel = groupAgeRangeLabel(primary.groupAgeRange);
  const style = {
    ...timedBlockStyleH(primary.startMin, primary.endMin, 1, rangeStart, slotWidth),
    top: 8,
    bottom: 8,
    height: "auto",
    background: `linear-gradient(160deg, ${primary.service.color}34, ${primary.service.color}12)`,
    borderLeft: `3px solid ${primary.service.color}`,
    boxShadow: isHover ? `0 4px 16px ${primary.service.color}30` : `0 2px 6px ${primary.service.color}15`,
  };

  return (
    <>
      <button
        type="button"
        ref={preview.setAnchorRef}
        className={clientAppointmentClass(isDragLocked, isHover)}
        style={style}
        onMouseEnter={() => {
          preview.previewHandlers.onMouseEnter();
          onHover(primary.groupSessionId ?? primary.id);
        }}
        onMouseLeave={() => {
          preview.previewHandlers.onMouseLeave();
          onHover(null);
        }}
        onContextMenu={preview.previewHandlers.onContextMenu}
        onMouseDown={(event) => {
          if (event.button !== 0) return;
          onDragStart(appointments, event);
        }}
      >
        <div className="pointer-events-none flex items-center gap-1.5">
          <div className="min-w-0 flex-1 truncate text-[11px] font-semibold leading-snug text-ink">
            {formatServiceName(primary.service)}
          </div>
          {ageLabel && (
            <span className="shrink-0 rounded-full border border-line bg-panel px-1.5 py-0.5 text-[9px] font-semibold tabular-nums text-ink">
              {ageLabel}
            </span>
          )}
          <span className="shrink-0 rounded-full bg-brand/15 px-1.5 py-0.5 text-[9px] font-semibold text-brand-dark">
            {groupSize}
          </span>
          <AttendanceDot clientNoShow={primary.clientNoShow} />
        </div>
        <div className="pointer-events-none truncate text-[10px] text-ink-muted">
          {minToTime(primary.startMin)} · {formatSpecialistNames(appointments)}
        </div>
      </button>
      <AppointmentDetailsPreview
        appointments={appointments}
        visible={preview.visible}
        position={preview.position}
        previewRef={preview.setPreviewRef}
      />
    </>
  );
}
