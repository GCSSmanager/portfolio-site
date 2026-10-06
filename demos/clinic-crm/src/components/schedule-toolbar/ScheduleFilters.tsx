import type { Client, Employee, Room, Service, Specialty } from "../../lib/types";
import { formatServiceName } from "../../lib/service-label";
import { staffFilterLabel, staffFilterOptions } from "../../lib/staff-filter";
import { SearchSelect } from "../ui";
import { FILTER_DROPDOWN_WIDTH } from "./constants";
import { StatPill } from "./StatPill";

interface Props {
  totalAppointments: number;
  totalEmployees: number;
  services: Service[];
  rooms: Room[];
  employees: Employee[];
  specialties: Specialty[];
  clients: Client[];
  highlightServiceId: string;
  onHighlightService: (id: string) => void;
  highlightClientId: string;
  onHighlightClient: (id: string) => void;
  employeeId: string;
  onEmployeeChange: (id: string) => void;
  roomId: string;
  onRoomChange: (id: string) => void;
  onOpenDisplaySettings?: () => void;
}

export function ScheduleFilters({
  totalAppointments,
  totalEmployees,
  services,
  rooms,
  employees,
  specialties,
  clients,
  highlightServiceId,
  onHighlightService,
  highlightClientId,
  onHighlightClient,
  employeeId,
  onEmployeeChange,
  roomId,
  onRoomChange,
  onOpenDisplaySettings,
}: Props) {
  const highlightService = services.find((s) => s.id === highlightServiceId);
  const staffLabel = staffFilterLabel(employeeId, employees, specialties);
  const highlightClient = clients.find((c) => c.id === highlightClientId);
  const hasHighlight = !!highlightService || !!staffLabel || !!highlightClient;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 md:mt-4 md:gap-3">
      <StatPill label="Специалистов" value={String(totalEmployees)} />
      <StatPill label="Записей" value={String(totalAppointments)} accent />
      <div className="flex w-full items-center gap-2 text-xs sm:w-auto sm:min-w-[220px]">
        <span className="shrink-0 text-ink-muted">Специалист</span>
        <div className="min-w-0 flex-1">
          <SearchSelect
            compact
            value={employeeId}
            onChange={onEmployeeChange}
            placeholder="Все"
            searchPlaceholder="Специалист или специальность…"
            dropdownMinWidth={FILTER_DROPDOWN_WIDTH}
            options={staffFilterOptions(employees, specialties, "Все")}
          />
        </div>
      </div>
      <div className="flex w-full items-center gap-2 text-xs sm:w-auto sm:min-w-[240px]">
        <span className="shrink-0 text-ink-muted">Услуга</span>
        <div className="min-w-0 flex-1">
          <SearchSelect
            compact
            value={highlightServiceId}
            onChange={onHighlightService}
            placeholder="Услуга"
            searchPlaceholder="Услуга…"
            dropdownMinWidth={FILTER_DROPDOWN_WIDTH}
            options={[
              { value: "", label: "Не выбрана" },
              ...services.map((s) => ({ value: s.id, label: formatServiceName(s), hint: `${s.durationMin} мин` })),
            ]}
          />
        </div>
      </div>
      <div className="flex w-full items-center gap-2 text-xs sm:w-auto sm:min-w-[240px]">
        <span className="shrink-0 text-ink-muted">Клиент</span>
        <div className="min-w-0 flex-1">
          <SearchSelect
            compact
            value={highlightClientId}
            onChange={onHighlightClient}
            placeholder="Не выбран"
            searchPlaceholder="Клиент…"
            dropdownMinWidth={FILTER_DROPDOWN_WIDTH}
            options={[
              { value: "", label: "Не выбран" },
              ...clients.map((client) => ({
                value: client.id,
                label: client.fullName,
                hint: client.phone ?? undefined,
              })),
            ]}
          />
        </div>
      </div>
      <div className="flex w-full items-center gap-2 text-xs sm:w-auto sm:min-w-[220px]">
        <span className="shrink-0 text-ink-muted">Кабинет</span>
        <div className="min-w-0 flex-1">
          <SearchSelect
            compact
            value={roomId}
            onChange={onRoomChange}
            placeholder="Авто"
            searchPlaceholder="Кабинет…"
            dropdownMinWidth={FILTER_DROPDOWN_WIDTH}
            options={[
              { value: "", label: "Авто" },
              ...rooms.map((r) => ({ value: r.id, label: r.name })),
            ]}
          />
        </div>
      </div>
      {onOpenDisplaySettings && (
        <button
          type="button"
          onClick={onOpenDisplaySettings}
          className="h-10 px-3 rounded-2xl border border-line bg-panel text-sm text-ink-muted hover:text-ink hover:border-brand-soft transition-colors"
          title="Ширина колонок расписания"
        >
          ⚙
        </button>
      )}
      <div className={["flex min-h-5 items-center gap-4 text-[11px] text-ink-muted flex-wrap", hasHighlight ? "" : "invisible"].join(" ")}>
        {staffLabel && (
          <span className="text-ink font-medium">{staffLabel}</span>
        )}
        {highlightService && (
          <>
            {staffLabel && <span>·</span>}
            <span className="text-ink font-medium">{formatServiceName(highlightService)}</span>
            <span className="text-ink-muted">· {highlightService.durationMin} мин</span>
          </>
        )}
        {highlightClient && (
          <>
            {(staffLabel || highlightService) && <span>·</span>}
            <span className="text-ink font-medium">{highlightClient.fullName}</span>
          </>
        )}
        <span className="text-ink-muted">· {roomId ? rooms.find((r) => r.id === roomId)?.name ?? "кабинет" : "Кабинет: авто"}</span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-2.5 rounded border-l-[3px] border-brand bg-brand/15" />
          доступные окна
        </span>
      </div>
    </div>
  );
}
