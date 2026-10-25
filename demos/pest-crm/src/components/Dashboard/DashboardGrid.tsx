import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Order } from '@/types';
import { cityCodeOf } from '@/lib/cityLabel';

interface Props {
  dates: Date[];
  orders: Order[];
  onOrderClick: (order: Order) => void;
  onSlotClick: (date: string, time: string) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const WEEKDAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

export default function DashboardGrid({ dates, orders, onOrderClick, onSlotClick }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoScrollKeyRef = useRef<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const monthKey = dates.length > 0 ? `${dates[0].getFullYear()}-${dates[0].getMonth()}` : '';

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check(); window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (!scrollRef.current || dates.length === 0) return;

    const autoScrollKey = `${monthKey}-${isMobile ? 'mobile' : 'desktop'}`;
    if (autoScrollKeyRef.current === autoScrollKey) return;

    autoScrollKeyRef.current = autoScrollKey;

    const idx = dates.findIndex(d => isToday(d));
    if (idx > -1) {
      scrollRef.current.scrollLeft = Math.max(0, idx * (isMobile ? 136 : 200) - (isMobile ? 40 : 120));
      return;
    }

    scrollRef.current.scrollLeft = 0;
  }, [dates, isMobile, monthKey]);

  const formatDate = (d: Date) => `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  const formatDateISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const isToday = (d: Date) => d.toDateString() === new Date().toDateString();
  const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;

  const ordersBySlot = useMemo(() => {
    const map = new Map<string, Order[]>();
    for (const order of orders) {
      const key = `${order.date}|${order.time}`;
      const bucket = map.get(key);
      if (bucket) bucket.push(order);
      else map.set(key, [order]);
    }
    return map;
  }, [orders]);

  const getOrdersForSlot = (date: Date, hour: number) => {
    const dateStr = formatDateISO(date);
    const timeStr = `${hour.toString().padStart(2, '0')}:00`;
    return ordersBySlot.get(`${dateStr}|${timeStr}`) || [];
  };

  const getOrderClasses = (order: Order) => {
    const base = 'order-card';
    const unassigned = !order.masterId && order.status === 'in_progress' ? 'ring-2 ring-red-400 ring-offset-1' : '';
    if (order.status === 'cancelled') return `${base} order-cancelled ${unassigned}`;
    if (order.status === 'completed') return `${base} order-completed`;
    return order.orderType === 'primary' ? `${base} order-primary ${unassigned}` : `${base} order-secondary ${unassigned}`;
  };

  const getDisplayPrice = (o: Order) => o.finalAmount || o.basePrice;
  const formatPrice = (p: number, mobile: boolean) => mobile ? (p >= 1000 ? `${Math.round(p / 1000)}k` : p.toString()) : `${p.toLocaleString()}₽`;

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div
        ref={scrollRef}
        className="touch-scroll-chain overflow-auto scrollbar-thin"
        style={{ maxHeight: isMobile ? 'calc(100dvh - 12rem)' : 'calc(100vh - 168px)' }}
      >
        <table className="w-full border-collapse text-[13px] sm:text-sm" style={{ minWidth: isMobile ? `${dates.length * 136}px` : `${dates.length * 200}px` }}>
          <thead className="sticky top-0 z-20">
            <tr className="bg-gray-50">
              <th className="border-b border-r border-gray-200 p-2 sm:p-3 w-14 sm:w-20 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 sticky left-0 z-30">
                <span className="hidden sm:inline">Время</span><span className="sm:hidden">⏰</span>
              </th>
              {dates.map((date, i) => (
                <th key={i} className={`border-b border-r border-gray-200 p-2 sm:p-2.5 text-center ${isMobile ? 'min-w-[136px]' : 'min-w-[200px]'} ${isToday(date) ? 'bg-green-50' : 'bg-gray-50'} ${isWeekend(date) && !isToday(date) ? 'bg-amber-50/50' : ''}`}>
                  <div className={`text-xs sm:text-sm font-semibold ${isToday(date) ? 'text-green-700' : 'text-gray-900'}`}>{formatDate(date)}</div>
                  <div className={`text-[10px] sm:text-xs mt-0.5 ${isToday(date) ? 'text-green-600 font-medium' : 'text-gray-400'} ${isWeekend(date) && !isToday(date) ? 'text-amber-600' : ''}`}>
                    {isToday(date) ? '● Сегодня' : WEEKDAYS[date.getDay()]}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HOURS.map(hour => (
              <tr key={hour} className="group">
                <td className="border-b border-r border-gray-100 p-1.5 sm:p-2 text-center bg-gray-50/50 sticky left-0 z-10">
                  <span className="text-xs sm:text-sm font-medium text-gray-600">{hour.toString().padStart(2, '0')}:00</span>
                </td>
                {dates.map((date, i) => {
                  const slotOrders = getOrdersForSlot(date, hour);
                  const dateStr = formatDateISO(date);
                  const timeStr = `${hour.toString().padStart(2, '0')}:00`;
                  return (
                    <td key={i} className={`border-b border-r border-gray-100 p-1 sm:p-1.5 align-top transition-colors duration-150 ${isToday(date) ? 'bg-green-50/30' : ''} ${isWeekend(date) && !isToday(date) ? 'bg-amber-50/20' : ''}`}
                      onClick={() => slotOrders.length === 0 && onSlotClick(dateStr, timeStr)}>
                      <div className="space-y-1 min-h-[40px] sm:min-h-[48px]">
                        {slotOrders.map(order => {
                          const city = cityCodeOf(order);
                          return (
                          <div key={order.id} className={getOrderClasses(order)} onClick={e => { e.stopPropagation(); onOrderClick(order); }}>
                            <div className="font-medium text-xs sm:text-sm flex items-center gap-1.5">
                              <span className={`flex-shrink-0 w-2 h-2 rounded-full ${order.masterCheckStatus === 'checked' ? 'bg-green-500' : order.masterCheckStatus === 'issue' ? 'bg-amber-500' : 'bg-red-500'}`} />
                              <span className="truncate">{order.clientName}</span>
                              {city ? (
                                <span className="ml-auto shrink-0 text-[9px] sm:text-[10px] font-bold uppercase tracking-wide opacity-90">
                                  {city}
                                </span>
                              ) : null}
                            </div>
                            <div className="flex items-center justify-between text-[10px] sm:text-xs opacity-90 mt-0.5">
                              <span className="truncate">{order.pest}</span>
                              <span className="font-medium ml-1 sm:ml-2 flex-shrink-0">{formatPrice(getDisplayPrice(order), isMobile)}</span>
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
