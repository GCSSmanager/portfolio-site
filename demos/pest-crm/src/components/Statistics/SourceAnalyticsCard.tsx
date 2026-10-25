
import React, { useState } from 'react';
import SourceLabel from '@/components/UI/SourceLabel';
import Modal from '@/components/UI/Modal';
import type { ConversionSourceStats, SourceStats } from '@/lib/api';
import { formatSourceShort } from '@/lib/sourceLabel';
import {
  isAllSources,
  sourceMatchesScope,
  type SourceScope,
} from '@/lib/sourceScope';

const formatMoney = (value: number) => `${value.toLocaleString('ru-RU')} ₽`;

export function SourceScopeBar({
  sourceStats,
  scope,
  onChange,
  compact = false,
}: {
  sourceStats: SourceStats[];
  scope: SourceScope;
  onChange: (scope: SourceScope) => void;
  compact?: boolean;
}) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selectScope = (nextScope: SourceScope) => {
    onChange(nextScope);
    setIsPickerOpen(false);
    setQuery('');
  };

  const totalOrders = sourceStats.reduce((sum, source) => sum + source.count, 0);
  const totalCash = sourceStats.reduce((sum, source) => sum + (source.cashDesk || 0), 0);
  const selectedLabel = scope.kind === 'all'
    ? compact
      ? 'Источники'
      : 'Все источники'
    : scope.kind === 'channel'
      ? scope.name
      : formatSourceShort(scope.name);
  const normalizedQuery = query.trim().toLocaleLowerCase('ru-RU');
  const filteredSources = sourceStats
    .filter(source => {
      if (!normalizedQuery) return true;
      return `${source.name} ${formatSourceShort(source.name)}`
        .toLocaleLowerCase('ru-RU')
        .includes(normalizedQuery);
    })
    .sort((a, b) => b.count - a.count);

  return (
    <>
    <section className={compact
      ? 'w-full min-w-0'
      : 'flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-4'
    }>
      {!compact && (
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-[0.12em] text-gray-400">Срез данных</div>
          <div className="mt-1 truncate font-semibold text-gray-950">{selectedLabel}</div>
        </div>
      )}
      <div className={compact ? 'flex w-full min-w-0 flex-col gap-1.5' : 'flex items-center gap-3'}>
        {isAllSources(scope) && !compact && (
          <div className="hidden text-right lg:block">
            <div className="text-sm font-semibold tabular-nums text-gray-900">{totalOrders} заказов</div>
            <div className="text-xs tabular-nums text-gray-500">{formatMoney(totalCash)} касса</div>
          </div>
        )}
        <button
          type="button"
          onClick={() => setIsPickerOpen(true)}
          className={`flex w-full min-w-0 items-center justify-between gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-left text-sm font-medium text-gray-900 outline-none transition hover:border-gray-400 focus:ring-2 focus:ring-gray-200 ${compact ? '' : 'sm:max-w-xs'}`}
        >
          <span className="truncate">{selectedLabel}</span>
          <svg className="h-4 w-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
          </svg>
        </button>
        {!isAllSources(scope) && (
          <button
            type="button"
            onClick={() => onChange({ kind: 'all' })}
            className="w-full shrink-0 rounded-xl border border-gray-200 px-2 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 sm:w-auto sm:px-3 sm:py-2.5 sm:text-sm"
          >
            Сбросить
          </button>
        )}
      </div>
    </section>

    <Modal
      isOpen={isPickerOpen}
      onClose={() => {
        setIsPickerOpen(false);
        setQuery('');
      }}
      title="Выбор источника"
      size="md"
    >
      <div className="space-y-5">
        <label className="relative block">
          <span className="sr-only">Поиск источника</span>
          <svg className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Найти источник"
            autoFocus
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-400 focus:bg-white focus:ring-2 focus:ring-gray-100"
          />
        </label>

        {!normalizedQuery && (
          <button
            type="button"
            onClick={() => selectScope({ kind: 'all' })}
            className={`w-full rounded-xl border p-3 text-left transition-colors ${
              scope.kind === 'all' ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            <div className="text-sm font-semibold">Все источники</div>
            <div className={`mt-1 text-xs tabular-nums ${scope.kind === 'all' ? 'text-gray-300' : 'text-gray-500'}`}>{totalOrders} заказов</div>
          </button>
        )}

        <div>
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">Источники</div>
            <div className="text-xs text-gray-400">{filteredSources.length}</div>
          </div>
          <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 sm:max-h-[50vh] sm:overflow-y-auto">
            {filteredSources.map(source => {
              const active = (scope.kind === 'source' || scope.kind === 'channel') && scope.name === source.name;
              const short = formatSourceShort(source.name);
              return (
                <button
                  key={source.name}
                  type="button"
                  onClick={() => selectScope({ kind: 'source', name: source.name })}
                  className={`flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors ${
                    active ? 'bg-gray-900 text-white' : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{short}</span>
                    {short !== source.name && (
                      <span className={`mt-0.5 block truncate text-xs ${active ? 'text-gray-400' : 'text-gray-400'}`}>{source.name}</span>
                    )}
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-sm font-semibold tabular-nums">{source.count}</span>
                    <span className={`block text-xs tabular-nums ${active ? 'text-gray-400' : 'text-gray-500'}`}>{formatMoney(source.cashDesk || 0)}</span>
                  </span>
                </button>
              );
            })}
            {filteredSources.length === 0 && (
              <div className="px-4 py-10 text-center text-sm text-gray-500">Ничего не найдено</div>
            )}
          </div>
        </div>
      </div>
    </Modal>
    </>
  );
}

