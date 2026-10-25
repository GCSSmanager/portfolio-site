import React, { useCallback, useEffect, useRef, useState } from 'react';
import Input from '@/components/UI/Input';
import PhoneRuField from '@/components/UI/PhoneRuField';
import { api, Order } from '@/lib/api';
import { formatPhoneRu, normalizePhone } from '@/lib/phone';
import { phoneDigits } from '@/lib/phone-ru';

const STATUS_LABEL: Record<Order['status'], string> = {
  in_progress: 'В работе',
  completed: 'Выполнен',
  cancelled: 'Отменён',
  spam: 'Спам',
};

type Props = {
  orderNumber: string;
  phone: string;
  onOrderNumberChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  orderNumberError?: string;
  phoneError?: string;
  /** Если задан — выбор из списка сразу отдаёт заявку (например, модалка поиска). */
  onOrderPick?: (order: Order) => void;
  orderNumberLabel?: string;
  phoneLabel?: string;
};

function phoneSearchQuery(value: string): string {
  const normalized = normalizePhone(value);
  if (normalized.length >= 4) return normalized;
  const digits = phoneDigits(value);
  return digits.length >= 3 ? digits : '';
}

function orderFromSelection(order: Order): { orderNumber: string; phone: string } {
  const primary = order.phones?.find(Boolean) || '';
  return {
    orderNumber: order.orderNumber || '',
    phone: primary ? formatPhoneRu(primary) : '',
  };
}

function OrderResultList({
  orders,
  loading,
  onPick,
}: {
  orders: Order[];
  loading: boolean;
  onPick: (order: Order) => void;
}) {
  if (loading) {
    return <div className="px-3 py-2 text-sm text-gray-400">Поиск…</div>;
  }
  if (orders.length === 0) {
    return <div className="px-3 py-2 text-sm text-gray-400">Ничего не найдено</div>;
  }
  return (
    <>
      {orders.slice(0, 10).map(order => {
        const displayPhone = formatPhoneRu(order.phones?.[0] || '') || order.phones?.[0] || '';
        return (
          <button
            key={order.id}
            type="button"
            onMouseDown={event => event.preventDefault()}
            onClick={() => onPick(order)}
            className="flex w-full flex-col gap-0.5 border-b border-gray-50 px-3 py-2.5 text-left last:border-0 hover:bg-gray-50"
          >
            <span className="text-sm font-medium text-gray-900">
              {order.orderNumber ? `#${order.orderNumber}` : 'Без номера'}
              {order.clientName ? ` · ${order.clientName}` : ''}
            </span>
            <span className="text-xs text-gray-500">
              {[displayPhone, order.address, STATUS_LABEL[order.status]].filter(Boolean).join(' · ')}
            </span>
          </button>
        );
      })}
    </>
  );
}

export default function OrderSearchFields({
  orderNumber,
  phone,
  onOrderNumberChange,
  onPhoneChange,
  orderNumberError,
  phoneError,
  onOrderPick,
  orderNumberLabel = 'Номер заказа *',
  phoneLabel = 'Телефон *',
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [openField, setOpenField] = useState<'orderNumber' | 'phone' | null>(null);
  const [orderResults, setOrderResults] = useState<Order[]>([]);
  const [phoneResults, setPhoneResults] = useState<Order[]>([]);
  const [orderLoading, setOrderLoading] = useState(false);
  const [phoneLoading, setPhoneLoading] = useState(false);

  const applyOrder = useCallback(
    (order: Order) => {
      if (onOrderPick) {
        onOrderPick(order);
        setOpenField(null);
        setOrderResults([]);
        setPhoneResults([]);
        return;
      }
      const next = orderFromSelection(order);
      onOrderNumberChange(next.orderNumber);
      onPhoneChange(next.phone);
      setOpenField(null);
      setOrderResults([]);
      setPhoneResults([]);
    },
    [onOrderNumberChange, onOrderPick, onPhoneChange],
  );

  useEffect(() => {
    if (!openField) return;
    const onPointer = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpenField(null);
      }
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [openField]);

  useEffect(() => {
    const needle = orderNumber.trim();
    if (openField !== 'orderNumber' || needle.length < 2) {
      setOrderResults([]);
      setOrderLoading(false);
      return;
    }

    setOrderLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const list = await api.searchOrders({ orderNumber: needle });
        setOrderResults(list);
      } catch {
        setOrderResults([]);
      } finally {
        setOrderLoading(false);
      }
    }, 280);

    return () => window.clearTimeout(timer);
  }, [orderNumber, openField]);

  useEffect(() => {
    const needle = phoneSearchQuery(phone);
    if (openField !== 'phone' || !needle) {
      setPhoneResults([]);
      setPhoneLoading(false);
      return;
    }

    setPhoneLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const list = await api.searchOrders({ phone: needle });
        setPhoneResults(list);
      } catch {
        setPhoneResults([]);
      } finally {
        setPhoneLoading(false);
      }
    }, 280);

    return () => window.clearTimeout(timer);
  }, [phone, openField]);

  const showOrderDropdown = openField === 'orderNumber' && orderNumber.trim().length >= 2;
  const showPhoneDropdown = openField === 'phone' && Boolean(phoneSearchQuery(phone));

  return (
    <div ref={rootRef} className="space-y-4">
      <div className="relative">
        <Input
          label={orderNumberLabel}
          value={orderNumber}
          onChange={e => {
            onOrderNumberChange(e.target.value);
            setOpenField('orderNumber');
          }}
          onFocus={() => setOpenField('orderNumber')}
          placeholder="Начните вводить номер — подскажем заявки"
          error={orderNumberError}
          autoComplete="off"
        />
        {showOrderDropdown ? (
          <div className="absolute z-40 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
            <OrderResultList orders={orderResults} loading={orderLoading} onPick={applyOrder} />
          </div>
        ) : null}
      </div>

      <div className="relative">
        <PhoneRuField
          label={phoneLabel}
          value={phone}
          onChange={value => {
            onPhoneChange(value);
            setOpenField('phone');
          }}
          onFocus={() => setOpenField('phone')}
          error={phoneError}
        />
        {showPhoneDropdown ? (
          <div className="absolute z-40 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
            <OrderResultList orders={phoneResults} loading={phoneLoading} onPick={applyOrder} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
