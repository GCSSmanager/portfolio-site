
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '@/components/UI/Modal';
import Button from '@/components/UI/Button';
import SourcesModal from '@/components/Settings/SourcesModal';
import UsersModal from '@/components/Settings/UsersModal';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import DashboardGrid from '@/components/Dashboard/DashboardGrid';
import CreateOrderModal, { CreateOrderInitialValues } from '@/components/Orders/CreateOrderModal';
import RoistatLeadsPanel from '@/components/Roistat/RoistatLeadsPanel';
import { RoistatLead } from '@/lib/api';
import OrderDetailsModal from '@/components/Orders/OrderDetailsModal';
import SearchModal from '@/components/Search/SearchModal';
import MobileNavbar from '@/components/UI/MobileNavbar';
import { useOrderStore } from '@/store/orderStore';
import { useAuth } from '@/contexts/AuthContext';
import { Order } from '@/types';
import { api } from '@/lib/api';
import { isDemoMode } from '@/lib/isDemoMode';
import { DemoPhoneCallModal } from '@/components/demo/DemoPhoneCallModal';
import { CrmProjectId, DEFAULT_PROJECT_ID, getProject } from '@/lib/projects';
import { SOURCES_UPDATED_EVENT, type SourcesUpdatedDetail } from '@/demo/events';

