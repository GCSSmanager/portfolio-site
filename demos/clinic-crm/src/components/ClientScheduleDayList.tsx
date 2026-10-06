import type { Appointment, ClientScheduleEntry, Employee } from "../lib/types";
import { minToTime } from "../lib/format";
import { formatClientScheduleDayLabel } from "./client-schedule-toolbar";

export interface JoinableGroupSlot {
  groupSessionId: string;
  startMin: number;
  endMin: number;
  employee: Pick<Employee, "id" | "shortName">;
  roomName?: string;
  groupSize: number;
  groupAgeRangeLabel?: string;
}

interface Props {
  days: string[];
  entriesByDate: Map<string, ClientScheduleEntry[]>;
  activeDay: string;
  onSelectDay: (date: string) => void;
  onAdd: (date: string) => void;
  onEditAppointment: (appointment: Appointment) => void;
  onOpenGroup?: (entry: ClientScheduleEntry, date: string) => void;
  joinableGroupsByDate?: Map<string, JoinableGroupSlot[]>;
  onJoinGroup?: (group: JoinableGroupSlot, date: string) => void;
  appointmentsByDate: Map<string, Appointment[]>;
  showClientName?: boolean;
}

export function ClientScheduleDayList({
  days,
  entriesByDate,
  activeDay,
  onSelectDay,
  onAdd,
  onEditAppointment,
  onOpenGroup,
  joinableGroupsByDate,
  onJoinGroup,
  appointmentsByDate,
  showClientName = false,
}: Props) {
  if (!days.length) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-surface/40 px-6 py-12 text-center text-sm text-ink-muted">
        Укажите корректный период.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-panel shadow-card">
      {days.map((date, index) => {
        const entries = entriesByDate.get(date) ?? [];
        const joinableGroups = joinableGroupsByDate?.get(date) ?? [];
        const label = formatClientScheduleDayLabel(date);
        const selected = activeDay === date;

        return (
          <div
            key={date}
            className={[
              "flex flex-col gap-3 border-line px-4 py-4 sm:flex-row sm:items-start sm:gap-4",
              index > 0 ? "border-t" : "",
              selected ? "bg-brand-light/35" : "hover:bg-surface/40",
            ].join(" ")}
          >
            <button
              type="button"
              onClick={() => onSelectDay(date)}
              className={[
                "flex shrink-0 rounded-2xl border px-3 py-2 text-left transition-colors sm:w-40",
                selected ? "border-brand-soft bg-brand-light/70" : "border-line bg-panel hover:border-brand-soft",
              ].join(" ")}
            >
              <div>
                <div className="text-lg font-semibold tabular-nums text-brand-dark">{label.short}</div>
                <div className="text-[11px] capitalize text-ink-muted">{label.weekday}</div>
                <div className="mt-0.5 text-[10px] text-ink-muted">{label.full}</div>
                {label.isToday && (
                  <div className="mt-1 inline-flex rounded-full bg-brand px-2 py-0.5 text-[10px] font-medium text-white">
                    сегодня
                  </div>
                )}
              </div>
            </button>

            <button
              type="button"
              onClick={() => onSelectDay(date)}
              className="min-w-0 flex-1 text-left"
            >
              {entries.length === 0 && joinableGroups.length === 0 ? (
                <div className="flex min-h-[52px] items-center rounded-2xl border border-dashed border-line/80 px-4 text-sm text-ink-muted">
                  Нет записей
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {entries.map((entry) => (
                    <EntryChip
                      key={`${entry.kind}-${entry.id}`}
                      entry={entry}
                      showClientName={showClientName}
                      onEdit={() => {
                        if (entry.kind !== "appointment") return;
                        if (entry.isGroup && entry.groupSessionId) {
                          onOpenGroup?.(entry, date);
                          return;
                        }
                        const appointment = appointmentsByDate.get(date)?.find((item) => item.id === entry.id);
                        if (appointment) onEditAppointment(appointment);
                      }}
                    />
                  ))}
                  {joinableGroups.map((group) => (
                    <button
                      key={`join-${group.groupSessionId}`}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onJoinGroup?.(group, date);
                      }}
                      className="min-w-[220px] rounded-2xl border border-dashed border-brand/45 bg-brand-light/15 px-3 py-2.5 text-left transition-colors hover:border-brand/70 hover:bg-brand-light/30"
                    >
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="text-sm font-semibold tabular-nums text-brand-dark/80">
                          {minToTime(group.startMin)}–{minToTime(group.endMin)}
                        </span>
                        <span className="text-xs font-medium text-ink-muted">В группу</span>
                        {group.groupAgeRangeLabel && (
                          <span className="rounded-full border border-line bg-panel px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-ink">
                            {group.groupAgeRangeLabel}
                          </span>
                        )}
                        <span className="rounded-full bg-brand/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand-dark/80">
                          {group.groupSize} чел.
                        </span>
                      </div>
                      <div className="mt-1 text-[11px] text-ink-muted/80">
                        {group.employee.shortName}
                        {group.roomName ? ` · ${group.roomName}` : ""}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </button>

            <button
              type="button"
              onClick={() => onAdd(date)}
              aria-label="Добавить запись"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center self-start rounded-xl border border-line bg-panel text-lg leading-none text-ink-muted transition-colors hover:border-brand-soft hover:text-brand-dark"
            >
              +
            </button>
          </div>
        );
      })}
    </div>
  );
}

function EntryChip({
  entry,
  showClientName,
  onEdit,
}: {
  entry: ClientScheduleEntry;
  showClientName: boolean;
  onEdit: () => void;
}) {
  const isAppointment = entry.kind === "appointment";
  const isGroup = isAppointment && entry.isGroup;
  const content = (
    <>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <span className="text-sm font-semibold tabular-nums text-brand-dark">
          {minToTime(entry.startMin)}–{minToTime(entry.endMin)}
        </span>
        <span className="text-xs font-medium text-ink">{entry.title}</span>
        {isGroup && entry.groupSize && (
          <span className="rounded-full bg-brand/15 px-1.5 py-0.5 text-[10px] font-semibold text-brand-dark">
            {entry.groupSize} чел.
          </span>
        )}
      </div>
      <div className="mt-1 text-[11px] text-ink-muted">
        {entry.specialist}
        {entry.room ? ` · ${entry.room}` : ""}
        {showClientName ? ` · ${entry.clientName}` : ""}
      </div>
    </>
  );

  if (!isAppointment) {
    return (
      <div className="min-w-[220px] rounded-2xl border border-line bg-surface/70 px-3 py-2.5">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Диагностика</div>
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onEdit();
      }}
      className={[
        "min-w-[220px] rounded-2xl border px-3 py-2.5 text-left transition-colors",
        isGroup
          ? "border-brand-soft bg-brand-light/55 hover:border-brand-soft hover:bg-brand-light/80"
          : "border-brand-soft/70 bg-brand-light/40 hover:border-brand-soft hover:bg-brand-light/70",
      ].join(" ")}
    >
      {content}
    </button>
  );
}
