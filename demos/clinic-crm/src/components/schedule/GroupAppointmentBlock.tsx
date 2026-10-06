import type { Appointment } from "../../lib/types";
import type { GroupJoinVisual } from "../../lib/group-sessions";
import { groupAgeRangeLabel } from "../../lib/group-age";
import { formatServiceName } from "../../lib/service-label";
import { heightPx, timedBlockStyle } from "../../lib/schedule/coordinates";
import { useAppointmentPreview } from "../../hooks/useAppointmentPreview";
import { AppointmentDetailsPreview } from "./AppointmentDetailsPreview";
import { appointmentClass } from "./scheduleStyles";

interface Props {
  appointments: Appointment[];
  rangeStart: number;
  isDragLocked: boolean;
  isHover: boolean;
  readOnly?: boolean;
  allowOpen?: boolean;
  joinHighlight?: GroupJoinVisual | null;
  onHover: (groupSessionId: string | null) => void;
  onDragStart: (appointments: Appointment[], event: React.MouseEvent<HTMLButtonElement>) => void;
  onOpen?: (appointments: Appointment[]) => void;
  onJoin?: (appointments: Appointment[]) => void;
}

function joinHighlightStyle(joinHighlight: GroupJoinVisual | null | undefined, serviceColor: string, isHover: boolean) {
  if (joinHighlight === "conflict") {
    return {
      background: "linear-gradient(160deg, rgba(254,226,226,0.95), rgba(254,242,242,0.9))",
      border: "2px dashed rgb(248 113 113)",
      borderLeft: "2px dashed rgb(248 113 113)",
      boxShadow: isHover ? "0 4px 16px rgba(220,38,38,0.2)" : "0 2px 6px rgba(220,38,38,0.12)",
    };
  }
  if (joinHighlight === "available") {
    return {
      background: `linear-gradient(160deg, ${serviceColor}40, ${serviceColor}18)`,
      border: "2px dashed rgba(82,148,77,0.7)",
      borderLeft: "2px dashed rgba(82,148,77,0.7)",
      boxShadow: isHover ? `0 4px 16px ${serviceColor}35` : `0 2px 6px ${serviceColor}18`,
    };
  }
  return {
    background: `linear-gradient(160deg, ${serviceColor}34, ${serviceColor}12)`,
    borderLeft: `3px solid ${serviceColor}`,
    boxShadow: isHover ? `0 4px 16px ${serviceColor}30` : `0 2px 6px ${serviceColor}15`,
  };
}

export function GroupAppointmentBlock({
  appointments,
  rangeStart,
  isDragLocked,
  isHover,
  readOnly = false,
  allowOpen = false,
  joinHighlight = null,
  onHover,
  onDragStart,
  onOpen,
  onJoin,
}: Props) {
  const preview = useAppointmentPreview(isDragLocked || !!joinHighlight);
  const primary = appointments[0]!;
  const style = {
    ...timedBlockStyle(primary.startMin, primary.endMin, 1, rangeStart),
    ...joinHighlightStyle(joinHighlight, primary.service.color, isHover),
  };
  const className = appointmentClass(isDragLocked, isHover, !!joinHighlight);
  const names = appointments.map((item) => item.client.fullName);
  const visibleNames = names.slice(0, 3);
  const extraCount = names.length - visibleNames.length;
  const ageLabel = groupAgeRangeLabel(primary.groupAgeRange);
  const joinBadge =
    joinHighlight === "conflict" ? "Занят" : joinHighlight === "available" ? "В группу" : null;

  const content = (
    <>
      <div className="flex items-center gap-1.5 pointer-events-none">
        <div className="truncate text-[11px] font-semibold leading-snug text-ink">{formatServiceName(primary.service)}</div>
        {ageLabel && (
          <span className="shrink-0 rounded-full border border-line bg-panel px-1.5 py-0.5 text-[9px] font-semibold tabular-nums text-ink">
            {ageLabel}
          </span>
        )}
        <span
          className={[
            "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold",
            joinHighlight === "conflict" ? "bg-red-100 text-red-700" : "bg-brand/15 text-brand-dark",
          ].join(" ")}
        >
          {appointments.length}
        </span>
        {joinBadge && (
          <span
            className={[
              "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold",
              joinHighlight === "conflict" ? "bg-red-100 text-red-700" : "bg-brand/15 text-brand-dark",
            ].join(" ")}
          >
            {joinBadge}
          </span>
        )}
      </div>
      <div className="pointer-events-none text-[10px] leading-snug text-ink-muted">
        {visibleNames.join(", ")}
        {extraCount > 0 ? ` +${extraCount}` : ""}
      </div>
      {heightPx(primary.startMin, primary.endMin) > 54 && primary.room && (
        <div className="pointer-events-none mt-0.5 truncate text-[9px] text-ink-muted/70">{primary.room.name}</div>
      )}
    </>
  );

  const hoverHandlers = {
    onMouseEnter: () => {
      preview.previewHandlers.onMouseEnter();
      onHover(primary.groupSessionId ?? primary.id);
    },
    onMouseLeave: () => {
      preview.previewHandlers.onMouseLeave();
      onHover(null);
    },
    onContextMenu: preview.previewHandlers.onContextMenu,
  };

  if (joinHighlight && onJoin) {
    return (
      <>
        <button
          type="button"
          ref={preview.setAnchorRef}
          className={className.replace("cursor-grab", "cursor-pointer")}
          style={style}
          {...hoverHandlers}
          onClick={() => onJoin(appointments)}
        >
          {content}
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

  if (readOnly && !allowOpen) {
    return (
      <>
        <div
          ref={preview.setAnchorRef}
          className={className.replace("cursor-grab", "cursor-default")}
          style={style}
          {...preview.previewHandlers}
        >
          {content}
        </div>
        <AppointmentDetailsPreview
          appointments={appointments}
          visible={preview.visible}
          position={preview.position}
          previewRef={preview.setPreviewRef}
        />
      </>
    );
  }

  if (readOnly && allowOpen && onOpen) {
    return (
      <>
        <button
          type="button"
          ref={preview.setAnchorRef}
          className={className.replace("cursor-grab", "cursor-pointer")}
          style={style}
          {...hoverHandlers}
          onClick={() => onOpen(appointments)}
        >
          {content}
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

  return (
    <>
      <button
        type="button"
        ref={preview.setAnchorRef}
        className={className}
        style={style}
        {...hoverHandlers}
        onMouseDown={(event) => {
          if (event.button !== 0) return;
          onDragStart(appointments, event);
        }}
      >
        {content}
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
