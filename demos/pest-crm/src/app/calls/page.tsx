
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import OrderDetailsModal from '@/components/Orders/OrderDetailsModal';
import { useAuth } from '@/contexts/AuthContext';
import api, { Order } from '@/lib/api';

function CallsContent() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [filter, setFilter] = useState<'unchecked' | 'all' | 'issue'>('unchecked');

    const loadOrders = useCallback(async (silent = false) => {
        if (!silent) setIsLoading(true);
        try {
            const now = new Date();
            const data = await api.getOrders({
                year: String(now.getFullYear()),
                month: String(now.getMonth() + 1),
            });
            setOrders(data);
        } catch (err) {
            console.error(err);
        } finally {
            if (!silent) setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadOrders();
    }, [loadOrders]);

    const filteredOrders = orders.filter(o => {
        if (o.status === 'cancelled') return false; // Отменённые прозванивать не нужно

        if (filter === 'unchecked') {
            return !o.masterCheckStatus || o.masterCheckStatus === 'unchecked';
        }
        if (filter === 'issue') {
            return o.masterCheckStatus === 'issue';
        }
        return true; // filter === 'all'
    }).sort((a, b) => {
        // Сначала непроверенные, затем по дате
        const aCheck = a.masterCheckStatus === 'checked' ? 1 : 0;
        const bCheck = b.masterCheckStatus === 'checked' ? 1 : 0;
        if (aCheck !== bCheck) return aCheck - bCheck;
        return a.date.localeCompare(b.date) || a.time.localeCompare(b.time);
    });

    const checkBadge = (status?: string) => {
        if (status === 'checked') return <span className="w-3 h-3 rounded-full bg-green-500 shadow-sm" title="Проверен" />;
        if (status === 'issue') return <span className="w-3 h-3 rounded-full bg-amber-500 shadow-sm animate-pulse" title="Проблема" />;
        return <span className="w-3 h-3 rounded-full bg-red-500 shadow-sm" title="Не проверен" />;
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-8">
            <header className="bg-white border-b border-gray-200 sticky top-0 z-30 safe-top shadow-sm">
                <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/')} className="p-2 -ml-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                📞 Прозвоны
                            </h1>
                            <p className="text-xs text-gray-500">Сверка с мастерами</p>
                        </div>
                    </div>
                    <button
                        onClick={() => void loadOrders()}
                        disabled={isLoading}
                        className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 disabled:opacity-50 transition-colors"
                    >
                        <svg className={`w-6 h-6 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </button>
                </div>
            </header>

            {/* Filter Tabs */}
            <div className="bg-white border-b border-gray-100 px-4 py-3 sticky top-[60px] sm:top-[72px] z-20">
                <div className="flex rounded-xl bg-gray-100 p-1 max-w-2xl mx-auto">
                    <button
                        onClick={() => setFilter('unchecked')}
                        className={`flex-1 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-2 ${filter === 'unchecked' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                        <span className="hidden sm:inline">Не проверены</span>
                        <span className="sm:hidden">В ожидании</span>
                        {filter === 'unchecked' && <span className="ml-1 text-gray-400">({filteredOrders.length})</span>}
                    </button>

                    <button
                        onClick={() => setFilter('issue')}
                        className={`flex-1 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-2 ${filter === 'issue' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        Проблемы
                        {filter === 'issue' && <span className="ml-1 text-gray-400">({filteredOrders.length})</span>}
                    </button>

                    <button
                        onClick={() => setFilter('all')}
                        className={`flex-1 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${filter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        Все ({orders.filter(o => o.status !== 'cancelled').length})
                    </button>
                </div>
            </div>

            <main className="p-4 max-w-4xl mx-auto">
                {isLoading && filteredOrders.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="inline-block w-8 h-8 rounded-full border-4 border-gray-200 border-t-green-500 animate-spin"></div>
                        <p className="mt-4 text-gray-500 font-medium">Загрузка данных...</p>
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
                        <div className="text-6xl mb-4">✨</div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">Отличная работа!</h3>
                        <p className="text-gray-500">
                            {filter === 'unchecked' ? 'Все заказы проверены.' : filter === 'issue' ? 'Проблемных заказов нет.' : 'Заказов не найдено.'}
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-3 sm:gap-4">
                        {filteredOrders.map(order => (
                            <div
                                key={order.id}
                                onClick={() => setSelectedOrder(order)}
                                className={`
                  bg-white rounded-2xl p-4 sm:p-5 cursor-pointer transition-all hover:shadow-md active:scale-[0.99]
                  border-l-4 
                  ${!order.masterCheckStatus || order.masterCheckStatus === 'unchecked' ? 'border-l-red-400 border-y border-r border-gray-100' :
                                        order.masterCheckStatus === 'issue' ? 'border-l-amber-400 border-y border-r border-gray-100' : 'border-l-green-400 border-y border-r border-gray-100'}
                `}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                            {checkBadge(order.masterCheckStatus)}
                                            <span className="font-bold text-gray-900 text-lg">{order.clientName}</span>
                                            {order.orderNumber && <span className="text-xs font-mono text-gray-400 bg-gray-50 px-2 py-0.5 rounded">#{order.orderNumber}</span>}
                                        </div>

                                        <div className="flex items-center text-sm text-gray-600 mb-2 gap-2 flex-wrap">
                                            <span className="font-medium bg-gray-100 px-2 py-0.5 rounded">{order.date} {order.time.slice(0, 5)}</span>
                                            <span>•</span>
                                            <span>{order.pest}</span>
                                        </div>

                                        <p className="text-sm text-gray-500 truncate flex items-center gap-1.5">
                                            <span className="opacity-70">📍</span> {order.address}
                                        </p>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 p-2.5 bg-gray-50 rounded-xl text-xs sm:text-sm">
                                            <div className="flex flex-col">
                                                <span className="text-gray-400 mb-0.5">Мастер:</span>
                                                <span className={`font-medium ${order.masterId ? 'text-gray-900' : 'text-red-500'}`}>
                                                    {order.masterName || 'Не назначен'}
                                                </span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-gray-400 mb-0.5">Менеджер:</span>
                                                <span className="font-medium text-gray-900">{order.manager}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end gap-2 shrink-0">
                                        <div className="font-bold text-gray-900 text-xl">
                                            {(order.finalAmount || order.basePrice).toLocaleString()} ₽
                                        </div>
                                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium shadow-sm ${order.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {order.status === 'completed' ? 'Выполнен' : 'В работе'}
                                        </span>
                                        {order.orderType === 'secondary' && (
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Повтор</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            <OrderDetailsModal
                order={selectedOrder}
                isOpen={!!selectedOrder}
                onClose={() => setSelectedOrder(null)}
                onSuccess={() => { setSelectedOrder(null); loadOrders(); }}
            />
        </div>
    );
}

export default function CallsPage() {
    // Access for both operators and admins
    return (
        <ProtectedRoute allowedRoles={['admin', 'operator']}>
            <CallsContent />
        </ProtectedRoute>
    );
}
