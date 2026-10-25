
import React, { useMemo, useState } from 'react';
import type { DailyStats } from '@/lib/api';

type Axis = 'count' | 'money';

type Series = {
  id: string;
  label: string;
  color: string;
  values: number[];
  axis: Axis;
};

const formatAxis = (value: number): string => {
  if (Math.abs(value) >= 1000000) {
    const mln = value / 1000000;
    return `${Number.isInteger(mln) ? mln : mln.toFixed(1)} млн`;
  }
  if (Math.abs(value) >= 1000) return `${Math.round(value / 1000)} тыс`;
  return String(Math.round(value));
};

const formatValue = (value: number): string => value.toLocaleString('ru-RU');

const weekdayFormatter = new Intl.DateTimeFormat('ru-RU', { weekday: 'long' });

const formatWeekday = (date: string): string => {
  const [year, month, day] = date.split('-').map(Number);
  return weekdayFormatter.format(new Date(year, month - 1, day));
};

const todayKey = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const axisMax = (values: number[]): number => Math.max(1, ...values);

const points = (
  values: number[],
  max: number,
  width: number,
  height: number,
  padLeft: number,
  padRight: number,
  padTop: number,
  padBottom: number,
) => {
  if (values.length === 0 || max <= 0) return [];
  const innerW = width - padLeft - padRight;
  const innerH = height - padTop - padBottom;
  const step = values.length > 1 ? innerW / (values.length - 1) : innerW;
  return values.map((value, index) => ({
    x: padLeft + index * step,
    y: padTop + innerH * (1 - value / max),
  }));
};

