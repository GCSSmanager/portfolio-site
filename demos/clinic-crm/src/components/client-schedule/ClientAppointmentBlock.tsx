import { useEffect } from "react";
import type { Appointment, DiagnosticPeriod } from "../../lib/types";
import { formatServiceName } from "../../lib/service-label";
import { formatDiagnosticLabel } from "../../lib/schedule/dayBlocks";
import { minToTime } from "../../lib/format";
import { formatSpecialistNames } from "../../lib/group-sessions";
import { timedBlockStyleH } from "../../lib/schedule/coordinates";
import { CLIENT_COPY_APPOINTMENT_ATTR } from "../../lib/client-schedule-copy";
import { useAppointmentPreview } from "../../hooks/useAppointmentPreview";
import { AttendanceDot } from "../AttendanceChoice";
import { AppointmentDetailsPreview } from "../schedule/AppointmentDetailsPreview";
import { scheduleStyles, scheduleZ } from "../schedule/scheduleStyles";

function clientAppointmentClass(
  isPasteSource: boolean,
  isHover: boolean,
  pasteMode: boolean,
  locked = false,
) {
  return [
    scheduleStyles.appointment.replace("left-1 right-1 ", ""),
    pasteMode ? "pointer-events-none" : "",
    isPasteSource
      ? `${scheduleZ.appointmentHover} ring-2 ring-brand shadow-lg`
      : isHover && !pasteMode
        ? `${scheduleZ.appointmentHover} ring-2 ring-brand/50 shadow-lg`
        : `${scheduleZ.appointment} ${locked ? "cursor-pointer" : "cursor-grab"}`,
  ].join(" ");
}

interface Props {
  appointment: Appointment;
  /** Все строки мульти-штата (для подписи и превью). */
  coStaffMembers?: Appointment[];
  diagnosticPeriods?: DiagnosticPeriod[];
  rangeStart: number;
  slotWidth: number;
  pasteMode: boolean;
  isPasteSource: boolean;
  isHover: boolean;
  onHover: (id: string | null) => void;
  onDragStart: (appointment: Appointment, event: React.MouseEvent<HTMLButtonElement>) => void;
}

export function ClientAppointmentBlock({
  appointment,
  coStaffMembers,
  diagnosticPeriods = [],
  rangeStart,
  slotWidth,
  pasteMode,
  isPasteSource,
  isHover,
  onHover,
  onDragStart,
}: Props) {
  const preview = useAppointmentPreview(pasteMode);

  useEffect(() => {
    if (pasteMode) preview.hidePreview();
  }, [pasteMode, preview.hidePreview]);

  const members = coStaffMembers?.length ? coStaffMembers : [appointment];
  const specialistLabel = formatSpecialistNames(members);
  const isDiagnostic = !!appointment.diagnosticPeriodId;
  const title = isDiagnostic
    ? formatDiagnosticLabel(
        diagnosticPeriods.find((period) => period.id === appointment.diagnosticPeriodId)?.title,
        true,
      )
    : formatServiceName(appointment.service);

  const style = {
    ...timedBlockStyleH(appointment.startMin, appointment.endMin, 1, rangeStart, slotWidth),
    top: 8,
    bottom: 8,
    height: "auto",
    background: `linear-gradient(160deg, ${appointment.service.color}28, ${appointment.service.color}0c)`,
    borderLeft: `3px solid ${appointment.service.color}`,
    boxShadow: isHover || isPasteSource ? `0 4px 16px ${appointment.service.color}30` : `0 2px 6px ${appointment.service.color}15`,
  };

  return (
    <>
      <button
        type="button"
        ref={preview.setAnchorRef}
        {...{ [CLIENT_COPY_APPOINTMENT_ATTR]: appointment.id }}
        className={clientAppointmentClass(isPasteSource, isHover, pasteMode, isDiagnostic)}
        style={style}
        onMouseEnter={() => {
          if (!pasteMode) preview.previewHandlers.onMouseEnter();
          onHover(appointment.id);
        }}
        onMouseLeave={() => {
          if (!pasteMode) preview.previewHandlers.onMouseLeave();
          onHover(null);
        }}
        onContextMenu={preview.previewHandlers.onContextMenu}
        onMouseDown={(event) => {
          if (event.button !== 0 || pasteMode) return;
          onDragStart(appointment, event);
        }}
      >
        <div className="pointer-events-none flex items-start gap-1.5">
          <div className="min-w-0 flex-1 truncate text-[11px] font-semibold leading-snug text-ink">{title}</div>
          <AttendanceDot clientNoShow={appointment.clientNoShow} className="mt-1" />
        </div>
        <div className="pointer-events-none truncate text-[10px] text-ink-muted">
          {minToTime(appointment.startMin)} · {specialistLabel}
        </div>
        {appointment.room && (
          <div className="pointer-events-none mt-0.5 truncate text-[9px] text-ink-muted/70">{appointment.room.name}</div>
        )}
      </button>
      {!pasteMode && (
        <AppointmentDetailsPreview
          appointments={members}
          diagnosticPeriods={diagnosticPeriods}
          visible={preview.visible}
          position={preview.position}
          previewRef={preview.setPreviewRef}
        />
      )}
    </>
  );
}
