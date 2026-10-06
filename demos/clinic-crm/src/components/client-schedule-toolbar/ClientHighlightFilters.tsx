import type { Employee, Room, Service, Specialty } from "../../lib/types";
import { formatServiceName } from "../../lib/service-label";
import { staffFilterOptions } from "../../lib/staff-filter";
import { SearchSelect } from "../ui";
import { FILTER_DROPDOWN_WIDTH } from "./constants";
import { StatPill } from "./StatPill";

interface Props {
  totalEntries: number;
  services: Service[];
  highlightServiceId: string;
  onHighlightService: (id: string) => void;
  roomId: string;
  onRoomChange: (id: string) => void;
  rooms: Room[];
  employees: Employee[];
  specialties: Specialty[];
  employeeId: string;
  onEmployeeChange: (id: string) => void;
  onOpenDisplaySettings?: () => void;
}

export function ClientHighlightFilters({
  totalEntries,
  services,
  highlightServiceId,
  onHighlightService,
  roomId,
  onRoomChange,
  rooms,
  employees,
  specialties,
  employeeId,
  onEmployeeChange,
  onOpenDisplaySettings,
}: Props) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 md:mt-4 md:gap-3">
      <StatPill label="Записей" value={String(totalEntries)} accent />
      <div className="flex w-full items-center gap-2 text-xs sm:w-auto sm:min-w-[220px]">
        <span className="shrink-0 text-ink-muted">Специалист</span>
        <div className="min-w-0 flex-1">
          <SearchSelect
            compact
            value={employeeId}
            onChange={onEmployeeChange}
            placeholder="Любой"
            searchPlaceholder="Специалист или специальность…"
            dropdownMinWidth={FILTER_DROPDOWN_WIDTH}
            options={staffFilterOptions(employees, specialties, "Любой")}
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
              ...services.map((service) => ({
                value: service.id,
                label: formatServiceName(service),
                hint: `${service.durationMin} мин`,
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
              ...rooms.map((room) => ({ value: room.id, label: room.name })),
            ]}
          />
        </div>
      </div>
      {onOpenDisplaySettings && (
        <button
          type="button"
          onClick={onOpenDisplaySettings}
          className="h-10 px-3 rounded-2xl border border-line bg-panel text-sm text-ink-muted hover:text-ink hover:border-brand-soft transition-colors"
          title="Ширина полосок расписания"
        >
          ⚙
        </button>
      )}
    </div>
  );
}
