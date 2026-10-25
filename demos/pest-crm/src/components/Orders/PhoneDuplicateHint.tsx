
import React from 'react';
import { Order } from '@/types';

const STATUS_LABEL: Record<string, string> = {
  in_progress: 'В работе',
  completed: 'Выполнен',
  cancelled: 'Отменён',
  spam: 'Спам',
};

interface Props {
  orders: Order[];
  loading?: boolean;
  /** Для первичного — жёстче (красный), для повторного — предупреждение */
  blockPrimary?: boolean;
}

export default function PhoneDuplicateHint({ orders, loading, blockPrimary }: Props) {
  if (loading) {
    return (
      <div className="bg-gray-50 border border-gray-100 text-gray-500 px-4 py-3 rounded-xl text-sm">
        Проверяем номер…
      </div>
    );
  }

  if (!orders.length) return null;

  const tone = blockPrimary
    ? 'bg-red-50 border-red-200 text-red-800'
    : 'bg-amber-50 border-amber-200 text-amber-900';

  return (
    <div className={`border px-4 py-3 rounded-xl text-sm space-y-2 ${tone}`}>
      <p className="font-medium">
        {blockPrimary
          ? 'Уже есть заказы с этим номером — первичный создать нельзя. Выберите «Повторный» или другой телефон.'
          : 'Уже есть заказы с этим номером:'}
      </p>
      <ul className="space-y-1.5 max-h-40 overflow-y-auto">
        {orders.map((o) => (
          <li key={o.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
            <span className="font-semibold">
              {o.orderNumber ? `#${o.orderNumber}` : 'без номера'}
            </span>
            <span className="opacity-80">{o.clientName}</span>
            <span className="opacity-70">
              {o.date}
              {o.time ? ` ${String(o.time).slice(0, 5)}` : ''}
            </span>
            <span className="opacity-70">
              · {o.orderType === 'secondary' ? 'повтор' : 'первичный'}
              · {STATUS_LABEL[o.status] || o.status}
            </span>
            {o.address ? (
              <span className="w-full text-xs opacity-60 truncate">{o.address}</span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
