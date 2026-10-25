
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import api, { Order, WorkingMaster } from '@/lib/api';
import OrderDetailsModal from '@/components/Orders/OrderDetailsModal';

const WEEKDAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTH_NAMES = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

function DistributionContent() {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [workingMasters, setWorkingMasters] = useState<WorkingMaster[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [assigningOrderId, setAssigningOrderId] = useState<string | null>(null);
    const [mobileFilter, setMobileFilter] = useState<string>('all');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [calDate, setCalDate] = useState(() => new Date());
    const datePickerRef = useRef<HTMLDivElement>(null);
    const selected = new Date(selectedDate + 'T00:00:00');
    const calYear = calDate.getFullYear();
    const calMonth = calDate.getMonth() + 1;

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [o, m] = await Promise.all([api.getOrders({ date: selectedDate }), api.getWorkingMasters(selectedDate)]);
            setOrders(o); setWorkingMasters(m);
        } catch (err) { console.error(err); }
        finally { setIsLoading(false); }
    }, [selectedDate]);

    useEffect(() => { loadData(); }, [loadData]);

    useEffect(() => {
        if (!showDatePicker) return;
        const onPointer = (e: MouseEvent) => {
            if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
                setShowDatePicker(false);
            }
        };
        document.addEventListener('mousedown', onPointer);
        return () => document.removeEventListener('mousedown', onPointer);
    }, [showDatePicker]);

    const unassignedOrders = orders.filter(o => !o.masterId && o.status === 'in_progress');
    const getOrdersForMaster = (id: string) => orders.filter(o => o.masterId === id);
    const getMasterCashDesk = (id: string) =>
        getOrdersForMaster(id)
            .filter(o => o.status === 'completed')
            .reduce((sum, o) => sum + (o.cashDesk || 0), 0);

    const calendarDays = (() => {
        const firstDay = new Date(calYear, calMonth - 1, 1);
        let startDow = firstDay.getDay();
        startDow = startDow === 0 ? 6 : startDow - 1;
        const daysInMonth = new Date(calYear, calMonth, 0).getDate();
        const cells: (string | null)[] = [];
        for (let i = 0; i < startDow; i++) cells.push(null);
        for (let d = 1; d <= daysInMonth; d++) {
            cells.push(`${calYear}-${String(calMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
        }
        return cells;
    })();

    const shiftMonth = (delta: number) => {
        setCalDate(new Date(calYear, calMonth - 1 + delta, 1));
    };

    const handleAssign = async (orderId: string, masterId: string | null) => {
        try {
            const master = masterId ? workingMasters.find(m => m.id === masterId) : null;
            await api.updateOrder(orderId, {
                masterId: masterId, masterName: master?.name || '', masterContact: master?.phone || '',
            });
            await loadData();
            setAssigningOrderId(null);
        } catch (err) { console.error(err); }
    };

    const getCardClass = (order: Order) => {
        if (order.status === 'cancelled') return 'border-red-300 bg-red-50';
        if (order.status === 'completed') return 'border-gray-300 bg-gray-50';
        if (!order.masterId && order.status === 'in_progress') {
            return order.orderType === 'primary' ? 'border-green-300 bg-green-50 ring-2 ring-red-400' : 'border-amber-300 bg-amber-50 ring-2 ring-red-400';
        }
        return order.orderType === 'primary' ? 'border-green-300 bg-green-50' : 'border-amber-300 bg-amber-50';
    };

    const OrderCard = ({ order }: { order: Order }) => (
        <div className={`rounded-xl border-2 p-3 transition-all ${getCardClass(order)}`}>
            <button type="button" onClick={() => setSelectedOrder(order)} className="w-full text-left">
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${order.masterCheckStatus === 'checked' ? 'bg-green-500' : order.masterCheckStatus === 'issue' ? 'bg-amber-500' : 'bg-red-500'}`} />
                        <span className="font-medium text-sm text-gray-900 truncate">{order.clientName}</span>
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5">{order.time.slice(0, 5)} • {order.pest}</div>
                    <div className="text-xs text-gray-400 truncate mt-0.5">{order.address}</div>
                    {order.orderNumber && <div className="text-[10px] text-blue-700 mt-0.5">#{order.orderNumber}</div>}
                </div>
                <div className="text-right flex-shrink-0">
                    <div className="font-bold text-sm text-gray-900">{(order.finalAmount || order.basePrice).toLocaleString()} ₽</div>
                    <div className="text-[10px] text-gray-400">{order.orderType === 'primary' ? '1°' : '2°'}</div>
                </div>
            </div>
            </button>
            {order.status === 'in_progress' && (
                <div className="mt-2 pt-2 border-t border-gray-200/50">
                    {assigningOrderId === order.id ? (
                        <div className="space-y-1">
                            <button onClick={() => handleAssign(order.id, null)} className="w-full text-left px-2 py-1.5 text-xs rounded-lg hover:bg-white text-gray-500">— Снять назначение —</button>
                            {workingMasters.map(m => (
                                <button key={m.id} onClick={() => handleAssign(order.id, m.id)}
                                    className={`w-full text-left px-2 py-1.5 text-xs rounded-lg hover:bg-white ${order.masterId === m.id ? 'font-bold text-green-700 bg-green-100' : 'text-gray-700'}`}>
                                    {m.name} {m.avgCheck > 0 && `(${m.avgCheck.toLocaleString()}₽)`}
                                </button>
                            ))}
                            <button onClick={() => setAssigningOrderId(null)} className="w-full text-center px-2 py-1 text-xs text-gray-400 hover:text-gray-600">Отмена</button>
                        </div>
                    ) : (
                        <button onClick={() => setAssigningOrderId(order.id)}
                            className={`w-full text-center px-2 py-1.5 text-xs rounded-lg transition-colors ${order.masterId ? 'text-green-700 bg-green-100/50 hover:bg-green-100' : 'text-red-600 bg-red-100/50 hover:bg-red-100 font-medium'}`}>
                            {order.masterId ? `✓ ${order.masterName || 'Назначен'}` : '⚠ Назначить мастера'}
                        </button>
                    )}
                </div>
            )}
        </div>
    );

    const Column = ({ title, subtitle, orders: colOrders, highlight }: { title: string; subtitle?: React.ReactNode; orders: Order[]; highlight?: boolean }) => (
        <div className={`flex-shrink-0 w-72 sm:w-80 rounded-2xl border overflow-hidden ${highlight ? 'border-red-200 bg-red-50/30' : 'border-gray-200 bg-gray-50/30'}`}>
            <div className={`px-4 py-3 ${highlight ? 'bg-red-100' : 'bg-gray-100'}`}>
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className={`font-semibold text-sm ${highlight ? 'text-red-800' : 'text-gray-800'}`}>{title}</h3>
                        {subtitle && <div className="text-xs text-gray-500 mt-0.5">{subtitle}</div>}
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${highlight ? 'bg-red-200 text-red-800' : 'bg-gray-200 text-gray-700'}`}>{colOrders.length}</span>
                </div>
            </div>
            <div className="p-3 space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto touch-scroll">
                {colOrders.length === 0 ? <p className="text-center text-xs text-gray-400 py-8">Нет заказов</p> : colOrders.map(o => <OrderCard key={o.id} order={o} />)}
            </div>
        </div>
    );

    const filterOptions = [
        { value: 'all', label: `Все (${orders.length})` },
        { value: 'unassigned', label: `Нераспред. (${unassignedOrders.length})` },
        ...workingMasters.map(m => ({ value: m.id, label: `${m.name} (${getOrdersForMaster(m.id).length})` })),
    ];

    const mobileOrders = mobileFilter === 'all' ? orders : mobileFilter === 'unassigned' ? unassignedOrders : getOrdersForMaster(mobileFilter);

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-200 sticky top-0 z-30 safe-top">
                <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/')} className="p-2 -ml-2 rounded-xl text-gray-500 hover:bg-gray-100">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-gray-900">📋 Распределение</h1>
                            <p className="text-xs text-gray-500 hidden sm:block">Назначение мастеров на заказы</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative" ref={datePickerRef}>
                            <button
                                type="button"
                                onClick={() => {
                                    setCalDate(new Date(selectedDate + 'T00:00:00'));
                                    setShowDatePicker(v => !v);
                                }}
                                className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                            >
                                {selected.toLocaleDateString('ru-RU')}
                            </button>
                            {showDatePicker && (
                                <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-gray-200 bg-white p-3 shadow-lg">
                                    <div className="mb-2 flex items-center justify-between">
                                        <button type="button" onClick={() => shiftMonth(-1)} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100">
                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                        </button>
                                        <span className="text-sm font-medium text-gray-900">{MONTH_NAMES[calMonth - 1]} {calYear}</span>
                                        <button type="button" onClick={() => shiftMonth(1)} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100">
                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-7 gap-1 text-center">
                                        {WEEKDAYS_SHORT.map(d => <div key={d} className="py-1 text-xs font-medium text-gray-500">{d}</div>)}
                                        {calendarDays.map((dateStr, i) => (
                                            <div key={i}>
                                                {dateStr ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => { setSelectedDate(dateStr); setShowDatePicker(false); }}
                                                        className={`aspect-square w-full rounded-lg text-xs font-medium transition-colors
                                                            ${dateStr === selectedDate ? 'bg-green-500 text-white' : 'text-gray-700 hover:bg-gray-100'}
                                                            ${dateStr === new Date().toISOString().split('T')[0] && dateStr !== selectedDate ? 'ring-1 ring-green-400' : ''}`}
                                                    >
                                                        {parseInt(dateStr.split('-')[2], 10)}
                                                    </button>
                                                ) : <div />}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <button onClick={loadData} disabled={isLoading} className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 disabled:opacity-50">
                            <svg className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        </button>
                    </div>
                </div>
            </header>

            <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-2">
                <div className="flex items-center gap-4 text-sm flex-wrap">
                    <span className="text-gray-500">Всего: <b>{orders.length}</b></span>
                    <span className="text-red-600">Нераспределённых: <b>{unassignedOrders.length}</b></span>
                    <span className="text-green-600">Работают: <b>{workingMasters.length}</b> мастеров</span>
                    {workingMasters.length === 0 && <span className="text-amber-600 text-xs">⚠ Нет мастеров на эту дату</span>}
                </div>
            </div>

            {/* Mobile Filter */}
            <div className="sm:hidden bg-white border-b border-gray-100 px-4 py-2">
                <select value={mobileFilter} onChange={e => setMobileFilter(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm appearance-none">
                    {filterOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
            </div>

            {/* Desktop Kanban */}
            <main className="hidden sm:block p-6">
                <div className="flex gap-4 overflow-x-auto touch-scroll pb-4" style={{ minHeight: '400px' }}>
                    <Column title="Нераспределённые" orders={unassignedOrders} highlight />
                    {workingMasters.map(m => {
                        const cashDesk = getMasterCashDesk(m.id);
                        return (
                            <Column
                                key={m.id}
                                title={m.name}
                                subtitle={
                                    <>
                                        <div>Ср. чек: {m.avgCheck > 0 ? `${m.avgCheck.toLocaleString()} ₽` : '—'}</div>
                                        <div className="font-medium text-green-700">Касса: {cashDesk.toLocaleString()} ₽</div>
                                        {m.notes ? <div>{m.notes}</div> : null}
                                    </>
                                }
                                orders={getOrdersForMaster(m.id)}
                            />
                        );
                    })}
                </div>
            </main>

            {/* Mobile List */}
            <main className="sm:hidden p-4">
                <div className="space-y-2">
                    {mobileOrders.length === 0 ? <div className="text-center py-12 text-gray-400">Нет заказов</div> : mobileOrders.map(o => <OrderCard key={o.id} order={o} />)}
                </div>
            </main>
            <OrderDetailsModal
                order={selectedOrder}
                isOpen={Boolean(selectedOrder)}
                onClose={() => setSelectedOrder(null)}
                onSuccess={() => { setSelectedOrder(null); void loadData(); }}
            />
        </div>
    );
}

export default function DistributionPage() {
    return (
        <ProtectedRoute allowedRoles={['admin', 'operator']}>
            <DistributionContent />
        </ProtectedRoute>
    );
}
