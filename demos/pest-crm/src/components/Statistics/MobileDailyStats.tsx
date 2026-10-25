
import React from 'react';
import type { DailyStats } from '@/lib/api';

type CreatedOrderType = 'primary' | 'secondary';

interface Props {
  daily: DailyStats[];
  scoped: boolean;
  cityScoped?: boolean;
  localAdSpend: Record<string, string>;
  dirtyDates: Set<string>;
  totals: {
    createdPrimaryCount: number;
    createdSecondaryCount: number;
    totalCount: number;
    cashDesk: number;
    adSpend: number;
    netProfit: number;
  };
  onAdSpendChange: (date: string, value: string) => void;
  onAdSpendBlur: (date: string) => void;
  onOpenCreated: (day: DailyStats, type: CreatedOrderType) => void;
}

const formatNumber = (value: number) => value.toLocaleString('ru-RU');

const formatDate = (dateStr: string) => {
  const date = new Date(`${dateStr}T00:00:00`);
  return {
    day: date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' }).replace('.', ''),
    weekday: date.toLocaleDateString('ru-RU', { weekday: 'short' }).replace('.', ''),
  };
};

export default function MobileDailyStats({
  daily,
  scoped,
  cityScoped = false,
  localAdSpend,
  dirtyDates,
  totals,
  onAdSpendChange,
  onAdSpendBlur,
  onOpenCreated,
}: Props) {
  return (
    <section aria-labelledby="daily-stats-title" className="space-y-3">
      <div className="flex items-end justify-between px-1">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-gray-400">{daily.length} дней</p>
          <h2 id="daily-stats-title" className="mt-0.5 text-lg font-semibold text-gray-950">По дням</h2>
        </div>
        <div className={`text-right ${totals.netProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
          <div className="text-xs font-medium">Чистая прибыль</div>
          <div className="text-lg font-bold tabular-nums">
            {totals.netProfit > 0 ? '+' : ''}{formatNumber(totals.netProfit)} ₽
          </div>
        </div>
      </div>

      {daily.map(day => {
        const adSpend = cityScoped ? (day.adSpend || 0) : (Number(localAdSpend[day.date]) || 0);
        const netProfit = day.cashDesk - (scoped && !cityScoped ? 0 : adSpend);
        const date = formatDate(day.date);
        const today = day.date === new Date().toISOString().split('T')[0];
        const createdPrimary = day.createdPrimaryCount || 0;
        const createdSecondary = day.createdSecondaryCount || 0;

        return (
          <article
            key={day.date}
            className={`overflow-hidden rounded-2xl border bg-white ${today ? 'border-blue-300 ring-2 ring-blue-100' : 'border-gray-200'}`}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <div className="flex items-baseline gap-2">
                <span className="font-semibold capitalize text-gray-950">{date.day}</span>
                <span className="text-xs capitalize text-gray-400">{date.weekday}</span>
                {today && <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[0.625rem] font-semibold text-blue-700">Сегодня</span>}
              </div>
              <div className={`font-bold tabular-nums ${netProfit > 0 ? 'text-emerald-700' : netProfit < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                {netProfit > 0 ? '+' : ''}{formatNumber(netProfit)} ₽
              </div>
            </div>

            <div className="grid grid-cols-3 divide-x divide-gray-100 px-2 py-3">
              <div className="px-2">
                <div className="text-[0.6875rem] text-gray-400">Заказы</div>
                <div className="mt-0.5 font-semibold tabular-nums text-gray-900">
                  <button
                    type="button"
                    disabled={scoped || createdPrimary === 0}
                    onClick={() => onOpenCreated(day, 'primary')}
                    className="text-emerald-700 disabled:cursor-default"
                    aria-label={`Первичные: ${createdPrimary}`}
                  >
                    {createdPrimary}
                  </button>
                  <span className="mx-1 text-gray-300">/</span>
                  <button
                    type="button"
                    disabled={scoped || createdSecondary === 0}
                    onClick={() => onOpenCreated(day, 'secondary')}
                    className="text-amber-700 disabled:cursor-default"
                    aria-label={`Повторные: ${createdSecondary}`}
                  >
                    {createdSecondary}
                  </button>
                </div>
              </div>
              <div className="px-3">
                <div className="text-[0.6875rem] text-gray-400">Сумма</div>
                <div className="mt-0.5 truncate font-semibold tabular-nums text-gray-900">{formatNumber(day.totalSum)}</div>
              </div>
              <div className="px-3">
                <div className="text-[0.6875rem] text-gray-400">Касса</div>
                <div className="mt-0.5 truncate font-semibold tabular-nums text-emerald-700">{formatNumber(day.cashDesk)}</div>
              </div>
            </div>

            {cityScoped ? (
              <div className="flex items-center justify-between gap-4 bg-gray-50 px-4 py-2.5">
                <span className="text-sm text-gray-500">Реклама</span>
                <span className="font-semibold tabular-nums text-red-600">{formatNumber(adSpend)} ₽</span>
              </div>
            ) : !scoped ? (
              <label className="flex items-center justify-between gap-4 bg-gray-50 px-4 py-2.5">
                <span className="text-sm text-gray-500">Реклама</span>
                <span className="flex items-center gap-1.5">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={localAdSpend[day.date] ?? ''}
                    onChange={event => onAdSpendChange(day.date, event.target.value)}
                    onBlur={() => onAdSpendBlur(day.date)}
                    className={`w-28 rounded-lg border bg-white px-2.5 py-1.5 text-right font-semibold tabular-nums outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200 ${
                      dirtyDates.has(day.date) ? 'border-orange-300 bg-orange-50' : 'border-gray-200'
                    }`}
                    placeholder="0"
                    aria-label={`Расходы на рекламу ${date.day}`}
                  />
                  <span className="text-sm text-gray-400">₽</span>
                </span>
              </label>
            ) : null}
          </article>
        );
      })}

      {daily.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">
          Нет данных за этот период
        </div>
      )}
    </section>
  );
}
