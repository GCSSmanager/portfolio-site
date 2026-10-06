import type { GroupJoinVisual } from "../../lib/group-sessions";
import { minToTime } from "../../lib/format";
import { timedBlockStyleH } from "../../lib/schedule/coordinates";
import { scheduleZ } from "../schedule/scheduleStyles";

export interface ClientJoinableGroup {
  groupSessionId: string;
  startMin: number;
  endMin: number;
  employeeId: string;
  employeeName: string;
  roomName?: string;
  groupSize: number;
  groupAgeRangeLabel?: string;
  joinHighlight: GroupJoinVisual;
}

interface Props {
  group: ClientJoinableGroup;
  rangeStart: number;
  slotWidth: number;
  onJoin: () => void;
}

export function ClientJoinableGroupBlock({ group, rangeStart, slotWidth, onJoin }: Props) {
  const conflict = group.joinHighlight === "conflict";
  const style = {
    ...timedBlockStyleH(group.startMin, group.endMin, 1, rangeStart, slotWidth),
    top: 8,
    bottom: 8,
    height: "auto",
  };

  return (
    <button
      type="button"
      tabIndex={-1}
      className={[
        "absolute flex items-stretch gap-1 overflow-hidden rounded-lg border-2 border-dashed text-left transition-colors cursor-pointer",
        scheduleZ.appointment,
        conflict
          ? "border-red-400 bg-red-50/90 hover:border-red-500 hover:bg-red-50"
          : "border-brand/60 bg-brand-light/40 hover:border-brand hover:bg-brand-light/70",
      ].join(" ")}
      style={style}
      onMouseDown={(event) => event.preventDefault()}
      onClick={(event) => {
        event.stopPropagation();
        onJoin();
      }}
    >
      <div
        className={[
          "pointer-events-none flex shrink-0 flex-col justify-center px-1 py-0.5 text-[9px] font-semibold leading-tight tabular-nums",
          conflict ? "text-red-700" : "text-brand-dark",
        ].join(" ")}
      >
        <span>{minToTime(group.startMin)}</span>
        <span>{minToTime(group.endMin)}</span>
      </div>
      <div className="pointer-events-none flex min-w-0 flex-1 flex-col justify-center pr-1">
        <div className={["truncate text-[10px] font-semibold", conflict ? "text-red-700" : "text-brand-dark"].join(" ")}>
          {conflict ? "Занят" : "В группу"}
          {group.groupAgeRangeLabel ? ` · ${group.groupAgeRangeLabel}` : ""}
          {" · "}{group.groupSize}
        </div>
        <div className="truncate text-[9px] text-ink-muted">
          {group.employeeName}
          {group.roomName ? ` · ${group.roomName}` : ""}
        </div>
      </div>
    </button>
  );
}
