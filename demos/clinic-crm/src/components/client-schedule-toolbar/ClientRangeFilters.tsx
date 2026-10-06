import type { Client } from "../../lib/types";
import { DatePicker, SearchSelect } from "../ui";
import { FILTER_DROPDOWN_WIDTH } from "./constants";

interface Props {
  clientId: string;
  onClientChange: (id: string) => void;
  clients: Client[];
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onResetRange: () => void;
  onPrint?: () => void;
}

export function ClientRangeFilters({
  clientId,
  onClientChange,
  clients,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onResetRange,
  onPrint,
}: Props) {
  return (
    <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
      <div className="min-w-0 w-full sm:min-w-[240px] sm:w-auto sm:flex-1 lg:flex-none">
        <SearchSelect
          value={clientId}
          onChange={onClientChange}
          placeholder="Клиент…"
          searchPlaceholder="Найти клиента…"
          dropdownMinWidth={FILTER_DROPDOWN_WIDTH}
          options={clients.map((client) => ({
            value: client.id,
            label: client.fullName,
            hint: client.phone ?? undefined,
          }))}
        />
      </div>
      <DatePicker value={startDate} onChange={onStartDateChange} className="!h-10 !w-[8.5rem] !rounded-2xl shadow-card sm:!w-36" />
      <span className="text-xs text-ink-muted">—</span>
      <DatePicker value={endDate} onChange={onEndDateChange} className="!h-10 !w-[8.5rem] !rounded-2xl shadow-card sm:!w-36" />
      <button
        type="button"
        onClick={onResetRange}
        className="inline-flex h-10 items-center justify-center rounded-2xl border border-line bg-panel px-3 text-xs font-medium leading-none text-ink-muted transition-colors hover:border-brand-soft hover:text-brand-dark"
      >
        2 недели
      </button>
      {onPrint && clientId && (
        <button
          type="button"
          onClick={onPrint}
          className="inline-flex h-10 items-center justify-center rounded-2xl bg-brand px-4 text-sm font-medium leading-none text-white shadow-float transition-colors hover:bg-brand-dark"
        >
          Печать
        </button>
      )}
    </div>
  );
}
