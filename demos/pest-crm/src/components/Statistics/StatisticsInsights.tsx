
import React from 'react';

export interface PeriodSnapshot {
  leads: number;
  orders: number;
  completed: number;
  primary: number;
  secondary: number;
  cancellations: number;
  revenue: number;
  cash: number;
  adSpend: number;
  netProfit: number;
}

interface Props {
  current: PeriodSnapshot;
  previous: PeriodSnapshot | null;
  comparisonTitle?: string;
}

const money = (value: number) => `${Math.round(value).toLocaleString('ru-RU')} ₽`;

const delta = (current: number, previous: number) => {
  if (previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
};

export default function StatisticsInsights({
  current,
  previous,
  comparisonTitle = 'Сравнение с прошлым периодом',
}: Props) {
  const comparison = [
    { label: 'Касса', current: current.cash, previous: previous?.cash || 0, money: true },
    { label: 'Заказы', current: current.orders, previous: previous?.orders || 0 },
    { label: 'Лиды', current: current.leads, previous: previous?.leads || 0 },
    { label: 'Реклама', current: current.adSpend, previous: previous?.adSpend || 0, money: true, inverse: true },
    { label: 'ЧП', current: current.netProfit, previous: previous?.netProfit || 0, money: true },
  ];
  const marketing = [
    { label: 'CAC (РК / перв.)', value: current.primary > 0 && current.adSpend > 0 ? money(current.adSpend / current.primary) : '—' },
    { label: 'CPO (РК / все)', value: current.orders > 0 && current.adSpend > 0 ? money(current.adSpend / current.orders) : '—' },
    { label: 'ROAS (оборот / РК)', value: current.adSpend > 0 ? `${((current.revenue / current.adSpend) * 100).toFixed(0)}%` : '—' },
    { label: 'ROMI (ЧП / РК)', value: current.adSpend > 0 ? `${((current.netProfit / current.adSpend) * 100).toFixed(0)}%` : '—' },
    { label: 'Отмены', value: current.leads > 0 ? `${((current.cancellations / current.leads) * 100).toFixed(1)}%` : '—' },
    { label: 'Повторные', value: current.orders > 0 ? `${((current.secondary / current.orders) * 100).toFixed(1)}%` : '—' },
  ];
  const funnel = [
    { label: 'Все лиды', value: current.leads, color: 'bg-blue-500' },
    { label: 'Оформились', value: current.orders, color: 'bg-indigo-500' },
    { label: 'Выполнено', value: current.completed, color: 'bg-emerald-500' },
  ];

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1.15fr_0.85fr]">
      <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-4 py-2.5">
          <h3 className="font-semibold text-gray-900">{comparisonTitle}</h3>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-gray-100 sm:grid-cols-5 sm:divide-y-0">
          {comparison.map(item => {
            const change = previous ? delta(item.current, item.previous) : null;
            const positive = change !== null && (item.inverse ? change <= 0 : change >= 0);
            return (
              <div key={item.label} className="px-4 py-3">
                <div className="text-xs text-gray-500">{item.label}</div>
                <div className="mt-1 font-bold tabular-nums text-gray-900">
                  {item.money ? money(item.current) : item.current.toLocaleString('ru-RU')}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-1 text-xs">
                  <span className={`font-medium ${change === null ? 'text-gray-400' : positive ? 'text-emerald-600' : 'text-red-600'}`}>
                    {change === null ? 'нет базы' : `${change >= 0 ? '↑' : '↓'} ${Math.abs(change).toFixed(1)}%`}
                  </span>
                  {previous && (
                    <span className="text-gray-400">
                      · было {item.money ? money(item.previous) : item.previous.toLocaleString('ru-RU')}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-3 border-t border-gray-100 bg-gray-50 sm:grid-cols-6">
          {marketing.map(item => (
            <div key={item.label} className="px-3 py-2.5 text-center">
              <div className="text-[0.6875rem] text-gray-500">{item.label}</div>
              <div className="mt-0.5 text-sm font-semibold tabular-nums text-gray-900">{item.value}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
          <h3 className="font-semibold text-gray-900">Воронка</h3>
          <span className="text-xs text-gray-400">
            {current.leads > 0 ? `${Math.round((current.orders / current.leads) * 100)}% в заказ` : '—'}
          </span>
        </div>
        <div className="flex items-center p-4">
          {funnel.map((item, index) => (
            <React.Fragment key={item.label}>
              <div className="min-w-0 flex-1 rounded-xl bg-gray-50 px-3 py-3 text-center">
                <div className={`mx-auto mb-2 h-1.5 w-10 rounded-full ${item.color}`} />
                <div className="text-xs text-gray-500">{item.label}</div>
                <div className="mt-1 text-xl font-bold tabular-nums text-gray-900">{item.value}</div>
              </div>
              {index < funnel.length - 1 && (
                <div className="flex shrink-0 flex-col items-center px-2 text-gray-400">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-4-4 4 4-4 4" />
                  </svg>
                  <span className="text-[0.625rem] font-medium">
                    {item.value > 0 ? `${Math.round((funnel[index + 1].value / item.value) * 100)}%` : '—'}
                  </span>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </section>
    </div>
  );
}
