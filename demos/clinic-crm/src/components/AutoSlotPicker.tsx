import { minToTime } from "../lib/format";
import type { SlotSuggestion } from "../lib/slot-suggestions";

interface Props {
  serviceName?: string;
  employeeName?: string;
  clientName?: string;
  /** Подпись выбранного дня (расписание клиента). */
  dateLabel?: string;
  roomMode?: "auto" | "fixed";
  showEmployee?: boolean;
  suggestions: SlotSuggestion[];
  onPick: (suggestion: SlotSuggestion) => void;
}

export function AutoSlotPicker({
  serviceName,
  employeeName,
  clientName,
  dateLabel,
  roomMode = "auto",
  showEmployee = true,
  suggestions,
  onPick,
}: Props) {
  const bestSuggestion = suggestions.find((suggestion) => suggestion.label !== "В группу") ?? suggestions[0];

  return (
    <div className="bg-panel border border-line rounded-3xl shadow-card p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
            Автоподбор
          </h3>
          {dateLabel && (
            <div className="mt-1 text-sm font-medium text-ink">{dateLabel}</div>
          )}
          <p className="text-[11px] text-ink-muted mt-1">
            {serviceName
              ? [
                  employeeName,
                  clientName,
                  roomMode === "auto" ? "кабинет: авто" : "кабинет: фикс.",
                ].filter(Boolean).join(" · ")
              : "Выберите услугу"}
          </p>
        </div>
        {bestSuggestion && (
          <button
            type="button"
            onClick={() => onPick(bestSuggestion)}
            className="h-8 px-3 rounded-xl bg-brand text-white text-xs font-medium shadow-float hover:bg-brand-dark transition-colors"
          >
            Лучшее
          </button>
        )}
      </div>

      {!serviceName && (
        <div className="rounded-2xl bg-surface border border-line px-3 py-4 text-center text-xs text-ink-muted">
          Выберите услугу.
        </div>
      )}

      {serviceName && suggestions.length === 0 && (
        <div className="rounded-2xl bg-surface border border-line px-3 py-4 text-center text-xs text-ink-muted">
          Свободных окон нет.
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="space-y-2">
          {suggestions.map((s) => {
            const isJoinGroup = s.label === "В группу";
            const isBest = !isJoinGroup && s.id === bestSuggestion?.id;

            return (
            <button
              key={s.id}
              type="button"
              onClick={() => onPick(s)}
              className={[
                "w-full rounded-2xl border p-3 text-left transition-all focus:outline-none focus:ring-2 focus:ring-brand/30",
                isJoinGroup
                  ? "border-dashed border-brand/45 bg-brand-light/15 hover:border-brand/70 hover:bg-brand-light/30"
                  : isBest
                    ? "bg-brand-light border-brand-soft shadow-sm hover:shadow-card"
                    : "bg-panel border-line hover:border-brand-soft hover:bg-brand-light/50",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-ink tabular-nums">
                      {minToTime(s.startMin)}
                    </span>
                    <span className="text-[10px] text-ink-muted">
                      до {minToTime(s.endMin)}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-ink-muted truncate">
                    {showEmployee ? (
                      <>
                        {s.employee.shortName}
                        {s.room && (
                          <>
                            {" · "}
                            {s.room.name}
                          </>
                        )}
                      </>
                    ) : (
                      s.room?.name ?? "авто"
                    )}
                  </div>
                </div>
                <span
                  className={[
                    "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                    isJoinGroup
                      ? "bg-brand/10 text-brand-dark/80"
                      : isBest
                        ? "bg-brand text-white"
                        : "bg-surface text-ink-muted",
                  ].join(" ")}
                >
                  {isJoinGroup && s.groupSize ? `В группу · ${s.groupSize}` : s.label}
                </span>
              </div>
            </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