export default function SourceAnalyticsCard({
  stats,
  scope,
  onChange,
  conversionData,
  onOpenConversion,
  conversionPeriodHint,
}: {
  stats: SourceStats[];
  scope: SourceScope;
  onChange: (scope: SourceScope) => void;
  conversionData: ConversionSourceStats[];
  onOpenConversion?: (source: ConversionSourceStats) => void;
  conversionPeriodHint?: string;
}) {
  const [showAll, setShowAll] = useState(false);
  const visible = stats.filter(source => sourceMatchesScope(source.name, scope));
  const displayed = showAll ? visible : visible.slice(0, 6);
  const totalOrders = visible.reduce((sum, source) => sum + source.count, 0);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      {conversionPeriodHint ? (
        <p className="border-b border-gray-100 bg-gray-50 px-4 py-2 text-xs text-gray-600">{conversionPeriodHint}</p>
      ) : null}
      <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3">
        <h3 className="font-semibold text-gray-900">Источники</h3>
        {!isAllSources(scope) && (
          <button
            type="button"
            onClick={() => onChange({ kind: 'all' })}
            className="text-sm text-teal-700 hover:text-teal-900"
          >
            Сбросить
          </button>
        )}
      </div>
      {visible.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-gray-500">Нет данных</p>
      ) : (
        <>
        <div className="divide-y divide-gray-100 sm:hidden">
          {displayed.map(source => {
            const percent = totalOrders > 0 ? Math.round((source.count / totalOrders) * 100) : 0;
            const cashDesk = source.cashDesk || 0;
            const conv = conversionData.find(item => item.sourceName === source.name);
            return (
              <div
                key={source.name}
                className="block w-full bg-white px-4 py-3 text-left"
              >
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <SourceLabel source={source.name} align="start" className="font-medium text-gray-900" />
                    <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                      <span>{source.count} заказов</span>
                      <span aria-hidden="true">·</span>
                      <span>{percent}%</span>
                      {conv && conv.conversion > 0 && <span>· {conv.conversion.toFixed(1)}% конв.</span>}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-semibold tabular-nums text-gray-900">{cashDesk ? formatMoney(cashDesk) : '—'}</div>
                    <div className="mt-1 text-xs text-gray-500">
                      <span className="text-green-700">{source.primary || 0} перв.</span>
                      <span className="mx-1">·</span>
                      <span className="text-amber-700">{source.secondary || 0} повт.</span>
                    </div>
                  </div>
                </div>
                {onOpenConversion && conv && (
                  <button
                    type="button"
                    className="mt-2 inline-flex text-xs font-medium text-indigo-700"
                    onClick={() => onOpenConversion(conv)}
                  >
                    Изменить клики
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <div className="hidden max-h-[26rem] overflow-auto sm:block sm:min-h-0 sm:flex-1">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-gray-50 text-xs font-semibold uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2.5 text-left">Источник</th>
                <th className="px-3 py-3 text-right">Заказов</th>
                <th className="px-3 py-3 text-right">Конверсия</th>
                <th className="px-3 py-3 text-right">Касса</th>
                <th className="px-4 py-3 text-right">Отмены</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {displayed.map(source => {
                const percent = totalOrders > 0 ? Math.round((source.count / totalOrders) * 100) : 0;
                const cashDesk = source.cashDesk || 0;
                const conv = conversionData.find(item => item.sourceName === source.name);
                return (
                  <tr key={source.name} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5">
                      <SourceLabel source={source.name} align="start" className="font-medium text-gray-800" />
                      <div className="mt-0.5 text-xs text-gray-400">{percent}% заказов</div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-gray-900">{source.count}</td>
                    <td className="px-3 py-2.5 text-right font-medium text-indigo-600">
                      {conv && conv.conversion > 0 ? `${conv.conversion.toFixed(1)}%` : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium text-green-700">{cashDesk ? formatMoney(cashDesk) : '—'}</td>
                    <td className="px-4 py-2.5 text-right text-red-600">{source.cancelled || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </>
      )}
      {visible.length > 6 && (
        <button
          type="button"
          onClick={() => setShowAll(value => !value)}
          className="border-t border-gray-100 px-5 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        >
          {showAll ? 'Свернуть' : `Показать все · ${visible.length}`}
        </button>
      )}
    </div>
  );
}