const toLine = (pts: Array<{ x: number; y: number }>) =>
  pts.map((pt, index) => `${index === 0 ? 'M' : 'L'}${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(' ');

const toArea = (pts: Array<{ x: number; y: number }>, baseline: number) => {
  if (pts.length === 0) return '';
  const last = pts[pts.length - 1];
  const first = pts[0];
  return `${toLine(pts)} L${last.x.toFixed(1)} ${baseline} L${first.x.toFixed(1)} ${baseline} Z`;
};

const costPerLead = (adSpend: number, leads: number): number | null => {
  if (adSpend <= 0 || leads <= 0) return null;
  return Math.round(adSpend / leads);
};

export default function StatisticsCharts({
  daily,
  showAdSpend = true,
}: {
  daily: DailyStats[];
  showAdSpend?: boolean;
}) {
  const chartDaily = useMemo(
    () => daily.filter(day => day.date <= todayKey()),
    [daily],
  );
  const dates = chartDaily.map(day => day.date);
  const series = useMemo<Series[]>(() => {
    const items: Series[] = [
      {
        id: 'primary',
        label: 'Первичные',
        color: '#15803d',
        axis: 'count',
        values: chartDaily.map(day => day.createdPrimaryCount ?? 0),
      },
      {
        id: 'secondary',
        label: 'Повторные',
        color: '#d97706',
        axis: 'count',
        values: chartDaily.map(day => day.createdSecondaryCount ?? 0),
      },
      {
        id: 'cash',
        label: 'Касса',
        color: '#2563eb',
        axis: 'money',
        values: chartDaily.map(day => day.cashDesk),
      },
    ];
    if (showAdSpend) {
      items.push({
        id: 'ad',
        label: 'РК',
        color: '#dc2626',
        axis: 'money',
        values: chartDaily.map(day => Number(day.adSpend) || 0),
      });
      items.push({
        id: 'cpl',
        label: 'Стоимость обращения',
        color: '#0f766e',
        axis: 'money',
        values: chartDaily.map(day => (
          costPerLead(Number(day.adSpend) || 0, day.createdPrimaryCount ?? 0) || 0
        )),
      });
    }
    return items;
  }, [chartDaily, showAdSpend]);

  const [enabled, setEnabled] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(series.map(item => [item.id, item.id !== 'cpl'])),
  );
  const [hover, setHover] = useState<number | null>(null);

  if (chartDaily.length < 2) return null;

  const visible = series.filter(item => enabled[item.id] !== false);
  const countMax = axisMax(visible.filter(item => item.axis === 'count').flatMap(item => item.values));
  const moneyMax = axisMax(visible.filter(item => item.axis === 'money').flatMap(item => item.values));
  const hasCountAxis = visible.some(item => item.axis === 'count');
  const hasMoneyAxis = visible.some(item => item.axis === 'money');

  const width = 800;
  const height = 260;
  const padLeft = 44;
  const padRight = 52;
  const padTop = 12;
  const padBottom = 24;
  const ticks = [1, 0.75, 0.5, 0.25, 0];
  const innerH = height - padTop - padBottom;
  const baseline = padTop + innerH;
  const plotRight = width - padRight;
  const xLabelCount = Math.min(dates.length, 8);

  const onMove = (event: React.MouseEvent<SVGSVGElement>) => {
    const svg = event.currentTarget;
    const ctm = svg.getScreenCTM();
    if (!ctm || dates.length < 2) return;
    const pt = new DOMPoint(event.clientX, event.clientY).matrixTransform(ctm.inverse());
    const plotWidth = width - padLeft - padRight;
    if (plotWidth <= 0) return;
    const ratio = Math.min(1, Math.max(0, (pt.x - padLeft) / plotWidth));
    setHover(Math.round(ratio * (dates.length - 1)));
  };

  const toggle = (id: string) => {
    setEnabled(current => ({ ...current, [id]: current[id] === false }));
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex gap-4">
        <div className="relative min-w-0 flex-1">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            className="h-64 w-full sm:h-80"
            role="img"
            aria-label="Динамика по дням"
            onMouseMove={onMove}
            onMouseLeave={() => setHover(null)}
          >
            {ticks.map(ratio => {
              const y = padTop + innerH * (1 - ratio);
              return (
                <g key={ratio}>
                  <line x1={padLeft} y1={y} x2={plotRight} y2={y} stroke="#e5e7eb" strokeWidth="1" />
                  {hasCountAxis && (
                    <text x={padLeft - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#6b7280">
                      {formatAxis(countMax * ratio)}
                    </text>
                  )}
                  {hasMoneyAxis && (
                    <text x={plotRight + 8} y={y + 4} textAnchor="start" fontSize="11" fill="#6b7280">
                      {formatAxis(moneyMax * ratio)}
                    </text>
                  )}
                </g>
              );
            })}
            {Array.from({ length: xLabelCount }, (_, i) => {
              const index = xLabelCount === 1 ? 0 : Math.round((i * (dates.length - 1)) / (xLabelCount - 1));
              const x = padLeft + (index / Math.max(dates.length - 1, 1)) * (plotRight - padLeft);
              return (
                <text key={`${dates[index]}-${i}`} x={x} y={height - 6} textAnchor="middle" fontSize="11" fill="#9ca3af">
                  {dates[index]?.slice(8)}
                </text>
              );
            })}
            {visible.map(item => {
              const max = item.axis === 'count' ? countMax : moneyMax;
              const pts = points(item.values, max, width, height, padLeft, padRight, padTop, padBottom);
              if (pts.length === 0) return null;
              return (
                <g key={item.id}>
                  <path d={toArea(pts, baseline)} fill={item.color} opacity="0.08" />
                  <path
                    d={toLine(pts)}
                    fill="none"
                    stroke={item.color}
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </g>
              );
            })}
            {hover != null && dates[hover] && (
              <line
                x1={padLeft + (hover / Math.max(dates.length - 1, 1)) * (plotRight - padLeft)}
                y1={padTop}
                x2={padLeft + (hover / Math.max(dates.length - 1, 1)) * (plotRight - padLeft)}
                y2={baseline}
                stroke="#9ca3af"
                strokeDasharray="4 4"
              />
            )}
          </svg>
          {hover != null && dates[hover] && (
            <div className="pointer-events-none absolute top-2 left-1/2 z-10 -translate-x-1/2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-sm">
              <div className="mb-1 font-semibold text-gray-900">
                {dates[hover].slice(8)}.{dates[hover].slice(5, 7)} · {formatWeekday(dates[hover])}
              </div>
              {visible.map(item => (
                <div key={item.id} className="flex items-center justify-between gap-4">
                  <span className="text-gray-500">{item.label}</span>
                  <span className="font-medium tabular-nums text-gray-900">
                    {item.axis === 'money'
                      ? `${formatValue(item.values[hover] || 0)} ₽`
                      : formatValue(item.values[hover] || 0)}
                  </span>
                </div>
              ))}
              {showAdSpend && enabled.cpl === false && (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-gray-500">Стоимость обращения</span>
                  <span className="font-medium tabular-nums text-gray-900">
                    {(() => {
                      const value = costPerLead(
                        Number(chartDaily[hover].adSpend) || 0,
                        chartDaily[hover].createdPrimaryCount ?? 0,
                      );
                      return value == null ? '—' : `${formatValue(value)} ₽`;
                    })()}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <aside className="w-44 shrink-0">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">Динамика по дням</h3>
          <div className="space-y-1">
            {series.map(item => {
              const on = enabled[item.id] !== false;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggle(item.id)}
                  className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      on ? 'border-green-600 bg-green-600' : 'border-gray-300 bg-white'
                    }`}
                  >
                    {on && (
                      <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                        <path d="M2.5 6.2L5 8.7L9.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="min-w-0 leading-tight">{item.label}</span>
                </button>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}
