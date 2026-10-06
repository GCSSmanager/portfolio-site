import { useMemo, useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { resources } from "../lib/resources";
import type { Employee, EmployeeAnalyticsItem, EmployeeAnalyticsResponse } from "../lib/types";
import { Card, DatePicker, Empty, Field, SearchSelect } from "../components/ui";
import { ClientAnalyticsSection } from "../components/ClientAnalyticsSection";

type AnalyticsTab = "employees" | "clients";

function hours(minutes: number) {
  return `${(minutes / 60).toFixed(minutes % 60 === 0 ? 0 : 1)} ч`;
}

function dayLabel(date: string) {
  return format(parseISO(date), "d MMM", { locale: ru });
}

export function AnalyticsPage() {
  const [tab, setTab] = useState<AnalyticsTab>("employees");
  const [startDate, setStartDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(() => format(addDays(new Date(), 6), "yyyy-MM-dd"));
  const [employeeId, setEmployeeId] = useState("");
  const [sort, setSort] = useState<"utilization" | "monthly" | "overload">("utilization");

  const employeesQ = useQuery({
    queryKey: ["employees"],
    queryFn: () => resources.employees.list(false) as Promise<Employee[]>,
  });

  const dateError = startDate && endDate && endDate < startDate ? "Дата окончания раньше даты начала" : "";
  const analyticsQ = useQuery({
    queryKey: ["availability-analytics", startDate, endDate, employeeId],
    enabled: !dateError && tab === "employees",
    queryFn: async () =>
      (
        await api.get<EmployeeAnalyticsResponse>("/api/availability/analytics", {
          params: { startDate, endDate, employeeId: employeeId || undefined },
        })
      ).data,
  });

  const items = useMemo(() => {
    const list = [...(analyticsQ.data?.items ?? [])];
    if (sort === "monthly") return list.sort((a, b) => b.avgBusyMinutesPerMonth - a.avgBusyMinutesPerMonth);
    if (sort === "overload") return list.sort((a, b) => b.overloadDays - a.overloadDays || b.utilization - a.utilization);
    return list.sort((a, b) => b.utilization - a.utilization);
  }, [analyticsQ.data?.items, sort]);

  const setPeriod = (days: number) => {
    const start = parseISO(startDate);
    setEndDate(format(addDays(start, days - 1), "yyyy-MM-dd"));
  };

  const totals = analyticsQ.data?.totals;
  const loading = analyticsQ.isLoading || employeesQ.isLoading;

  return (
    <>
      <header className="border-b border-line bg-surface px-4 py-3 lg:px-6 lg:py-4">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight text-ink sm:text-xl">Аналитика</h1>
          <p className="mt-0.5 text-sm text-ink-muted">
            {tab === "employees" ? "Занятость специалистов" : "Визиты и категории клиентов"}
          </p>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:mt-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end sm:gap-3">
          <Field label="С">
            <DatePicker value={startDate} onChange={setStartDate} className="!h-10 !rounded-2xl shadow-card" />
          </Field>
          <Field label="По">
            <DatePicker value={endDate} onChange={setEndDate} invalid={!!dateError} className="!h-10 !rounded-2xl shadow-card" />
          </Field>
          <div className="grid grid-cols-3 gap-1 rounded-2xl border border-line bg-panel p-1 shadow-card sm:flex sm:h-10 sm:items-center">
            {[7, 14, 30].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setPeriod(days)}
                className="h-9 min-w-0 rounded-xl px-2 text-xs font-medium text-ink-muted transition-colors hover:bg-brand-light hover:text-brand-dark sm:h-8 sm:px-3"
              >
                {days} дн.
              </button>
            ))}
          </div>
        </div>
        {dateError && <p className="mt-2 text-xs font-medium text-red-600">{dateError}</p>}

        <div className="mt-3 grid grid-cols-2 gap-1 rounded-2xl border border-line bg-panel p-1 sm:mt-4 sm:inline-flex sm:w-auto">
          {[
            { value: "employees", label: "Специалисты" },
            { value: "clients", label: "Клиенты" },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setTab(item.value as AnalyticsTab)}
              className={[
                "h-9 min-w-0 rounded-xl px-2 text-sm font-medium transition-colors sm:px-4",
                tab === item.value ? "bg-brand text-white" : "text-ink-muted hover:bg-brand-light hover:text-brand-dark",
              ].join(" ")}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === "employees" && (
          <div className="mt-3 space-y-2 sm:mt-4">
            <SearchSelect
              compact
              value={employeeId}
              onChange={setEmployeeId}
              placeholder="все специалисты"
              searchPlaceholder="Специалист…"
              options={[
                { value: "", label: "все специалисты" },
                ...(employeesQ.data ?? []).map((e) => ({ value: e.id, label: e.shortName, hint: e.position ?? undefined })),
              ]}
            />
            <div className="grid grid-cols-3 gap-1 rounded-2xl border border-line bg-panel p-1">
              {[
                { value: "utilization", label: "Загрузка" },
                { value: "monthly", label: "Часы/мес" },
                { value: "overload", label: ">85%" },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setSort(item.value as typeof sort)}
                  className={[
                    "h-9 min-w-0 truncate rounded-xl px-1 text-[11px] font-medium transition-colors sm:h-8 sm:px-3 sm:text-xs",
                    sort === item.value ? "bg-brand text-white" : "text-ink-muted hover:bg-brand-light hover:text-brand-dark",
                  ].join(" ")}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      <div className="p-4 sm:p-6">
        {tab === "clients" ? (
          <ClientAnalyticsSection startDate={startDate} endDate={endDate} dateError={dateError} />
        ) : loading ? (
          <AnalyticsSkeleton />
        ) : analyticsQ.isError ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            Не удалось загрузить аналитику.
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <SummaryCard label="Занято" value={hours(totals?.busyMinutes ?? 0)} hint={`${totals?.utilization ?? 0}% от доступного`} />
              <SummaryCard
                label="Ср. за месяц"
                value={hours(totals?.avgBusyMinutesPerMonth ?? 0)}
                hint={`${hours(totals?.avgBusyMinutesPerWorkDay ?? 0)} в среднем за рабочий день`}
              />
              <SummaryCard label="Доступно" value={hours(totals?.availableMinutes ?? 0)} hint="график минус отсутствия" />
              <SummaryCard label="Дней >85%" value={String(totals?.overloadDays ?? 0)} hint="дней с загрузкой выше 85%" />
            </div>

            {items.length === 0 ? (
              <Card>
                <Empty text="Нет активных специалистов для выбранного фильтра" />
              </Card>
            ) : (
              <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4">
                {items.map((item) => (
                  <EmployeeAnalyticsCard key={item.employeeId} item={item} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function SummaryCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-ink">{value}</div>
      <div className="mt-1 text-xs text-ink-muted">{hint}</div>
    </Card>
  );
}

function EmployeeAnalyticsCard({ item }: { item: EmployeeAnalyticsItem }) {
  return (
    <Card className="overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
              <h2 className="truncate text-base font-semibold text-ink">{item.shortName}</h2>
            </div>
            <p className="mt-1 text-xs text-ink-muted truncate">{item.position || item.fullName}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-semibold text-ink">{item.utilization}%</div>
            <div className="text-[11px] text-ink-muted">загрузка</div>
          </div>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand to-brand-glow"
            style={{ width: `${Math.min(item.utilization, 100)}%` }}
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-5">
          <MiniMetric label="Занято" value={hours(item.busyMinutes)} />
          <MiniMetric label="Ср./мес" value={hours(item.avgBusyMinutesPerMonth)} />
          <MiniMetric label="Ср./день" value={hours(item.avgBusyMinutesPerWorkDay)} />
          <MiniMetric label="Занятия" value={hours(item.appointmentMinutes)} />
          <MiniMetric label="Диагн." value={hours(item.diagnosticMinutes)} />
        </div>

        <div className="mt-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">Период по дням</div>
          <div className="flex h-16 items-end gap-1 rounded-2xl bg-surface/70 px-3 py-2">
            {item.days.map((day) => (
              <div key={day.date} className="group relative flex flex-1 items-end justify-center">
                <div
                  className="w-full min-w-[6px] rounded-t-lg bg-brand/70 transition-all"
                  style={{ height: `${Math.max(4, Math.min(day.utilization, 100) * 0.46)}px` }}
                  title={`${dayLabel(day.date)}: ${day.utilization}%`}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-ink-muted">
          <span className="rounded-full bg-surface px-2 py-1">рабочих дней: {item.workDays}</span>
          {item.absenceMinutes > 0 && <span className="rounded-full bg-surface px-2 py-1">отсутствия: {hours(item.absenceMinutes)}</span>}
          {item.overloadDays > 0 && <span className="rounded-full bg-surface px-2 py-1">дней &gt;85%: {item.overloadDays}</span>}
        </div>
      </div>
    </Card>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface px-3 py-2">
      <div className="text-[11px] text-ink-muted">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-ink">{value}</div>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-3xl border border-line bg-panel" />
        ))}
      </div>
      <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-80 animate-pulse rounded-3xl border border-line bg-panel" />
        ))}
      </div>
    </div>
  );
}
