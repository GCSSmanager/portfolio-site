import type { Appointment, DiagnosticPeriod } from "../../lib/types";
import { formatServiceName } from "../../lib/service-label";
import { formatDiagnosticLabel } from "../../lib/schedule/dayBlocks";
import { heightPx, timedBlockStyle } from "../../lib/schedule/coordinates";
import { useAppointmentPreview } from "../../hooks/useAppointmentPreview";
import { AttendanceDot } from "../AttendanceChoice";
import { AppointmentDetailsPreview } from "./AppointmentDetailsPreview";
import { appointmentClass } from "./scheduleStyles";

interface Props {
  appointment: Appointment;
  diagnosticPeriods?: DiagnosticPeriod[];
  rangeStart: number;
  isDragLocked: boolean;
  isHover: boolean;
  readOnly?: boolean;
  allowOpen?: boolean;
  onHover: (id: string | null) => void;
  onDragStart: (appointment: Appointment, event: React.MouseEvent<HTMLButtonElement>) => void;
  onOpen?: (appointment: Appointment) => void;
}

function appointmentTitle(appointment: Appointment, diagnosticPeriods: DiagnosticPeriod[] = []) {
  if (!appointment.diagnosticPeriodId) return formatServiceName(appointment.service);
  const title = diagnosticPeriods.find((period) => period.id === appointment.diagnosticPeriodId)?.title;
  return formatDiagnosticLabel(title, true);
}

function AppointmentBody({
  appointment,
  title,
  pointerEventsNone = false,
}: {
  appointment: Appointment;
  title: string;
  pointerEventsNone?: boolean;
}) {
  const pe = pointerEventsNone ? "pointer-events-none" : "";
  return (
    <>
      <div className={["flex items-start gap-1.5", pe].join(" ")}>
        <div className="min-w-0 flex-1 truncate text-[11px] font-semibold leading-snug text-ink">{title}</div>
        <AttendanceDot clientNoShow={appointment.clientNoShow} className="mt-1" />
      </div>
      <div className={["truncate text-[10px] text-ink-muted", pe].join(" ")}>{appointment.client.fullName}</div>
      {heightPx(appointment.startMin, appointment.endMin) > 54 && appointment.room && (
        <div className={["mt-0.5 truncate text-[9px] text-ink-muted/70", pe].join(" ")}>{appointment.room.name}</div>
      )}
    </>
  );
}

export function AppointmentBlock({
  appointment,
  diagnosticPeriods = [],
  rangeStart,
  isDragLocked,
  isHover,
  readOnly = false,
  allowOpen = false,
  onHover,
  onDragStart,
  onOpen,
}: Props) {
  const preview = useAppointmentPreview(isDragLocked);
  const style = {
    ...timedBlockStyle(appointment.startMin, appointment.endMin, 1, rangeStart),
    background: `linear-gradient(160deg, ${appointment.service.color}28, ${appointment.service.color}0c)`,
    borderLeft: `3px solid ${appointment.service.color}`,
    boxShadow: isHover ? `0 4px 16px ${appointment.service.color}30` : `0 2px 6px ${appointment.service.color}15`,
  };
  const isDiagnostic = !!appointment.diagnosticPeriodId;
  const title = appointmentTitle(appointment, diagnosticPeriods);
  const className = appointmentClass(isDragLocked, isHover, isDiagnostic);

  if (readOnly && !allowOpen) {
    return (
      <>
        <div
          ref={preview.setAnchorRef}
          className={className.replace("cursor-grab", "cursor-default")}
          style={style}
          {...preview.previewHandlers}
        >
          <AppointmentBody appointment={appointment} title={title} />
        </div>
        <AppointmentDetailsPreview
          appointments={[appointment]}
          diagnosticPeriods={diagnosticPeriods}
          visible={preview.visible}
          position={preview.position}
          previewRef={preview.setPreviewRef}
        />
      </>
    );
  }

  if ((readOnly && allowOpen && onOpen) || (isDiagnostic && onOpen)) {
    return (
      <>
        <button
          type="button"
          ref={preview.setAnchorRef}
          className={className.replace("cursor-grab", "cursor-pointer")}
          style={style}
          onMouseEnter={() => {
            preview.previewHandlers.onMouseEnter();
            onHover(appointment.id);
          }}
          onMouseLeave={() => {
            preview.previewHandlers.onMouseLeave();
            onHover(null);
          }}
          onContextMenu={preview.previewHandlers.onContextMenu}
          onClick={() => onOpen(appointment)}
        >
          <AppointmentBody appointment={appointment} title={title} pointerEventsNone />
        </button>
        <AppointmentDetailsPreview
          appointments={[appointment]}
          diagnosticPeriods={diagnosticPeriods}
          visible={preview.visible}
          position={preview.position}
          previewRef={preview.setPreviewRef}
        />
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        ref={preview.setAnchorRef}
        className={className}
        style={style}
        onMouseEnter={() => {
          preview.previewHandlers.onMouseEnter();
          onHover(appointment.id);
        }}
        onMouseLeave={() => {
          preview.previewHandlers.onMouseLeave();
          onHover(null);
        }}
        onContextMenu={preview.previewHandlers.onContextMenu}
        onMouseDown={(event) => {
          if (event.button !== 0) return;
          onDragStart(appointment, event);
        }}
      >
        <AppointmentBody appointment={appointment} title={title} pointerEventsNone />
      </button>
      <AppointmentDetailsPreview
        appointments={[appointment]}
        diagnosticPeriods={diagnosticPeriods}
        visible={preview.visible}
        position={preview.position}
        previewRef={preview.setPreviewRef}
      />
    </>
  );
}