/* ─── Master read-only view ─────────────────────────────────── */
function MasterView() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { orders, isLoading: activeLoading, fetchOrders } = useOrderStore();
  const [tab, setTab] = useState<'active' | 'history'>('active');
  const [historyOrders, setHistoryOrders] = useState<Order[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [demoCallPhone, setDemoCallPhone] = useState<string | null>(null);

  const loadOrders = useCallback(() => { fetchOrders(); }, [fetchOrders]);
  const loadHistory = useCallback(async (showSpinner = true) => {
    if (!user?.canViewOwnOrderHistory) return [] as Order[];
    if (showSpinner) setHistoryLoading(true);
    try {
      const data = await api.getMasterOrderHistory();
      setHistoryOrders(data);
      setSelectedOrder(current => {
        if (!current) return null;
        return data.find(item => item.id === current.id) || null;
      });
      return data;
    } finally {
      if (showSpinner) setHistoryLoading(false);
    }
  }, [user?.canViewOwnOrderHistory]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    if (tab === 'history') void loadHistory();
  }, [tab, loadHistory]);

  useEffect(() => {
    if (tab !== 'history') return;
    const refresh = () => { void loadHistory(false); };
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [tab, loadHistory]);

  const displayedOrders = tab === 'history' ? historyOrders : orders;
  const isLoading = tab === 'history' ? historyLoading : activeLoading;
  const grouped = displayedOrders.reduce<Record<string, Order[]>>((acc, o) => {
    (acc[o.date] = acc[o.date] || []).push(o);
    return acc;
  }, {});

  const handleMasterCall = (order: Order, phoneIndex: number) => {
    const phone = order.phones?.[phoneIndex];
    if (!phone) return;
    if (isDemoMode) {
      setDemoCallPhone(phone);
      return;
    }
    void api.initiateOrderCall(order.id, phoneIndex);
  };

  const getPhoneLabels = (order: Order): string[] => {
    if (order.phoneLabels?.length) return order.phoneLabels;
    const count = order.phoneCount ?? order.phones?.length ?? 0;
    return Array.from({ length: count }, (_, i) => `Телефон ${i + 1}`);
  };

  const statusBadge = (o: Order) => {
    const m: Record<string, string> = { in_progress: 'bg-blue-100 text-blue-700', completed: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700' };
    const l: Record<string, string> = { in_progress: 'В работе', completed: 'Выполнен', cancelled: 'Отменён' };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${m[o.status]}`}>{l[o.status]}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 safe-top">
        <div className="px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-lg">🔧</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Мои заказы</h1>
              <p className="text-xs text-gray-500">{user?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => void (tab === 'history' ? loadHistory() : loadOrders())} disabled={isLoading} className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 disabled:opacity-50">
              <svg className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
            <button onClick={() => { logout(); navigate('/login'); }} className="p-2 rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          </div>
        </div>
      </header>

      <div className="bg-white border-b px-4 py-2 flex items-center justify-center gap-2 shadow-sm">
        <button
          type="button"
          onClick={() => setTab('active')}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === 'active' ? 'bg-green-100 text-green-700' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          Актуальные
        </button>
        {user?.canViewOwnOrderHistory && (
          <button
            type="button"
            onClick={() => setTab('history')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === 'history' ? 'bg-green-100 text-green-700' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            История
          </button>
        )}
      </div>

      <main className="p-4 space-y-4 max-w-2xl mx-auto">
        {displayedOrders.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-4">📋</div>
            <p>{tab === 'history' ? 'Прошлых заказов нет.' : 'Актуальных заказов нет.'}</p>
          </div>
        ) : (
          Object.entries(grouped)
            .sort(([a], [b]) => tab === 'history' ? b.localeCompare(a) : a.localeCompare(b))
            .map(([date, dayOrders]) => (
            <div key={date}>
              <h3 className="text-sm font-semibold text-gray-500 mb-2 pl-1">
                {new Date(date + 'T00:00:00').toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', weekday: 'short' })}
              </h3>
              <div className="space-y-2">
                {dayOrders.sort((a, b) => a.time.localeCompare(b.time)).map(order => (
                  <div key={order.id} onClick={() => {
                    if (tab !== 'history') {
                      setSelectedOrder(order);
                      return;
                    }
                    void loadHistory(false).then(data => {
                      setSelectedOrder((data || []).find(item => item.id === order.id) || order);
                    });
                  }}
                    className={`bg-white rounded-xl border p-4 cursor-pointer hover:shadow-md transition-shadow active:bg-gray-50 ${order.orderType === 'primary' ? 'border-green-200' : 'border-amber-200'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-medium text-gray-900">{order.clientName}</span>
                          {statusBadge(order)}
                        </div>
                        <p className="text-sm text-gray-600 font-medium">
                          {order.time.slice(0, 5)} • {order.pest} • {order.objectType}
                        </p>
                        <p className="text-sm text-gray-400 mt-1 truncate">{order.address}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="font-bold text-gray-900 text-lg">{(order.finalAmount || order.basePrice).toLocaleString()} ₽</div>
                        {order.orderType === 'secondary' && <span className="text-xs text-amber-600 font-medium">Повтор</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </main>

      {/* Read-only order details modal for master */}
      <Modal isOpen={!!selectedOrder} onClose={() => setSelectedOrder(null)} title="Детали заказа" size="lg">
        {selectedOrder && (
          <div className="space-y-4">
            <div className={`p-4 rounded-2xl text-white bg-gradient-to-br ${selectedOrder.status === 'completed' ? 'from-gray-400 to-gray-500' : selectedOrder.status === 'cancelled' ? 'from-red-500 to-red-600' : selectedOrder.orderType === 'primary' ? 'from-green-500 to-emerald-600' : 'from-amber-400 to-amber-500'}`}>
              <div className="flex justify-between items-start gap-4">
                <div className="min-w-0">
                  <div className="flex gap-2 items-center mb-1 flex-wrap">
                    {selectedOrder.orderNumber && <span className="px-2 py-0.5 bg-white/30 rounded-full text-xs font-bold">#{selectedOrder.orderNumber}</span>}
                    <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-medium">{selectedOrder.orderType === 'primary' ? 'Первичный' : 'Повторный'}</span>
                  </div>
                  <h3 className="text-xl font-bold mt-1 truncate">{selectedOrder.clientName}</h3>
                  <p className="opacity-90 mt-1 text-sm">{selectedOrder.pest} • {selectedOrder.objectType}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-2xl font-bold">{(selectedOrder.finalAmount || selectedOrder.basePrice).toLocaleString()} ₽</div>
                  <div className="text-xs opacity-80">{selectedOrder.finalAmount ? 'итоговая сумма' : 'базовая цена'}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                <h4 className="font-medium text-gray-900 mb-3">ℹ️ Информация</h4>
                {[
                  ['Дата', new Date(selectedOrder.date + 'T00:00:00').toLocaleDateString('ru-RU')],
                  ['Создан', new Date(selectedOrder.createdAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })],
                  ['Время', selectedOrder.time],
                  ['Объём', selectedOrder.volume || '-'],
                ].map(([k, v]) =>
                  <div key={k} className="flex justify-between border-b border-gray-100 pb-1 last:border-0 last:pb-0">
                    <span className="text-gray-500">{k}:</span>
                    <span className="font-medium text-gray-900">{v}</span>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                <h4 className="font-medium text-gray-900 mb-3">📍 Контакты</h4>
                <div className="mb-3">
                  <span className="text-gray-500 block mb-1">Адрес:</span>
                  <p className="font-medium text-gray-900 break-words">{selectedOrder.address}</p>
                </div>
                <div>
                  <span className="text-gray-500 block mb-1">Телефоны:</span>
                  <div className="flex flex-col gap-2">
                    {getPhoneLabels(selectedOrder).map((label, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleMasterCall(selectedOrder, i)}
                        className="inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-white rounded-lg text-green-700 font-medium border border-green-200 hover:bg-green-50 transition-colors"
                      >
                        📞 {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {selectedOrder.comment && (
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <h4 className="font-medium text-blue-900 mb-2">💬 Комментарий</h4>
                <p className="text-blue-800 text-sm whitespace-pre-wrap">{selectedOrder.comment}</p>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-gray-100 mt-2">
              <Button variant="secondary" onClick={() => setSelectedOrder(null)} className="w-full sm:w-auto">
                Закрыть
              </Button>
            </div>
          </div>
        )}
      </Modal>
      <DemoPhoneCallModal open={!!demoCallPhone} phone={demoCallPhone || ''} onClose={() => setDemoCallPhone(null)} />
    </div>
  );
}

/* ─── Admin / Operator dashboard ────────────────────────────── */
function DashboardContent() {
  const navigate = useNavigate();
  const { logout, user, hasRole } = useAuth();
  const { orders, isLoading, error, fetchOrders, clearError } = useOrderStore();
  const activeProjectId: CrmProjectId = DEFAULT_PROJECT_ID;

  const [showUsersModal, setShowUsersModal] = useState(false);
  const [showSourcesModal, setShowSourcesModal] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; time: string } | null>(null);
  const [createInitialValues, setCreateInitialValues] = useState<CreateOrderInitialValues | null>(null);
  const [roistatRefreshKey, setRoistatRefreshKey] = useState(0);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dates = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1));
  const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  const monthsShort = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

  const isPollingPaused = showUsersModal || showSourcesModal || showCreateModal || showSearchModal || Boolean(selectedOrder);
  const activeProject = getProject(activeProjectId);
  const loadOrders = useCallback(
    (silent = false) => { fetchOrders(year, month + 1, { silent }); },
    [fetchOrders, year, month],
  );

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    const onSourcesUpdated = (event: Event) => {
      const detail = (event as CustomEvent<SourcesUpdatedDetail>).detail;
      if (detail?.oldName && detail?.newName) {
        useOrderStore.getState().renameSourceOnOrders(detail.oldName, detail.newName);
      }
      setRoistatRefreshKey(k => k + 1);
      loadOrders(true);
    };
    window.addEventListener(SOURCES_UPDATED_EVENT, onSourcesUpdated);
    return () => window.removeEventListener(SOURCES_UPDATED_EVENT, onSourcesUpdated);
  }, [loadOrders]);

  // Pause background refresh while a modal is open so nested task forms do not reset mid-edit.
  useEffect(() => {
    if (isPollingPaused) return;

    const i = setInterval(() => loadOrders(true), 60000);
    return () => clearInterval(i);
  }, [isPollingPaused, loadOrders]);

  const changeMonth = (d: number) => setCurrentDate(new Date(year, month + d, 1));
  const handleSlotClick = (date: string, time: string) => {
    setSelectedSlot({ date, time });
    setCreateInitialValues(null);
    setShowCreateModal(true);
  };
  const handleOrderCreated = () => {
    setShowCreateModal(false);
    setSelectedSlot(null);
    setCreateInitialValues(null);
    setRoistatRefreshKey(key => key + 1);
    loadOrders();
  };
  const handleCreateFromRoistatLead = (lead: RoistatLead) => {
    const rawComment = (lead.comment || '').trim();
    const junkComment = /Автоприглашение/i.test(rawComment)
      || /https?:\/\//i.test(rawComment)
      || /\bxn--/i.test(rawComment);
    setSelectedSlot(null);
    setCreateInitialValues({
      clientName: lead.name || 'Неизвестный контакт',
      phones: [lead.phone],
      source: lead.source || '',
      comment: junkComment ? '' : rawComment,
      roistatVisitId: lead.roistatVisitId || undefined,
      roistatLeadId: lead.roistatLeadId || undefined,
      roistatLeadRecordId: lead.id,
      ymClientId: lead.ymClientId || undefined,
      yclid: lead.yclid || undefined,
      yandexCampaignId: lead.yandexCampaignId || undefined,
    });
    setShowCreateModal(true);
  };
  const handleOrderUpdated = () => { setSelectedOrder(null); loadOrders(); };
  const handleLogout = () => { logout(); navigate('/login'); };
  const isAdmin = hasRole('admin');
  const canCreate = hasRole('admin', 'operator');

  const mobileQuickActions: { label: string; icon: string; onClick: () => void }[] = [
    ...(canCreate
      ? [
          { label: 'Создать', icon: '+', onClick: () => { setSelectedSlot(null); setCreateInitialValues(null); setShowCreateModal(true); } },
          { label: 'Поиск', icon: '🔍', onClick: () => setShowSearchModal(true) },
          { label: 'Распределение', icon: '📋', onClick: () => navigate('/distribution') },
        ]
      : []),
    { label: 'Прозвоны', icon: '📞', onClick: () => navigate('/calls') },
    { label: 'Задачи', icon: '✅', onClick: () => navigate('/tasks') },
    ...(isAdmin
      ? [
          { label: 'Статистика', icon: '📊', onClick: () => navigate('/statistics') },
          { label: 'Журнал', icon: '👁', onClick: () => navigate('/activity') },
          { label: 'Мастера', icon: '📚', onClick: () => navigate('/master-history') },
          { label: 'Пользователи', icon: '👥', onClick: () => setShowUsersModal(true) },
          { label: 'Источники', icon: '📢', onClick: () => setShowSourcesModal(true) },
        ]
      : []),
  ];

  const stats = {
    primary: orders.filter(o => o.orderType === 'primary' && o.status === 'in_progress').length,
    secondary: orders.filter(o => o.orderType === 'secondary' && o.status === 'in_progress').length,
    completed: orders.filter(o => o.status === 'completed').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-0">
      {/* Desktop Header */}
      <header className="hidden sm:block bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="mx-auto max-w-[1600px] px-4 lg:px-6 py-3">
          <div className="flex min-w-0 items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex shrink-0 items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/20">
                  <span className="text-xl text-white">{activeProject.icon}</span>
                </div>
                <div className="min-w-0">
                  <h1 className="truncate text-lg font-bold text-gray-900">{activeProject.name}</h1>
                  <p className="truncate text-xs font-medium text-gray-500">
                    {user?.name} <span className="mx-1">•</span>
                    <span className={isAdmin ? 'text-purple-600' : 'text-blue-600'}>
                      {isAdmin ? 'Администратор' : 'Оператор'}
                    </span>
                  </p>
                </div>
              </div>
              {isLoading && (
                <div className="hidden lg:flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-600">
                  <div className="size-3.5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                  Обновление...
                </div>
              )}
              {error && (
                <button type="button" onClick={clearError} className="hidden lg:flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100">
                  ⚠️ {error}
                </button>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button type="button" onClick={() => void loadOrders()} disabled={isLoading} className="rounded-xl p-2.5 text-gray-500 hover:bg-gray-100 disabled:opacity-50" title="Обновить">
                <svg className={`size-5 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              </button>
              <button type="button" onClick={handleLogout} className="rounded-xl p-2.5 text-gray-500 hover:bg-red-50 hover:text-red-600" title="Выйти">
                <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
            {canCreate && <Button size="sm" onClick={() => { setSelectedSlot(null); setCreateInitialValues(null); setShowCreateModal(true); }} variant="success" icon="+">Создать</Button>}
            {canCreate && <Button size="sm" onClick={() => setShowSearchModal(true)} variant="secondary" icon="🔍">Поиск</Button>}
            {canCreate && <Button size="sm" onClick={() => navigate('/distribution')} variant="secondary" icon="📋">Распределение</Button>}
            <Button size="sm" onClick={() => navigate('/calls')} variant="secondary" icon="📞">Прозвоны</Button>
            <Button size="sm" onClick={() => navigate('/tasks')} variant="secondary" icon="✅">Задачи</Button>
            {isAdmin && <Button size="sm" onClick={() => navigate('/statistics')} variant="secondary" icon="📊">Статистика</Button>}
            {isAdmin && <Button size="sm" onClick={() => navigate('/activity')} variant="secondary" icon="👁">Журнал</Button>}
            {isAdmin && <Button size="sm" onClick={() => navigate('/master-history')} variant="secondary" icon="📚">Мастера</Button>}
            {isAdmin && <Button size="sm" onClick={() => setShowUsersModal(true)} variant="secondary" icon="👥">Пользователи</Button>}
            {isAdmin && <Button size="sm" onClick={() => setShowSourcesModal(true)} variant="secondary" icon="📢">Источники</Button>}
          </div>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="sm:hidden bg-white border-b border-gray-200 sticky top-0 z-30 safe-top shadow-sm">
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-emerald-600">
              <span className="text-white">{activeProject.icon}</span>
            </div>
            <div className="min-w-0">
              <span className="block truncate font-bold leading-none text-gray-900">{activeProject.shortName}</span>
              <span className="text-[10px] font-medium text-gray-500">{isAdmin ? 'Админ' : 'Оператор'}</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button type="button" onClick={() => void loadOrders()} disabled={isLoading} className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 active:bg-gray-200" title="Обновить" aria-label="Обновить">
              <svg className={`size-5 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
            <button type="button" onClick={handleLogout} className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 active:bg-red-100" title="Выйти" aria-label="Выйти">
              <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 border-t border-gray-100 px-4 pb-3 pt-2">
          {mobileQuickActions.map(({ label, icon, onClick }) => (
            <button
              key={label}
              type="button"
              title={label}
              aria-label={label}
              onClick={onClick}
              className="flex h-10 min-w-[2.5rem] items-center justify-center rounded-xl bg-gray-50 px-2.5 text-lg text-gray-800 active:bg-gray-200"
            >
              {icon}
            </button>
          ))}
        </div>
      </header>

      {/* Date Navigation & Stats Subheader */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-2 sm:py-3 shadow-sm z-20 relative">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">

          <div className="flex min-w-0 items-center justify-between sm:justify-start">
            <div className="flex items-center gap-1 sm:gap-2">
              <button onClick={() => changeMonth(-1)} className="p-2 -ml-2 sm:ml-0 rounded-xl text-gray-500 hover:bg-gray-100 active:bg-gray-200 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>

              <button onClick={() => setCurrentDate(new Date())} className="font-semibold text-gray-900 min-w-[120px] sm:min-w-[150px] text-center hover:bg-gray-50 py-1.5 rounded-lg transition-colors">
                <span className="hidden sm:inline">{months[month]}</span>
                <span className="sm:hidden">{monthsShort[month]}</span>
                {' '}{year}
              </button>

              <button onClick={() => changeMonth(1)} className="p-2 -mr-2 sm:mr-0 rounded-xl text-gray-500 hover:bg-gray-100 active:bg-gray-200 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>

            <button
              onClick={() => setCurrentDate(new Date())}
              className="hidden sm:block ml-4 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
            >
              Сегодня
            </button>
          </div>

          <div className="flex items-center justify-center sm:justify-end gap-1.5 sm:gap-2 shrink-0">
            <div title="Первичные в работе" className="flex items-center gap-1 rounded-lg bg-green-50 px-2 py-1 sm:px-2.5 sm:py-1.5">
              <span className="size-2.5 shrink-0 rounded-full bg-green-500" aria-hidden />
              <span className="text-sm font-bold tabular-nums text-green-800">{stats.primary}</span>
            </div>
            <div title="Повторные в работе" className="flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 sm:px-2.5 sm:py-1.5">
              <span className="size-2.5 shrink-0 rounded-full bg-amber-500" aria-hidden />
              <span className="text-sm font-bold tabular-nums text-amber-800">{stats.secondary}</span>
            </div>
            <div title="Выполнены" className="flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 sm:px-2.5 sm:py-1.5">
              <span className="size-2.5 shrink-0 rounded-full bg-gray-400" aria-hidden />
              <span className="text-sm font-bold tabular-nums text-gray-800">{stats.completed}</span>
            </div>
            <div title="Отменены" className="flex items-center gap-1 rounded-lg bg-red-50 px-2 py-1 sm:px-2.5 sm:py-1.5">
              <span className="size-2.5 shrink-0 rounded-full bg-red-500" aria-hidden />
              <span className="text-sm font-bold tabular-nums text-red-800">{stats.cancelled}</span>
            </div>
          </div>

        </div>
      </div>

      <main className="p-3 sm:p-6">
        {canCreate && (
          <RoistatLeadsPanel
            key={activeProjectId}
            onCreateFromLead={handleCreateFromRoistatLead}
            refreshKey={roistatRefreshKey}
          />
        )}
        <DashboardGrid
          dates={dates}
          orders={orders}
          onOrderClick={setSelectedOrder}
          onSlotClick={canCreate ? handleSlotClick : () => { }}
        />
      </main>

      {canCreate && (
        <MobileNavbar
          onCreateClick={() => { setSelectedSlot(null); setCreateInitialValues(null); setShowCreateModal(true); }}
          onSearchClick={() => setShowSearchModal(true)}
          onTasksClick={() => navigate('/tasks')}
          onStatsClick={() => isAdmin ? navigate('/statistics') : navigate('/calls')}
          onDistributionClick={() => navigate('/distribution')}
          compact={false}
        />
      )}

      {/* Modals */}
      {canCreate && (
        <CreateOrderModal
          isOpen={showCreateModal}
          onClose={() => { setShowCreateModal(false); setSelectedSlot(null); setCreateInitialValues(null); }}
          onSuccess={handleOrderCreated}
          selectedDate={selectedSlot?.date}
          selectedTime={selectedSlot?.time}
          initialValues={createInitialValues}
        />
      )}

      <OrderDetailsModal
        order={
          selectedOrder
            ? orders.find(o => o.id === selectedOrder.id) ?? selectedOrder
            : null
        }
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onSuccess={handleOrderUpdated}
      />

      {canCreate && (
        <SearchModal
          isOpen={showSearchModal}
          onClose={() => setShowSearchModal(false)}
          onSelectOrder={setSelectedOrder}
        />
      )}

      {isAdmin && (
        <>
          <UsersModal isOpen={showUsersModal} onClose={() => setShowUsersModal(false)} />
          <SourcesModal isOpen={showSourcesModal} onClose={() => setShowSourcesModal(false)} />
        </>
      )}
    </div>
  );
}

/* ─── Page export — route by role ───────────────────────────── */
export default function Dashboard() {
  return (
    <ProtectedRoute>
      <RoleRouter />
    </ProtectedRoute>
  );
}

function RoleRouter() {
  const { user } = useAuth();

  if (!user) return null;

  if (user.role === 'master') {
    return <MasterView />;
  }

  return <DashboardContent />;
}
