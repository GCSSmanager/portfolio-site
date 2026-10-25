import { create } from 'zustand';
import api, { Order, StatisticsData, MonthlyPlan } from '@/lib/api';

interface OrderStore {
  orders: Order[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  statistics: StatisticsData | null;

  fetchOrders: (year?: number, month?: number, options?: { silent?: boolean }) => Promise<void>;
  createOrder: (data: any) => Promise<Order>;
  updateOrder: (id: string, data: any) => Promise<Order>;
  deleteOrder: (id: string) => Promise<void>;
  searchOrders: (phone?: string, address?: string, date?: string, orderNumber?: string) => Promise<Order[]>;

  fetchStatistics: (year: number, month: number) => Promise<void>;
  fetchStatisticsByPeriod: (startDate: string, endDate: string) => Promise<void>;
  updateAdSpend: (date: string, amount: number) => Promise<void>;
  updatePlan: (year: number, month: number, data: Partial<MonthlyPlan>) => Promise<void>;

  clearError: () => void;
  renameSourceOnOrders: (oldName: string, newName: string) => void;
}

export const useOrderStore = create<OrderStore>((set) => ({
  orders: [],
  isLoading: false,
  isRefreshing: false,
  error: null,
  statistics: null,

  fetchOrders: async (year, month, options) => {
    if (options?.silent) {
      set({ isRefreshing: true, error: null });
    } else {
      set({ isLoading: true, error: null });
    }
    try {
      const params =
        year != null && month != null
          ? { year: year.toString(), month: month.toString() }
          : undefined;
      const orders = await api.getOrders(params);
      set({ orders, isLoading: false, isRefreshing: false });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false, isRefreshing: false });
    }
  },

  createOrder: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const o = await api.createOrder(data);
      set(s => ({ orders: [...s.orders, o], isLoading: false }));
      return o;
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
      throw e;
    }
  },

  updateOrder: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const o = await api.updateOrder(id, data);
      set(s => ({ orders: s.orders.map(x => x.id === id ? o : x), isLoading: false }));
      return o;
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
      throw e;
    }
  },

  deleteOrder: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await api.deleteOrder(id);
      set(s => ({ orders: s.orders.filter(x => x.id !== id), isLoading: false }));
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
    }
  },

  searchOrders: async (phone, address, date, orderNumber) => {
    set({ isLoading: true, error: null });
    try {
      const r = await api.searchOrders({ phone, address, date, orderNumber });
      set({ isLoading: false });
      return r;
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
      throw e;
    }
  },

  fetchStatistics: async (year, month) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.getStatistics(year, month);
      set({ statistics: data, isLoading: false });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
    }
  },

  fetchStatisticsByPeriod: async (startDate, endDate) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.getStatisticsByPeriod(startDate, endDate);
      set({ statistics: data, isLoading: false });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
    }
  },

  updateAdSpend: async (date, amount) => {
    try {
      await api.updateAdSpend(date, amount);
    } catch (e) {
      set({ error: (e as Error).message });
      throw e;
    }
  },

  updatePlan: async (year, month, data) => {
    try {
      const p = await api.updatePlan(year, month, data);
      set(s => ({
        statistics: s.statistics ? { ...s.statistics, plan: p } : null,
      }));
    } catch (e) {
      set({ error: (e as Error).message });
      throw e;
    }
  },

  clearError: () => set({ error: null }),

  renameSourceOnOrders: (oldName, newName) => {
    if (!oldName || !newName || oldName === newName) return;
    set(s => ({
      orders: s.orders.map(o => (o.source === oldName ? { ...o, source: newName } : o)),
    }));
  },
}));
