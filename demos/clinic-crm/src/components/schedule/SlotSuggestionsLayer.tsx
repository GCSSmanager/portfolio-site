import { minToTime } from "../../lib/format";
import type { Service } from "../../lib/types";
import type { SlotSuggestion } from "../../lib/slot-suggestions";
import { timedBlockStyle } from "../../lib/schedule/coordinates";
import { scheduleStyles, suggestionClass } from "./scheduleStyles";

interface Props {
  employeeId: string;
  service: Service | null | undefined;
  suggestions: SlotSuggestion[];
  rangeStart: number;
  roomMode: "auto" | "fixed";
  hoverSlot: { employeeId: string; startMin: number } | null;
  onHoverSlot: (slot: { employeeId: string; startMin: number } | null) => void;
  onSelect: (suggestion: SlotSuggestion) => void;
}

export function SlotSuggestionsLayer({
  employeeId,
  service,
  suggestions,
  rangeStart,
  roomMode,
  hoverSlot,
  onHoverSlot,
  onSelect,
}: Props) {
  if (!service) return null;

  if (suggestions.length === 0) {
    return <div className={scheduleStyles.noSuggestions}>Нет свободных окон</div>;
  }

  const gridSuggestions = suggestions.filter((suggestion) => suggestion.label !== "В группу");
  if (gridSuggestions.length === 0) return null;

  return (
    <>
      {gridSuggestions.map((suggestion) => {
        const selected = hoverSlot?.employeeId === employeeId && hoverSlot.startMin === suggestion.startMin;

        return (
          <button
            key={suggestion.id}
            type="button"
            tabIndex={-1}
            className={suggestionClass(selected)}
            style={{
              ...timedBlockStyle(suggestion.startMin, suggestion.endMin, 2, rangeStart),
              borderLeftColor: service.color,
              borderLeftWidth: 4,
            }}
            onMouseEnter={() => onHoverSlot({ employeeId, startMin: suggestion.startMin })}
            onMouseDown={(event) => event.preventDefault()}
            onMouseLeave={() => {
              if (selected) onHoverSlot(null);
            }}
            onClick={() => onSelect(suggestion)}
          >
            <div className="relative flex h-full items-start justify-between gap-2 px-2.5 py-1.5">
              <span className="min-w-0 text-[11px] font-semibold text-brand-dark">
                {minToTime(suggestion.startMin)}
              </span>
              <span className="truncate text-[10px] text-ink-muted">
                {roomMode === "auto" ? "Авто" : suggestion.room?.name ?? "Свободно"}
              </span>
            </div>
          </button>
        );
      })}
    </>
  );
}
