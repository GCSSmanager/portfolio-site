import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import type { Client, Employee, Room, Service, Specialty } from "../../lib/types";
import { DateNav } from "./DateNav";
import { ScheduleFilters } from "./ScheduleFilters";
import { ToolbarActions } from "./ToolbarActions";

interface Props {
  date: string;
  onChange: (date: string) => void;
  totalAppointments: number;
  totalEmployees: number;
  services: Service[];
  rooms: Room[];
  employees: Employee[];
  specialties: Specialty[];
  highlightServiceId: string;
  onHighlightService: (id: string) => void;
  highlightClientId: string;
  onHighlightClient: (id: string) => void;
  clients: Client[];
  employeeId: string;
  onEmployeeChange: (id: string) => void;
  roomId: string;
  onRoomChange: (id: string) => void;
  onPrintClient?: () => void;
  onPrintDay?: () => void;
  onOpenDisplaySettings?: () => void;
  readOnly?: boolean;
  title?: string;
}

export function ScheduleToolbar({
  date,
  onChange,
  totalAppointments,
  totalEmployees,
  services,
  rooms,
  employees,
  specialties,
  highlightServiceId,
  onHighlightService,
  highlightClientId,
  onHighlightClient,
  clients,
  employeeId,
  onEmployeeChange,
  roomId,
  onRoomChange,
  onPrintClient,
  onPrintDay,
  onOpenDisplaySettings,
  readOnly = false,
  title = "Расписание",
}: Props) {
  const d = parseISO(date);
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <header className="border-b border-line bg-surface px-4 py-3 lg:px-6 lg:py-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold tracking-tight text-ink lg:text-xl">{title}</h1>
          <p className="mt-0.5 text-sm capitalize text-ink-muted">
            {format(d, "EEEE, d MMMM yyyy", { locale: ru })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DateNav date={date} onChange={onChange} />
          <ToolbarActions onPrintClient={onPrintClient} onPrintDay={onPrintDay} />
        </div>
      </div>

      {!readOnly && (
        <>
          <button
            type="button"
            className="mt-3 flex h-9 w-full items-center justify-between rounded-xl border border-line bg-panel px-3 text-sm font-medium text-ink md:hidden"
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
          >
            <span>Фильтры и подсветка</span>
            <span className="text-ink-muted">{filtersOpen ? "▴" : "▾"}</span>
          </button>
          <div className={filtersOpen ? "block" : "hidden md:block"}>
            <ScheduleFilters
              totalAppointments={totalAppointments}
              totalEmployees={totalEmployees}
              services={services}
              rooms={rooms}
              employees={employees}
              specialties={specialties}
              clients={clients}
              highlightServiceId={highlightServiceId}
              onHighlightService={onHighlightService}
              highlightClientId={highlightClientId}
              onHighlightClient={onHighlightClient}
              employeeId={employeeId}
              onEmployeeChange={onEmployeeChange}
              roomId={roomId}
              onRoomChange={onRoomChange}
              onOpenDisplaySettings={onOpenDisplaySettings}
            />
          </div>
        </>
      )}
    </header>
  );
}
