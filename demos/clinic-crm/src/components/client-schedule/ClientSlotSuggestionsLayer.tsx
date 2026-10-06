import { minToTime } from "../../lib/format";
import type { Service } from "../../lib/types";
import type { SlotSuggestion } from "../../lib/slot-suggestions";
import { timedBlockStyleH } from "../../lib/schedule/coordinates";
import { scheduleZ } from "../schedule/scheduleStyles";

interface Props {
  date: string;
  service: Service;
  suggestions: SlotSuggestion[];
  rangeStart: number;
  slotWidth: number;
  hoverSlot: { date: string; startMin: number } | null;
  onHoverSlot: (slot: { date: string; startMin: number } | null) => void;
  onSelect: (suggestion: SlotSuggestion) => void;
}

function roomLabel(suggestion: SlotSuggestion) {
  return suggestion.room?.name ?? "авто";
}

export function ClientSlotSuggestionsLayer({
  date,
  service,
  suggestions,
  rangeStart,
  slotWidth,
  hoverSlot,
  onHoverSlot,
  onSelect,
}: Props) {
  const gridSuggestions = suggestions.filter((suggestion) => suggestion.label !== "В группу");
  if (gridSuggestions.length === 0) return null;

  return (
    <>
      {gridSuggestions.map((suggestion) => {
        const selected = hoverSlot?.date === date && hoverSlot.startMin === suggestion.startMin;
        const blockStyle = {
          ...timedBlockStyleH(suggestion.startMin, suggestion.endMin, 1, rangeStart, slotWidth),
          top: 8,
          bottom: 8,
          height: "auto",
          borderLeftColor: service.color,
          borderLeftWidth: 3,
        };

        return (
          <button
            key={`${date}-${suggestion.startMin}`}
            type="button"
            tabIndex={-1}
            className={[
              "absolute flex items-stretch gap-1 overflow-hidden rounded-lg border text-left transition-colors cursor-pointer",
              scheduleZ.suggestion,
              selected
                ? "border-brand bg-brand-light shadow-[0_4px_12px_rgba(82,148,77,0.16)]"
                : "border-brand/50 bg-brand-light hover:border-brand hover:bg-brand-light",
            ].join(" ")}
            style={blockStyle}
            onMouseEnter={() => onHoverSlot({ date, startMin: suggestion.startMin })}
            onMouseDown={(event) => event.preventDefault()}
            onMouseLeave={() => {
              if (selected) onHoverSlot(null);
            }}
            onClick={(event) => {
              event.stopPropagation();
              onSelect(suggestion);
            }}
          >
            <div className="pointer-events-none flex shrink-0 flex-col justify-center px-1 py-0.5 text-[9px] font-semibold leading-tight tabular-nums text-brand-dark">
              <span>{minToTime(suggestion.startMin)}</span>
              <span>{minToTime(suggestion.endMin)}</span>
            </div>
            <div className="pointer-events-none flex min-w-0 flex-1 items-center truncate pr-1 text-[9px] text-ink-muted">
              {roomLabel(suggestion)}
            </div>
          </button>
        );
      })}
    </>
  );
}
