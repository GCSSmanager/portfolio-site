import { useState } from "react";
import { Link } from "react-router-dom";
import type { Client, Employee, Room, Service, Specialty } from "../../lib/types";
import { rangeDayCount } from "../../lib/client-schedule-range";
import { ClientHighlightFilters } from "./ClientHighlightFilters";
import { ClientRangeFilters } from "./ClientRangeFilters";

interface Props {
  clientId: string;
  onClientChange: (id: string) => void;
  clients: Client[];
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onResetRange: () => void;
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
  onPrint?: () => void;
  onOpenDisplaySettings?: () => void;
  clientName?: string;
}

export function ClientScheduleToolbar({
  clientId,
  onClientChange,
  clients,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onResetRange,
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
  onPrint,
  onOpenDisplaySettings,
  clientName,
}: Props) {
  const dayCount = rangeDayCount(startDate, endDate);
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <header className="border-b border-line bg-surface px-4 py-3 lg:px-6 lg:py-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h1 className="text-lg font-semibold tracking-tight text-ink lg:text-xl">Расписание клиента</h1>
            <Link
              to="/"
              className="rounded-xl border border-line bg-panel px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-brand-soft hover:text-brand-dark"
            >
              ← По специалистам
            </Link>
          </div>
          <p className="mt-0.5 text-sm text-ink-muted">
            {clientName ? clientName : "Выберите клиента"}
            {clientId && dayCount > 0 && (
              <span>
                {" "}
                · {dayCount} {dayCount === 1 ? "день" : dayCount < 5 ? "дня" : "дней"}
              </span>
            )}
          </p>
        </div>

        <ClientRangeFilters
          clientId={clientId}
          onClientChange={onClientChange}
          clients={clients}
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={onStartDateChange}
          onEndDateChange={onEndDateChange}
          onResetRange={onResetRange}
          onPrint={onPrint}
        />
      </div>

      {clientId && (
        <>
          <button
            type="button"
            className="mt-3 flex h-9 w-full items-center justify-between rounded-xl border border-line bg-panel px-3 text-sm font-medium text-ink md:hidden"
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
          >
            <span>Фильтры</span>
            <span className="text-ink-muted">{filtersOpen ? "▴" : "▾"}</span>
          </button>
          <div className={filtersOpen ? "block" : "hidden md:block"}>
            <ClientHighlightFilters
              totalEntries={totalEntries}
              services={services}
              highlightServiceId={highlightServiceId}
              onHighlightService={onHighlightService}
              roomId={roomId}
              onRoomChange={onRoomChange}
              rooms={rooms}
              employees={employees}
              specialties={specialties}
              employeeId={employeeId}
              onEmployeeChange={onEmployeeChange}
              onOpenDisplaySettings={onOpenDisplaySettings}
            />
          </div>
        </>
      )}
    </header>
  );
}
