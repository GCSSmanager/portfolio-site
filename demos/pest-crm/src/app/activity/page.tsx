
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import api, { ActivityItem, Order } from '@/lib/api';
import OrderDetailsModal from '@/components/Orders/OrderDetailsModal';
import UserSearchSelect, { type SearchablePerson } from '@/components/UI/UserSearchSelect';
import ActionSearchSelect from '@/components/UI/ActionSearchSelect';
import type { User } from '@/types';
import { activityActionLabel } from '@/lib/activityLabel';

const ROLE_LABEL: Record<string, string> = {
  admin: 'Владелец',
  operator: 'Оператор',
  master: 'Мастер',
};

const formatWhen = (iso: string): string => {
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
};

function ActivityContent() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [people, setPeople] = useState<SearchablePerson[]>([]);
  const [role, setRole] = useState<'' | 'operator' | 'master'>('');
  const [userId, setUserId] = useState('');
  const [action, setAction] = useState('');
  const [actions, setActions] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const openOrder = async (orderId?: string | null, orderNumber?: string | null) => {
    if (!orderId && !orderNumber) return;
    try {
      if (orderId) {
        setSelectedOrder(await api.getOrder(orderId));
        return;
      }
    } catch {
      // ищем по номеру в текущем CRM
    }
    if (!orderNumber) return;
    try {
      const found = await api.searchOrders({ orderNumber });
      const next = found.find(item => item.orderNumber === orderNumber) || found[0];
      if (next) setSelectedOrder(next);
    } catch {
      // заказ удалён
    }
  };

  const load = useCallback(async (nextPage: number) => {
    setIsLoading(true);
    try {
      const data = await api.getActivity(userId ? '' : role, nextPage, userId || undefined, action || undefined);
      setItems(data.items);
      setPage(data.page);
      setHasMore(data.hasMore);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [role, userId, action]);

  useEffect(() => {
    if (hasRole('admin')) void load(1);
  }, [hasRole, load]);

  useEffect(() => {
    if (!hasRole('admin')) return;
    void api.getUsers({ includeInactive: true }).then((users: User[]) => {
      setPeople(users.map(user => ({
        id: user.id,
        name: user.name,
        role: user.role,
        phone: user.phone,
      })));
    }).catch(error => console.error(error));
    void api.getActivityActions().then(setActions).catch(error => console.error(error));
  }, [hasRole]);

  useEffect(() => {
    const onProject = () => {
      setSelectedOrder(null);
      void load(1);
      void api.getActivityActions().then(setActions).catch(error => console.error(error));
    };
    window.addEventListener('crm:project', onProject);
    return () => window.removeEventListener('crm:project', onProject);
  }, [load]);

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white shadow-sm safe-top">
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => navigate('/')} className="rounded-xl p-2 -ml-2 text-gray-500 hover:bg-gray-100">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Активность</h1>
              <p className="text-xs text-gray-500">Действия операторов и мастеров</p>
            </div>
          </div>
          <button type="button" onClick={() => void load(page)} disabled={isLoading} className="rounded-xl p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50">
            <svg className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
        </div>
        <div className="space-y-2 px-4 pb-3 sm:px-6">
          <div className="flex gap-1">
            {([
              ['', 'Все'],
              ['operator', 'Операторы'],
              ['master', 'Мастера'],
            ] as const).map(([value, label]) => (
              <button
                key={value || 'all'}
                type="button"
                onClick={() => { setUserId(''); setRole(value); setPage(1); }}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  !userId && role === value ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <UserSearchSelect
            people={role ? people.filter(person => person.role === role) : people}
            value={userId}
            onChange={id => { setUserId(id); setPage(1); }}
          />
          <ActionSearchSelect
            actions={actions}
            value={action}
            onChange={next => { setAction(next); setPage(1); }}
          />
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-2 p-4 sm:p-6">
        {items.length === 0 && !isLoading && (
          <div className="py-16 text-center text-gray-400">Нет данных</div>
        )}
        {items.map(item => {
          const canOpen = Boolean(item.orderId || item.orderNumber);
          return (
          <div
            key={item.id}
            className={`rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm ${
              canOpen ? 'cursor-pointer hover:border-blue-200' : ''
            }`}
            onClick={canOpen ? () => void openOrder(item.orderId, item.orderNumber) : undefined}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium text-gray-900">{item.userName}</div>
                <div className="text-xs text-gray-500">{ROLE_LABEL[item.userRole] || item.userRole}</div>
              </div>
              <div className="shrink-0 text-xs text-gray-400">{formatWhen(item.createdAt)}</div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-800">
              <span>{activityActionLabel(item.action)}</span>
              {item.orderNumber ? (
                <span className={canOpen ? 'font-semibold text-blue-700' : 'font-semibold text-gray-700'}>
                  #{item.orderNumber}
                </span>
              ) : null}
            </div>
            {item.detail ? <div className="mt-0.5 text-sm text-gray-500">{item.detail}</div> : null}
          </div>
          );
        })}
        {(page > 1 || hasMore) && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              disabled={isLoading || page <= 1}
              onClick={() => void load(page - 1)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-white disabled:opacity-40"
            >
              Назад
            </button>
            <span className="text-sm text-gray-500">{page}</span>
            <button
              type="button"
              disabled={isLoading || !hasMore}
              onClick={() => void load(page + 1)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-white disabled:opacity-40"
            >
              Дальше
            </button>
          </div>
        )}
      </main>
      <OrderDetailsModal
        order={selectedOrder}
        isOpen={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        onSuccess={() => setSelectedOrder(null)}
      />
    </div>
  );
}

export default function ActivityPage() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <ActivityContent />
    </ProtectedRoute>
  );
}
