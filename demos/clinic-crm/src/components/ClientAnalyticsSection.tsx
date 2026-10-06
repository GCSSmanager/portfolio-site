import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { ClientCategoryBadges } from "../components/ClientCategories";
import { CLIENT_AGE_LABELS, CLIENT_CATEGORY_LABELS, CLIENT_CATEGORY_OPTIONS } from "../lib/clientCategories";
import { resources } from "../lib/resources";
import type { Client, ClientAnalyticsItem, ClientAnalyticsResponse } from "../lib/types";
import { Card, Empty, SearchSelect } from "../components/ui";

function hours(minutes: number) {
  return `${(minutes / 60).toFixed(minutes % 60 === 0 ? 0 : 1)} ч`;
}

function dayLabel(date: string) {
  return format(parseISO(date), "d MMM yyyy", { locale: ru });
}

function monthLabel(month: string) {
  return format(parseISO(`${month}-01`), "LLLL yyyy", { locale: ru });
}

function visitKindLabel(kind: ClientAnalyticsItem["visitKind"]) {
  if (kind === "primary") return "первичный";
  if (kind === "returning") return "повторный";
  return null;
}

interface Props {
  startDate: string;
  endDate: string;
  dateError: string;
}

export function ClientAnalyticsSection({ startDate, endDate, dateError }: Props) {
  const [clientId, setClientId] = useState("");
  const [ageCategory, setAgeCategory] = useState("");
  const [sort, setSort] = useState<"visits" | "minutes" | "inactive">("visits");

  const clientsQ = useQuery({
    queryKey: ["clients", "all"],
    queryFn: () => resources.clients.list() as Promise<Client[]>,
  });

  const analyticsQ = useQuery({
    queryKey: ["client-analytics", startDate, endDate, clientId, ageCategory],
    enabled: !dateError,
    queryFn: () =>
      resources.clients.analytics({
        startDate,
        endDate,
        clientId: clientId || undefined,
        ageCategory: ageCategory || undefined,
      }) as Promise<ClientAnalyticsResponse>,
  });

  const items = useMemo(() => {
    const list = [...(analyticsQ.data?.items ?? [])];
    if (sort === "minutes") return list.sort((a, b) => b.visitMinutes - a.visitMinutes || b.visitCount - a.visitCount);
    if (sort === "inactive") return list.sort((a, b) => Number(a.activeInPeriod) - Number(b.activeInPeriod) || a.fullName.localeCompare(b.fullName, "ru"));
    return list;
  }, [analyticsQ.data?.items, sort]);

  const totals = analyticsQ.data?.totals;
  const byAge = analyticsQ.data?.byAge;
  const byCategory = analyticsQ.data?.byCategory;
  const byMonth = analyticsQ.data?.byMonth ?? [];
  const loading = analyticsQ.isLoading || clientsQ.isLoading;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <SearchSelect
            compact
            value={clientId}
            onChange={setClientId}
            placeholder="все клиенты"
            searchPlaceholder="Клиент…"
            options={[
              { value: "", label: "все клиенты" },
              ...(clientsQ.data ?? []).map((client) => ({
                value: client.id,
                label: client.fullName,
                hint: client.group?.name ?? undefined,
              })),
            ]}
          />
          <SearchSelect
            compact
            value={ageCategory}
            onChange={setAgeCategory}
            placeholder="все категории"
            options={[
              { value: "", label: "все категории" },
              { value: "ADULT", label: CLIENT_AGE_LABELS.ADULT },
              { value: "CHILD", label: CLIENT_AGE_LABELS.CHILD },
            ]}
          />
        </div>
        <div className="grid grid-cols-3 gap-1 rounded-2xl border border-line bg-panel p-1">
          {[
            { value: "visits", label: "Визиты" },
            { value: "minutes", label: "Часы" },
            { value: "inactive", label: "Без визитов" },
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

      {loading ? (
        <AnalyticsSkeleton />
      ) : analyticsQ.isError ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          Не удалось загрузить статистику по клиентам.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Уникальных"
              value={String(totals?.clientsWithVisits ?? 0)}
              hint="пришли хотя бы раз за период"
            />
            <SummaryCard
              label="Первичные"
              value={String(totals?.primaryClients ?? 0)}
              hint="первый визит в периоде или отмечены первичными"
            />
            <SummaryCard
              label="Повторные"
              value={String(totals?.returningClients ?? 0)}
              hint="были раньше или снята галочка «первичный»"
            />
            <SummaryCard
              label="Визитов"
              value={String(totals?.visitCount ?? 0)}
              hint={`${totals?.appointmentCount ?? 0} занятий`}
            />
            <SummaryCard label="Часов" value={hours(totals?.visitMinutes ?? 0)} hint="суммарно за период" />
            <SummaryCard
              label="Неявки"
              value={String(totals?.noShowCount ?? 0)}
              hint="клиент не пришёл"
              danger={(totals?.noShowCount ?? 0) > 0}
            />
            <SummaryCard
              label="Всего клиентов"
              value={String(totals?.activeClients ?? 0)}
              hint={`${totals?.clientsWithoutVisits ?? 0} без визитов`}
            />
            <SummaryCard
              label="Без визитов"
              value={String(totals?.clientsWithoutVisits ?? 0)}
              hint="в базе, но не приходили"
              danger={(totals?.clientsWithoutVisits ?? 0) > 0}
            />
          </div>

          {byMonth.length > 0 && (
            <Card className="p-5">
              <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-ink-muted">По месяцам</div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-line text-[11px] uppercase tracking-wide text-ink-muted">
                      <th className="pb-2 pr-3 font-semibold">Месяц</th>
                      <th className="pb-2 pr-3 font-semibold">Уникальных</th>
                      <th className="pb-2 pr-3 font-semibold">Первичные</th>
                      <th className="pb-2 pr-3 font-semibold">Повторные</th>
                      <th className="pb-2 font-semibold">Визитов</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byMonth.map((row) => (
                      <tr key={row.month} className="border-b border-line/60 last:border-0">
                        <td className="py-2.5 pr-3 font-medium capitalize text-ink">{monthLabel(row.month)}</td>
                        <td className="py-2.5 pr-3 tabular-nums text-ink">{row.uniqueClients}</td>
                        <td className="py-2.5 pr-3 tabular-nums text-ink">{row.primaryClients}</td>
                        <td className="py-2.5 pr-3 tabular-nums text-ink">{row.returningClients}</td>
                        <td className="py-2.5 tabular-nums text-ink">{row.visitCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Card className="p-5">
              <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-ink-muted">По возрасту</div>
              <div className="grid grid-cols-3 gap-3">
                <BreakdownStat label={CLIENT_AGE_LABELS.ADULT} value={byAge?.ADULT ?? 0} />
                <BreakdownStat label={CLIENT_AGE_LABELS.CHILD} value={byAge?.CHILD ?? 0} />
                <BreakdownStat label="Не указано" value={byAge?.unset ?? 0} muted />
              </div>
            </Card>
            <Card className="p-5">
              <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-ink-muted">По отметкам</div>
              <div className="flex flex-wrap gap-2">
                {CLIENT_CATEGORY_OPTIONS.map((option) => (
                  <span key={option.value} className="rounded-full bg-brand-light px-3 py-1 text-xs font-medium text-brand-dark">
                    {CLIENT_CATEGORY_LABELS[option.value]} · {byCategory?.[option.value] ?? 0}
                  </span>
                ))}
              </div>
            </Card>
          </div>

          {items.length === 0 ? (
            <Card>
              <Empty text="Нет клиентов для выбранного фильтра" />
            </Card>
          ) : (
            <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4">
              {items.map((item) => (
                <ClientAnalyticsCard key={item.clientId} item={item} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value, hint, danger = false }: { label: string; value: string; hint: string; danger?: boolean }) {
  return (
    <Card className="p-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</div>
      <div className={["mt-2 text-2xl font-semibold tracking-tight", danger ? "text-red-600" : "text-ink"].join(" ")}>
        {value}
      </div>
      <div className="mt-1 text-xs text-ink-muted">{hint}</div>
    </Card>
  );
}

function BreakdownStat({ label, value, muted = false }: { label: string; value: number; muted?: boolean }) {
  return (
    <div className={["rounded-2xl px-4 py-3", muted ? "bg-surface text-ink-muted" : "bg-brand-light/70 text-brand-dark"].join(" ")}>
      <div className="text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs font-medium">{label}</div>
    </div>
  );
}

function ClientAnalyticsCard({ item }: { item: ClientAnalyticsItem }) {
  const maxVisits = Math.max(item.visitCount, 1);
  const kindLabel = visitKindLabel(item.visitKind);

  return (
    <Card className="overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="truncate text-base font-semibold text-ink">{item.fullName}</h2>
              <span
                className={[
                  "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                  item.activeInPeriod ? "border-brand-soft bg-brand-light text-brand-dark" : "border-line bg-surface text-ink-muted",
                ].join(" ")}
              >
                {item.activeInPeriod ? "был в периоде" : "без визитов"}
              </span>
              {kindLabel && (
                <span
                  className={[
                    "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                    item.visitKind === "primary"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-line bg-surface text-ink-muted",
                  ].join(" ")}
                >
                  {kindLabel}
                </span>
              )}
            </div>
            {item.groupName && <p className="mt-1 text-xs text-ink-muted truncate">{item.groupName}</p>}
            <div className="mt-3">
              <ClientCategoryBadges ageCategory={item.ageCategory} categories={item.categories} compact />
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-semibold text-ink">{item.visitCount}</div>
            <div className="text-[11px] text-ink-muted">визитов</div>
          </div>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand to-brand-glow"
            style={{ width: `${Math.min(100, (item.visitCount / maxVisits) * 100)}%` }}
          />
        </div>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <MiniMetric label="Занятия" value={String(item.appointmentCount)} />
          <MiniMetric label="Визиты" value={String(item.visitCount)} />
          <MiniMetric label="Неявки" value={String(item.noShowCount)} />
          <MiniMetric label="Часы" value={hours(item.visitMinutes)} />
          <MiniMetric label="Первый визит" value={item.firstVisitDate ? dayLabel(item.firstVisitDate) : "—"} />
          <MiniMetric label="Последний визит" value={item.lastVisitDate ? dayLabel(item.lastVisitDate) : "—"} />
        </div>

        {item.topService && (
          <div className="mt-4 rounded-2xl bg-surface px-3 py-2 text-xs text-ink-muted">
            Чаще всего: <span className="font-medium text-ink">{item.topService}</span>
          </div>
        )}
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-3xl border border-line bg-panel" />
        ))}
      </div>
      <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-56 animate-pulse rounded-3xl border border-line bg-panel" />
        ))}
      </div>
    </div>
  );
}
