
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api, ActivityItem } from '@/lib/api';
import UserSearchSelect from '@/components/UI/UserSearchSelect';
import ActionSearchSelect from '@/components/UI/ActionSearchSelect';
import { activityActionLabel } from '@/lib/activityLabel';

interface Props {
  orderId: string;
  isActive: boolean;
}

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

export default function OrderActivityTab({ orderId, isActive }: Props) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [userId, setUserId] = useState('');
  const [action, setAction] = useState('');
  const [actions, setActions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await api.getOrderActivity(orderId));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (isActive) void load();
  }, [isActive, load]);

  useEffect(() => {
    if (!isActive) return;
    void api.getActivityActions().then(setActions).catch(error => console.error(error));
  }, [isActive]);

  const people = useMemo(() => {
    const seen = new Set<string>();
    return items.flatMap(item => {
      if (!item.userId || seen.has(item.userId)) return [];
      seen.add(item.userId);
      return [{ id: item.userId, name: item.userName, role: item.userRole }];
    });
  }, [items]);

  const visible = items.filter(item => (
    (!userId || item.userId === userId) && (!action || item.action === action)
  ));

  if (loading && items.length === 0) {
    return <div className="py-8 text-center text-sm text-gray-400">Загрузка...</div>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1 space-y-2">
          <UserSearchSelect people={people} value={userId} onChange={setUserId} />
          <ActionSearchSelect actions={actions} value={action} onChange={setAction} />
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="shrink-0 text-sm font-medium text-green-600 hover:text-green-700 disabled:opacity-50"
        >
          Обновить
        </button>
      </div>
      {visible.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-400">Нет данных</div>
      ) : (
        visible.map(item => (
          <div key={item.id} className="rounded-xl bg-gray-50 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium text-gray-900">{item.userName}</div>
                <div className="text-xs text-gray-500">{ROLE_LABEL[item.userRole] || item.userRole}</div>
              </div>
              <div className="shrink-0 text-xs text-gray-400">{formatWhen(item.createdAt)}</div>
            </div>
            <div className="mt-1.5 text-sm text-gray-800">{activityActionLabel(item.action)}</div>
            {item.detail ? <div className="mt-0.5 text-sm text-gray-500">{item.detail}</div> : null}
          </div>
        ))
      )}
    </div>
  );
}
