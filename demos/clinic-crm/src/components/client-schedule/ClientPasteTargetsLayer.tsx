import { minToTime } from "../../lib/format";
import { timedBlockStyleH } from "../../lib/schedule/coordinates";
import type { ClientPasteState, ClientPasteTarget } from "../../hooks/useClientAppointmentPaste";
import type { Appointment } from "../../lib/types";
import { scheduleZ } from "../schedule/scheduleStyles";

interface Props {
  date: string;
  slots: number[];
  rangeStart: number;
  rangeEnd: number;
  slotWidth: number;
  pasteState: ClientPasteState;
  pasteTarget: (date: string, startMin: number, source: Appointment) => ClientPasteTarget;
  onPaste: (date: string, startMin: number) => void;
}

export function ClientPasteTargetsLayer({
  date,
  slots,
  rangeStart,
  rangeEnd,
  slotWidth,
  pasteState,
  pasteTarget,
  onPaste,
}: Props) {
  const template = pasteState.template;
  if (!template) return null;

  const duration = template.endMin - template.startMin;

  return (
    <>
      {slots.map((min) => {
        if (min + duration > rangeEnd) return null;

        const target = pasteTarget(date, min, template);
        if (!target.ok) return null;

        const endMin = min + duration;

        return (
          <button
            key={`paste-target-${date}-${min}`}
            type="button"
            tabIndex={-1}
            className={[
              "absolute flex items-stretch gap-1 overflow-hidden rounded-lg border border-brand bg-brand-light text-left transition-colors cursor-pointer hover:bg-brand-light",
              scheduleZ.pasteTarget,
            ].join(" ")}
            style={{
              ...timedBlockStyleH(min, endMin, 1, rangeStart, slotWidth),
              top: 8,
              bottom: 8,
              height: "auto",
            }}
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onMouseUp={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onPaste(date, min);
            }}
          >
            <div className="pointer-events-none flex shrink-0 flex-col justify-center px-1 py-0.5 text-[9px] font-semibold leading-tight tabular-nums text-brand-dark">
              <span>{minToTime(min)}</span>
              <span>{minToTime(endMin)}</span>
            </div>
          </button>
        );
      })}
    </>
  );
}
