
import React, { useState } from 'react';
import Modal from '@/components/UI/Modal';
import { CITY_CODES, cityOptionLabel } from '@/lib/cityLabel';
import type { CityStat } from '@/types';

const formatMoney = (value: number) => `${value.toLocaleString('ru-RU')} ₽`;

export default function CityScopeBar({
  cityStats,
  city,
  onChange,
  compact = false,
}: {
  cityStats: CityStat[];
  city: string | null;
  onChange: (city: string | null) => void;
  compact?: boolean;
}) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const statsByCode = new Map(cityStats.map(item => [item.code, item]));
  const options = CITY_CODES.map(code => statsByCode.get(code) || { code, name: cityOptionLabel(code), count: 0, cashDesk: 0 });
  const totalOrders = options.reduce((sum, item) => sum + item.count, 0);
  const selectedLabel = city
    ? cityOptionLabel(city)
    : compact
      ? 'Города'
      : 'Все города';

  const selectCity = (next: string | null) => {
    onChange(next);
    setIsPickerOpen(false);
  };

  return (
    <>
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

      <Modal isOpen={isPickerOpen} onClose={() => setIsPickerOpen(false)} title="Выбор города" size="md">
        <div className="space-y-5">
          <button
            type="button"
            onClick={() => selectCity(null)}
            className={`w-full rounded-xl border p-3 text-left transition-colors ${
              !city ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            <div className="text-sm font-semibold">Все города</div>
            <div className={`mt-1 text-xs tabular-nums ${!city ? 'text-gray-300' : 'text-gray-500'}`}>{totalOrders} заказов</div>
          </button>

          <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200">
            {options.map(item => {
              const active = city === item.code;
              return (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => selectCity(item.code)}
                  className={`flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors ${
                    active ? 'bg-gray-900 text-white' : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{cityOptionLabel(item.code)}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-sm font-semibold tabular-nums">{item.count}</span>
                    <span className={`block text-xs tabular-nums ${active ? 'text-gray-400' : 'text-gray-500'}`}>
                      {formatMoney(item.cashDesk || 0)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </Modal>
    </>
  );
}
