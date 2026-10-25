
import React, { useState } from 'react';
import Modal from '@/components/UI/Modal';
import Button from '@/components/UI/Button';
import Input from '@/components/UI/Input';
import OrderSearchFields from '@/components/Orders/OrderSearchFields';
import { normalizePhone } from '@/lib/phone';
import { useOrderStore } from '@/store/orderStore';
import { Order } from '@/lib/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectOrder: (order: Order) => void;
}

export default function SearchModal({ isOpen, onClose, onSelectOrder }: Props) {
  const { searchOrders, isLoading } = useOrderStore();
  const [orderNumber, setOrderNumber] = useState('');  // ← НОВОЕ
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [date, setDate] = useState('');
  const [results, setResults] = useState<Order[]>([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    const phoneQuery = normalizePhone(phone) || undefined;
    const found = await searchOrders(
      phoneQuery,
      address || undefined,
      date || undefined,
      orderNumber.trim() || undefined,
    );
    setResults(found);
    setSearched(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleSelect = (order: Order) => {
    onSelectOrder(order);
    onClose();
  };

  const handleClear = () => {
    setOrderNumber('');
    setPhone('');
    setAddress('');
    setDate('');
    setResults([]);
    setSearched(false);
  };

  const getStatusBadge = (order: Order) => {
    const styles: Record<Order['status'], string> = {
      in_progress: 'bg-blue-100 text-blue-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
      spam: 'bg-slate-100 text-slate-700',
    };
    const labels: Record<Order['status'], string> = {
      in_progress: 'В работе',
      completed: 'Выполнен',
      cancelled: 'Отменён',
      spam: 'Спам',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[order.status]}`}>
        {labels[order.status]}
      </span>
    );
  };

  const getTypeBadge = (order: Order) => {
    return order.orderType === 'primary' 
      ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Первич.</span>
      : <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Повтор.</span>;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Поиск заявки" size="xl">
      <div className="flex flex-col lg:grid lg:grid-cols-5 gap-4 lg:gap-6">
        {/* Search Form */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-gray-50 rounded-xl p-4 space-y-4">
            <h3 className="font-medium text-gray-900 flex items-center gap-2 text-sm sm:text-base">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Фильтры
            </h3>
            
            <div onKeyDown={handleKeyDown}>
              <OrderSearchFields
                orderNumber={orderNumber}
                phone={phone}
                onOrderNumberChange={setOrderNumber}
                onPhoneChange={setPhone}
                onOrderPick={handleSelect}
                orderNumberLabel="Номер заказа"
                phoneLabel="Телефон"
              />
            </div>

            <Input
              label="Адрес"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Москва, ул. Мира..."
            />
            
            <Input
              label="Дата"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            
            <div className="flex gap-2 pt-2">
              <Button 
                onClick={handleSearch} 
                variant="success"
                className="flex-1" 
                loading={isLoading}
              >
                🔍 Найти
              </Button>
              <Button variant="secondary" onClick={handleClear}>
                Сброс
              </Button>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900 text-sm sm:text-base">
              {searched ? `Найдено: ${results.length}` : 'Результаты поиска'}
            </h3>
          </div>
          
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="max-h-[300px] sm:max-h-[450px] overflow-y-auto touch-scroll">
              {results.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {results.map((order) => (
                    <div
                      key={order.id}
                      className="p-3 sm:p-4 active:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleSelect(order)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono text-gray-500">#{order.orderNumber}</span>
                            {order.source && (
                              <span className="text-xs text-gray-400">• {order.source}</span>
                            )}
                          </div>
                          <div className="font-medium text-gray-900 text-sm sm:text-base">{order.clientName}</div>
                          <div className="text-xs sm:text-sm text-gray-500 truncate">{order.address}</div>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            {getTypeBadge(order)}
                            {getStatusBadge(order)}
                            <span className="text-xs text-gray-400">{order.date}</span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="font-medium text-gray-900 text-sm sm:text-base">
                            {(order.finalAmount || order.basePrice).toLocaleString()} ₽
                          </div>
                          <div className="text-xs text-gray-500">{order.time}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 sm:py-16 px-4">
                  {searched ? (
                    <>
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-gray-500 text-center text-sm sm:text-base">Заявки не найдены</p>
                      <p className="text-xs sm:text-sm text-gray-400 text-center mt-1">Попробуйте изменить параметры</p>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <p className="text-gray-500 text-center text-sm sm:text-base">Введите параметры поиска</p>
                      <p className="text-xs sm:text-sm text-gray-400 text-center mt-1">и нажмите "Найти"</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}