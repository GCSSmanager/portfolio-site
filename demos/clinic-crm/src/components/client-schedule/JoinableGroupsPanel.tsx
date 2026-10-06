import { minToTime } from "../../lib/format";
import type { JoinableGroupSlot } from "../ClientScheduleDayList";

interface Props {
  groups: JoinableGroupSlot[];
  onJoin: (group: JoinableGroupSlot) => void;
}

export function JoinableGroupsPanel({ groups, onJoin }: Props) {
  if (!groups.length) return null;

  return (
    <div className="rounded-3xl border border-line bg-panel p-4 shadow-card space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Групповые окна</div>
      {groups.map((group) => (
        <button
          key={group.groupSessionId}
          type="button"
          onClick={() => onJoin(group)}
          className="w-full rounded-2xl border border-dashed border-brand/45 bg-brand-light/15 px-3 py-2 text-left transition-colors hover:border-brand/70 hover:bg-brand-light/30"
        >
          <div className="text-sm font-semibold tabular-nums text-brand-dark/80">
            {minToTime(group.startMin)}–{minToTime(group.endMin)}
          </div>
          <div className="text-[11px] text-ink-muted">
            {group.employee.shortName}
            {group.roomName ? ` · ${group.roomName}` : ""}
            {group.groupAgeRangeLabel ? ` · ${group.groupAgeRangeLabel}` : ""}
            {" · "}{group.groupSize} чел.
          </div>
        </button>
      ))}
    </div>
  );
}
