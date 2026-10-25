
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import Modal from '@/components/UI/Modal';
import { api, Order, User } from '@/lib/api';
import { formatPhoneRu } from '@/lib/phone';

const STATUS_LABELS: Record<string, string> = {
  in_progress: 'В работе',
  completed: 'Выполнен',
  cancelled: 'Отменён',
};

type MasterOption = Pick<User, 'id' | 'name'>;

function MasterSelect({
  masters,
  value,
  onChange,
}: {
  masters: MasterOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = masters.find(master => master.id === value);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized
      ? masters.filter(master => master.name.toLowerCase().includes(normalized))
      : masters;
  }, [masters, query]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(current => !current)}
        className={`flex w-full items-center justify-between rounded-xl border bg-white px-4 py-3 text-left text-sm transition-colors ${
          open ? 'border-green-500 ring-2 ring-green-100' : 'border-gray-200 hover:border-gray-300'
        }`}
        aria-expanded={open}
      >
        <span className={selected ? 'font-medium text-gray-900' : 'text-gray-400'}>
          {selected?.name || 'Выберите мастера'}
        </span>
        <svg className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m19 9-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-40 mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 p-2">
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Поиск мастера"
              autoFocus
              className="w-full rounded-lg bg-gray-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-100"
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            {filtered.map(master => (
              <button
                key={master.id}
                type="button"
                onClick={() => {
                  onChange(master.id);
                  setOpen(false);
                  setQuery('');
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm ${
                  master.id === value ? 'bg-green-50 font-medium text-green-700' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {master.name}
                {master.id === value && <span aria-hidden="true">✓</span>}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-6 text-center text-sm text-gray-400">Мастер не найден</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MasterHistoryContent() {
  const navigate = useNavigate();
  const [masters, setMasters] = useState<MasterOption[]>([]);
  const [masterId, setMasterId] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const loadHistory = useCallback(async (id: string, showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const data = await api.getMasterOrderHistory(id);
      setOrders(data);
      setSelectedOrder(current => {
        if (!current) return null;
        return data.find(order => order.id === current.id && order.crmProject === current.crmProject) || null;
      });
      return data;
    } catch (err) {
      setError((err as Error).message);
      return [] as Order[];
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void api.getMasters()
      .then(data => setMasters(data))
      .catch(err => setError((err as Error).message));
  }, []);

  useEffect(() => {
    if (!masterId) {
      setOrders([]);
      setSelectedOrder(null);
      return;
    }
    void loadHistory(masterId);
  }, [masterId, loadHistory]);

  useEffect(() => {
    if (!masterId) return;
    const refresh = () => { void loadHistory(masterId, false); };
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [masterId, loadHistory]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
            aria-label="Назад"
          >
            ←
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">История заказов мастеров</h1>
            <p className="text-xs text-gray-500">Заказы из обоих проектов</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-4 p-4 sm:p-6">
        <MasterSelect
          masters={masters}
          value={masterId}
          onChange={value => {
            setMasterId(value);
            setSelectedOrder(null);
          }}
        />

        {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        {loading && <div className="py-12 text-center text-gray-400">Загрузка...</div>}
        {!loading && masterId && orders.length === 0 && (
          <div className="py-12 text-center text-gray-400">Прошлых заказов нет</div>
        )}

        {!loading && orders.map(order => (
          <button
            key={`${order.crmProject}-${order.id}`}
            type="button"
            onClick={() => {
              void loadHistory(masterId, false).then(data => {
                const fresh = data.find(item => item.id === order.id && item.crmProject === order.crmProject);
                setSelectedOrder(fresh || null);
              });
            }}
            className="block w-full rounded-xl border border-gray-200 bg-white p-4 text-left transition-colors hover:border-green-300 hover:bg-green-50/30 focus:outline-none focus:ring-2 focus:ring-green-100"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-gray-900">
                    {order.orderNumber ? `№${order.orderNumber}` : order.clientName}
                  </span>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                    Дезинсекция
                  </span>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                    {STATUS_LABELS[order.status] || order.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-700">{order.clientName} · {order.pest}</p>
                <p className="mt-1 text-sm text-gray-500">{order.address}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">
                  {(order.finalAmount || order.basePrice || 0).toLocaleString('ru-RU')} ₽
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(`${order.date}T00:00:00`).toLocaleDateString('ru-RU')} · {order.time.slice(0, 5)}
                </p>
              </div>
            </div>
          </button>
        ))}
      </main>

      <Modal
        isOpen={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        title={selectedOrder?.orderNumber ? `Заказ №${selectedOrder.orderNumber}` : 'Полная заявка'}
        size="lg"
      >
        {selectedOrder && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                Дезинсекция
              </span>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                {STATUS_LABELS[selectedOrder.status] || selectedOrder.status}
              </span>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                {selectedOrder.orderType === 'primary' ? 'Первичный' : 'Повторный'}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-gray-50 p-4">
                <h3 className="mb-3 font-semibold text-gray-900">Заявка</h3>
                <dl className="space-y-2 text-sm">
                  {[
                    ['Клиент', selectedOrder.clientName],
                    ['Вредитель', selectedOrder.pest],
                    ['Объект', selectedOrder.objectType],
                    ['Объём', selectedOrder.volume || '—'],
                    ['Дата', new Date(`${selectedOrder.date}T00:00:00`).toLocaleDateString('ru-RU')],
                    ['Время', selectedOrder.time],
                    ['Источник', selectedOrder.source || '—'],
                    ['Менеджер', selectedOrder.manager || '—'],
                    ['Мастер', selectedOrder.masterName || '—'],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-4 border-b border-gray-200 pb-2 last:border-0 last:pb-0">
                      <dt className="text-gray-500">{label}</dt>
                      <dd className="text-right font-medium text-gray-900">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="rounded-xl bg-gray-50 p-4">
                <h3 className="mb-3 font-semibold text-gray-900">Контакты и оплата</h3>
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-gray-500">Адрес</dt>
                    <dd className="mt-1 font-medium text-gray-900">{selectedOrder.address || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Телефоны</dt>
                    <dd className="mt-1 space-y-1 font-medium text-gray-900">
                      {(selectedOrder.phones || []).map(phone => (
                        <div key={phone}>{formatPhoneRu(phone) || phone}</div>
                      ))}
                      {!selectedOrder.phones?.length && '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 border-t border-gray-200 pt-2">
                    <dt className="text-gray-500">Базовая цена</dt>
                    <dd className="font-medium text-gray-900">{selectedOrder.basePrice.toLocaleString('ru-RU')} ₽</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-500">Итоговая сумма</dt>
                    <dd className="font-medium text-gray-900">{(selectedOrder.finalAmount || 0).toLocaleString('ru-RU')} ₽</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-500">Доход мастера</dt>
                    <dd className="font-medium text-gray-900">{(selectedOrder.masterIncome || 0).toLocaleString('ru-RU')} ₽</dd>
                  </div>
                </dl>
              </div>
            </div>

            {(selectedOrder.comment || selectedOrder.completionComment || (selectedOrder.status === 'cancelled' && selectedOrder.cancelReason)) && (
              <div className="rounded-xl border border-gray-200 p-4">
                <h3 className="mb-3 font-semibold text-gray-900">Комментарии</h3>
                {selectedOrder.comment && <p className="whitespace-pre-wrap text-sm text-gray-700">{selectedOrder.comment}</p>}
                {selectedOrder.completionComment && <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{selectedOrder.completionComment}</p>}
                {selectedOrder.status === 'cancelled' && selectedOrder.cancelReason && (
                  <p className="mt-2 text-sm text-red-700">Причина отмены: {selectedOrder.cancelReason}</p>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

export default function MasterHistoryPage() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <MasterHistoryContent />
    </ProtectedRoute>
  );
}
