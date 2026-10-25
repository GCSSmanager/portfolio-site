import type {
  CrmProjectId,
  Order,
  User,
  UserInfo,
  DailyStats,
  MonthlyPlan,
  MonthlyExpense,
  PayEntry,
  SourceStats,
  ChannelStat,
  SourceDayStat,
  CityStat,
  ConversionData,
  ConversionSourceStats,
  Task,
  ManagerStat,
  PestStat,
  TaskEmailStatus,
} from '@/types';
import {
  clearStoredProject,
  DEFAULT_PROJECT_ID,
  getStoredProjectId,
} from '@/lib/projects';
import type { ExternalLead } from './externalCrm';
import { installDemoFetch } from '@/demo/install';

const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';

if (isDemoMode && typeof window !== 'undefined') {
  installDemoFetch();
}

const getApiUrl = (): string => {
  if (isDemoMode) {
    return `${typeof window !== 'undefined' ? window.location.origin : ''}/api`;
  }
  if (import.meta.env.VITE_API_URL) return String(import.meta.env.VITE_API_URL);
  return 'http://localhost:5000/api';
};

const API_URL = getApiUrl();
export const BASE_URL = API_URL.replace('/api', '');

// ─── Token & User storage ───────────────────────────────────

const getToken = (): string | null =>
  typeof window !== 'undefined' ? localStorage.getItem('crm_token') : null;

export const setToken = (token: string): void => {
  if (typeof window !== 'undefined') localStorage.setItem('crm_token', token);
};

export const removeToken = (): void => {
  if (typeof window !== 'undefined') localStorage.removeItem('crm_token');
};

export const hasToken = (): boolean => !!getToken();

export const setUser = (user: UserInfo): void => {
  if (typeof window !== 'undefined') localStorage.setItem('crm_user', JSON.stringify(user));
};

export const removeUser = (): void => {
  if (typeof window !== 'undefined') localStorage.removeItem('crm_user');
};

export const getStoredUser = (): UserInfo | null => {
  if (typeof window === 'undefined') return null;
  const s = localStorage.getItem('crm_user');
  return s ? JSON.parse(s) : null;
};

/** Сессия недействительна (401) — AuthSessionSync сбрасывает React-состояние и роут. */
export const AUTH_SESSION_INVALID_EVENT = 'pest-crm:session-invalid';

export function notifyAuthSessionInvalid(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AUTH_SESSION_INVALID_EVENT));
  }
}

function isAuthLoginEndpoint(endpoint: string): boolean {
  return /\/auth\/login\/?$/.test(endpoint.split('?')[0] ?? endpoint);
}

function handleUnauthorized(endpoint: string): void {
  if (isAuthLoginEndpoint(endpoint)) return;
  removeToken();
  removeUser();
  notifyAuthSessionInvalid();
}

// ─── Generic fetch ──────────────────────────────────────────

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

async function fetchApi<T>(endpoint: string, options: RequestInit = {}, requireAuth = true): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (requireAuth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const user = getStoredUser();
    const allowedProjects = [DEFAULT_PROJECT_ID];
    const storedProject = getStoredProjectId();
    headers['X-CRM-Project'] = allowedProjects.includes(storedProject)
      ? storedProject
      : allowedProjects[0];
  }

  try {
    const response = await fetch(url, { ...options, headers });
    const json: ApiResponse<T> = await response.json();

    if (response.status === 401) {
      handleUnauthorized(endpoint);
      throw new Error('Сессия истекла');
    }
    if (response.status === 403) {
      throw new Error('Недостаточно прав');
    }
    if (!response.ok || json.success === false) {
      throw new Error(json.error || json.message || `HTTP ${response.status}`);
    }
    return json.data as T;
  } catch (error) {
    console.error(`❌ API Error [${endpoint}]:`, error);
    throw error;
  }
}

export const fetchStoredUpload = (
  storedUrl: string,
  method: 'GET' | 'HEAD' = 'GET',
  signal?: AbortSignal,
): Promise<Response> => {
  const filename = storedUrl.split('/').pop() || '';
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${API_URL}/upload/file/${encodeURIComponent(filename)}`, { method, headers, signal });
};

async function uploadFile(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const response = await fetch(`${API_URL}/upload`, { method: 'POST', headers, body: formData });
  const json = await response.json();
  if (!response.ok || json.success === false) throw new Error(json.error || 'Ошибка загрузки');
  return json.data;
}

// ─── Exported types ─────────────────────────────────────────

export interface LoginResponse {
  token: string;
  expiresIn: string;
  user: UserInfo;
}

export interface StatisticsData {
  daily: DailyStats[];
  totals: any;
  plan?: MonthlyPlan;
  monthlyExpenses?: MonthlyExpense[];
  sourceStats?: SourceStats[];
  channelStats?: ChannelStat[];
  cityStats?: CityStat[];
  managerStats?: ManagerStat[];
  pestStats?: PestStat[];
}

export interface Source {
  id: string;
  name: string;
  adCampaign?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Manager {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdCampaign {
  id: string;
  campaignId: string;
  campaignName: string;
  sourceName: string | null;
  cityCode?: string | null;
  state?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UploadResponse {
  filename: string;
  originalName: string;
  url: string;
  size: number;
  mimetype: string;
}

export interface SyncYandexResult {
  updatedDays: number;
  totalSpend: number;
  totalClicks: number;
  campaignsDiscovered: number;
  campaignsBound: number;
  campaignsUnbound: number;
}

export interface SourceClicksData {
  id: string;
  sourceName: string;
  year: number;
  month: number;
  clicks: number;
}

export interface ActivityItem {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  detail: string;
  orderId?: string | null;
  orderNumber?: string | null;
  createdAt: string;
}

export interface RoistatLead {
  id: string;
  roistatVisitId?: string | null;
  roistatLeadId?: string | null;
  title?: string | null;
  name?: string | null;
  phone: string;
  email?: string | null;
  source?: string | null;
  price?: number | null;
  comment?: string | null;
  ymClientId?: string | null;
  yclid?: string | null;
  yandexCampaignId?: string | null;
  status: 'pending' | 'linked' | 'dismissed';
  orderId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RoistatConfig {
  enabled: boolean;
  projectId: string | null;
}

export interface CallRecord {
  id: string;
  direction: 'incoming' | 'outgoing';
  status: string;
  phone: string;
  durationSec: number;
  startedAt: string | null;
  endedAt: string | null;
  employeeInternal: string | null;
  hasRecording: boolean;
  recordingUrl?: string | null;
  gateway?: string;
}

export interface CallRecordingLink {
  url: string;
  expiresAt: string | null;
}

export interface WorkingMaster {
  id: string;
  name: string;
  phone: string;
  region: string;
  notes: string;
  avgCheck: number;
  completedCount: number;
}

export interface TaskAssignee {
  id: string;
  login: string;
  role: 'admin' | 'operator';
  name: string;
  email: string | null;
  phone: string;
}

export type { Order, User, UserInfo, DailyStats, MonthlyPlan, MonthlyExpense, SourceStats, ChannelStat, SourceDayStat, CityStat, ConversionData, ConversionSourceStats, Task, ManagerStat, PestStat, TaskEmailStatus };
export type { FieldMaster, UserRole } from '@/types';

type ExternalBrowserCommand = {
  id: string;
  url: string;
  method: 'GET' | 'POST' | 'DELETE';
  headers: Record<string, string>;
  body?: string;
};

const executeExternalCommand = async <T>(
  command: ExternalBrowserCommand,
  token?: string,
): Promise<T> => {
  const response = await fetch(command.url, {
    method: command.method,
    headers: {
      ...command.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(command.body === undefined ? {} : { body: command.body }),
  });
  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (response.status === 401) throw new Error('UNAUTHORIZED');
  if (!response.ok) {
    const message = typeof data === 'object' && data
      ? String((data as { message?: string }).message || '')
      : '';
    throw new Error(message || text || `HTTP ${response.status}`);
  }
  return data as T;
};

const getExternalLeadsFromBrowser = async (
  date: string,
  externalToken?: string,
): Promise<{ enabled: boolean; leads: ExternalLead[] }> => {
  const plan = await fetchApi<{ enabled: boolean; command?: ExternalBrowserCommand }>(
    '/external-leads/browser-command',
    { method: 'POST', body: JSON.stringify({ action: 'list', date }) },
  );
  if (!plan.enabled || !externalToken || !plan.command) {
    return { enabled: plan.enabled, leads: [] };
  }

  const items = await executeExternalCommand<unknown[]>(plan.command, externalToken);
  const logPlan = await fetchApi<{ itemIds: number[]; commands: ExternalBrowserCommand[] }>(
    '/external-leads/browser-command',
    { method: 'POST', body: JSON.stringify({ action: 'logs', items }) },
  );
  const logResults: Array<{ id: string; data: unknown[] }> = [];
  let logCommands = logPlan.commands;
  while (logCommands.length > 0) {
    const pageResults = await Promise.all(logCommands.map(async command => {
      try {
        return {
          id: command.id,
          data: await executeExternalCommand<unknown[]>(command, externalToken),
        };
      } catch {
        return { id: command.id, data: [] };
      }
    }));
    logResults.push(...pageResults);
    const nextPlan = await fetchApi<{ commands: ExternalBrowserCommand[] }>(
      '/external-leads/browser-command',
      {
        method: 'POST',
        body: JSON.stringify({ action: 'next-logs', results: pageResults }),
      },
    );
    logCommands = nextPlan.commands;
  }

  const itemIds = new Set(logPlan.itemIds);
  const leads = await Promise.all(
    (Array.isArray(items) ? items : [])
      .filter((item): item is { id: number } =>
        Boolean(item && typeof item === 'object' && itemIds.has((item as { id: number }).id)))
      .map(item => {
        const prefix = `logs:${item.id}:`;
        const logPages = logResults
          .filter(result => result.id.startsWith(prefix))
          .sort((a, b) => a.id.localeCompare(b.id))
          .map(result => result.data);
        return fetchApi<ExternalLead>('/external-leads/browser-process', {
          method: 'POST',
          body: JSON.stringify({ action: 'lead', item, logPages }),
        });
      }),
  );

  return {
    enabled: true,
    leads: leads.sort((a, b) => a.date.localeCompare(b.date, 'ru')),
  };
};

// ─── API methods ────────────────────────────────────────────

export const api = {
  // Auth
  login: (login: string, password: string) =>
    fetchApi<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ login, password }),
    }, false),

  verifyToken: () => fetchApi<{ valid: boolean; user: UserInfo }>('/auth/verify'),

  logout: () => {
    removeToken();
    removeUser();
    clearStoredProject();
    return Promise.resolve();
  },

  // ── Users ──────────────────────────────────────────────────

  getUsers: (params?: { role?: string; includeInactive?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.role) q.append('role', params.role);
    if (params?.includeInactive) q.append('includeInactive', 'true');
    return fetchApi<User[]>(`/users?${q}`);
  },

  getOperators: () =>
    fetchApi<Pick<User, 'id' | 'name' | 'phone'>[]>('/users/operators'),

  getTaskAssignees: () =>
    fetchApi<TaskAssignee[]>('/users/task-assignees'),

  getMasters: () =>
    fetchApi<Pick<User, 'id' | 'name' | 'phone' | 'region' | 'notes'>[]>('/users/masters'),

  getWorkingMasters: (date: string) =>
    fetchApi<WorkingMaster[]>(`/users/masters/working?date=${date}`),

  createUser: (data: {
    login: string; password: string; role: string; name: string;
    email?: string; phone?: string; region?: string; notes?: string; novofonEmployeeIds?: string;
    crmProjects?: Array<'pest-control' | 'drying-center'>;
    canViewOwnOrderHistory?: boolean;
  }) => fetchApi<User>('/users', { method: 'POST', body: JSON.stringify(data) }),

  updateUser: (id: string, data: Partial<User> & { password?: string }) =>
    fetchApi<User>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteUser: (id: string, permanent = false) =>
    fetchApi<void>(`/users/${id}${permanent ? '?permanent=true' : ''}`, { method: 'DELETE' }),

  getUserWorkDays: (id: string, year: number, month: number) =>
    fetchApi<string[]>(`/users/${id}/workdays?year=${year}&month=${month}`),

  toggleUserWorkDay: (id: string, date: string) =>
    fetchApi<{ date: string; working: boolean }>(
      `/users/${id}/workdays/toggle`,
      { method: 'POST', body: JSON.stringify({ date }) },
    ),

  getUserMonthPay: (id: string, year: number, month: number) =>
    fetchApi<{ year: number; month: number; paidAmount: number; payments: PayEntry[] }>(
      `/users/${id}/month-pay?year=${year}&month=${month}`,
    ),

  addUserMonthPayEntry: (id: string, year: number, month: number, amount: number) =>
    fetchApi<{ year: number; month: number; paidAmount: number; payments: PayEntry[] }>(
      `/users/${id}/month-pay/entries`,
      { method: 'POST', body: JSON.stringify({ year, month, amount }) },
    ),

  deleteUserMonthPayEntry: (id: string, entryId: string) =>
    fetchApi<{ year: number; month: number; paidAmount: number; payments: PayEntry[] }>(
      `/users/${id}/month-pay/entries/${entryId}`,
      { method: 'DELETE' },
    ),

  setUserMonthPay: (id: string, year: number, month: number, paidAmount: number) =>
    fetchApi<{ year: number; month: number; paidAmount: number }>(
      `/users/${id}/month-pay`,
      { method: 'PUT', body: JSON.stringify({ year, month, paidAmount }) },
    ),

  // ── Orders ─────────────────────────────────────────────────

  getOrders: (params?: { date?: string; month?: string; year?: string }) => {
    const q = params
      ? new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v))).toString()
      : '';
    return fetchApi<Order[]>(`/orders${q ? `?${q}` : ''}`);
  },

  getMasterOrderHistory: (masterId?: string) => {
    const query = masterId ? `?masterId=${encodeURIComponent(masterId)}` : '';
    return fetchApi<Order[]>(`/orders/master-history${query}`);
  },

  getOrder: (id: string) => fetchApi<Order>(`/orders/${id}`),

  createOrder: (data: any) =>
    fetchApi<Order>('/orders', { method: 'POST', body: JSON.stringify(data) }),

  updateOrder: (id: string, data: any) =>
    fetchApi<Order>(`/orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteOrder: (id: string) =>
    fetchApi<void>(`/orders/${id}`, { method: 'DELETE' }),

  getOrderCalls: (orderId: string) =>
    fetchApi<CallRecord[]>(`/orders/${orderId}/calls`),

  getOrderActivity: (orderId: string) =>
    fetchApi<ActivityItem[]>(`/orders/${orderId}/activity`),

  getExternalOrderCalls: async (phones: string[], externalId?: number | null) => {
    const token = getToken();
    const params = new URLSearchParams();
    if (phones.length) params.set('phones', phones.join(','));
    if (externalId && externalId > 0) params.set('externalId', String(externalId));
    const response = await fetch(`${API_URL}/external-order-calls?${params.toString()}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: AbortSignal.timeout(20_000),
    });
    const json = await response.json() as {
      success?: boolean;
      data?: { enabled: boolean; calls: import('./externalCrm').MasterCallRecord[] };
      error?: string;
    };
    if (response.status === 401) {
      handleUnauthorized('/external-order-calls');
      throw new Error('Сессия истекла');
    }
    if (!response.ok || json.success === false) {
      throw new Error(json.error || `HTTP ${response.status}`);
    }
    return json.data?.calls || [];
  },

  getCallRecording: (orderId: string, callId: string) =>
    fetchApi<CallRecordingLink>(`/orders/${orderId}/calls/${callId}/recording`),

  getPhoneCalls: (phone: string) =>
    fetchApi<CallRecord[]>(`/telephony/calls?phone=${encodeURIComponent(phone)}`),

  getPhoneCallRecording: (callId: string, phone: string) =>
    fetchApi<CallRecordingLink>(
      `/telephony/calls/${encodeURIComponent(callId)}/recording?phone=${encodeURIComponent(phone)}`,
    ),

  initiateOrderCall: (orderId: string, phoneIndex: number) =>
    fetchApi<{ message?: string }>(`/orders/${orderId}/call`, {
      method: 'POST',
      body: JSON.stringify({ phoneIndex }),
    }),

  /** Click-to-call для admin/operator: звонок на телефон пользователя, затем клиенту */
  initiateTelephonyCall: (phone: string) =>
    fetchApi<{ message?: string; clientPhone?: string; operatorPhone?: string }>(
      '/telephony/callback',
      { method: 'POST', body: JSON.stringify({ phone }) },
    ),

  getExternalLeads: (date: string, externalToken?: string) =>
    getExternalLeadsFromBrowser(date, externalToken),

  loginExternalCrm: async (login: string, password: string) => {
    const plan = await fetchApi<{ enabled: boolean; command?: ExternalBrowserCommand }>(
      '/external-leads/browser-command',
      {
        method: 'POST',
        body: JSON.stringify({ action: 'login', login, password }),
      },
    );
    if (!plan.enabled || !plan.command) throw new Error('Внешний CRM не настроен');
    const data = await executeExternalCommand<unknown>(plan.command);
    return fetchApi<{ token: string; login: string }>('/external-leads/browser-process', {
      method: 'POST',
      body: JSON.stringify({ action: 'login', login, data }),
    });
  },

  deleteExternalLead: async (id: number, externalToken: string) => {
    const plan = await fetchApi<{ enabled: boolean; command?: ExternalBrowserCommand }>(
      '/external-leads/browser-command',
      {
        method: 'POST',
        body: JSON.stringify({ action: 'delete', id }),
      },
    );
    if (!plan.enabled || !plan.command) throw new Error('Внешний CRM не настроен');
    await executeExternalCommand<void>(plan.command, externalToken);
  },

  getDbExternalLeads: async (date: string) => {
    const token = getToken();
    const response = await fetch(`${API_URL}/external-leads-db?date=${encodeURIComponent(date)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const text = await response.text();
    let json: {
      success?: boolean;
      data?: { enabled: boolean; leads: ExternalLead[] };
      error?: string;
    };
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(text.trim().slice(0, 200) || `HTTP ${response.status}`);
    }
    if (response.status === 401) {
      handleUnauthorized('/external-leads-db');
      throw new Error('Сессия истекла');
    }
    if (!response.ok || json.success === false) {
      throw new Error(json.error || `HTTP ${response.status}`);
    }
    return json.data as { enabled: boolean; leads: ExternalLead[] };
  },

  getActivityActions: () => fetchApi<string[]>('/activity/actions'),

  getActivity: (role?: 'operator' | 'master' | 'admin' | '', page = 1, userId?: string, action?: string) => {
    const query = new URLSearchParams({ page: String(page), limit: '50' });
    if (role) query.set('role', role);
    if (userId) query.set('userId', userId);
    if (action) query.set('action', action);
    return fetchApi<{ items: ActivityItem[]; page: number; hasMore: boolean }>(`/activity?${query}`);
  },

  getRoistatConfig: () => fetchApi<RoistatConfig>('/roistat/config'),

  getRoistatLeads: (status: 'pending' | 'linked' | 'dismissed' | 'all' = 'pending') =>
    fetchApi<RoistatLead[]>(`/roistat/leads?status=${status}`),

  dismissRoistatLead: (id: string) =>
    fetchApi<RoistatLead>(`/roistat/leads/${id}/dismiss`, { method: 'POST' }),

  restoreRoistatLead: (id: string) =>
    fetchApi<RoistatLead>(`/roistat/leads/${id}/restore`, { method: 'POST' }),

  linkRoistatLead: (id: string, orderId: string) =>
    fetchApi<RoistatLead>(`/roistat/leads/${id}/link`, {
      method: 'POST',
      body: JSON.stringify({ orderId }),
    }),

  searchOrders: (params: { phone?: string; address?: string; date?: string; orderNumber?: string }) => {
    const q = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v)),
    ).toString();
    return fetchApi<Order[]>(`/orders/search/query?${q}`);
  },

  /** Заказы с этим телефоном (кроме spam). excludeId — не показывать текущий при редактировании. */
  findOrdersByPhone: (phone: string, excludeId?: string) => {
    const q = new URLSearchParams({ phone });
    if (excludeId) q.set('excludeId', excludeId);
    return fetchApi<Order[]>(`/orders/by-phone?${q.toString()}`);
  },

  // ── Tasks ──────────────────────────────────────────────────

  getTasks: (params?: { completed?: boolean }) => {
    const q = new URLSearchParams();
    if (typeof params?.completed === 'boolean') q.append('completed', String(params.completed));
    const query = q.toString();
    return fetchApi<Task[]>(`/tasks${query ? `?${query}` : ''}`);
  },

  getTask: (id: string) => fetchApi<Task>(`/tasks/${id}`),

  getTaskEmailStatus: () => fetchApi<TaskEmailStatus>('/tasks/email/status'),

  createTask: (data: {
    deadline: string;
    notifyAt?: string | null;
    orderNumber: string;
    phone: string;
    comment: string;
    responsible: string;
    completed: boolean;
  }) => fetchApi<Task>('/tasks', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  updateTask: (id: string, data: Partial<{
    deadline: string;
    notifyAt: string | null;
    orderNumber: string;
    phone: string;
    comment: string;
    responsible: string;
    completed: boolean;
  }>) => fetchApi<Task>(`/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  // ── Upload ─────────────────────────────────────────────────

  uploadFile,

  deleteFile: (filename: string) =>
    fetchApi<void>(`/upload/${filename}`, { method: 'DELETE' }),

  // ── Statistics (admin) ─────────────────────────────────────

  getStatistics: (year: number, month: number) =>
    fetchApi<StatisticsData>(`/statistics/${year}/${month.toString().padStart(2, '0')}`),

  getStatisticsByPeriod: (startDate: string, endDate: string) =>
    fetchApi<StatisticsData>(`/statistics/period?startDate=${startDate}&endDate=${endDate}`),

  updateAdSpend: (date: string, amount: number) =>
    fetchApi<void>('/statistics/ad-spend', {
      method: 'PUT',
      body: JSON.stringify({ date, amount }),
    }),

  updatePlan: (year: number, month: number, data: Partial<MonthlyPlan>) =>
    fetchApi<MonthlyPlan>(`/statistics/plan/${year}/${month.toString().padStart(2, '0')}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  createMonthlyExpense: (data: { year: number; month: number; amount: number; comment?: string }) =>
    fetchApi<MonthlyExpense>('/statistics/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteMonthlyExpense: (id: string) =>
    fetchApi<{ id: string }>(`/statistics/expenses/${id}`, { method: 'DELETE' }),

  getYandexConfig: () =>
    fetchApi<{ enabled: boolean }>('/statistics/yandex-config'),

  syncYandex: (startDate: string, endDate: string) =>
    fetchApi<SyncYandexResult>('/statistics/sync-yandex', {
      method: 'POST',
      body: JSON.stringify({ startDate, endDate }),
    }),

  getConversionStats: (year: number, month: number) =>
    fetchApi<ConversionData>(`/statistics/conversion/${year}/${month.toString().padStart(2, '0')}`),

  getConversionStatsByPeriod: (startDate: string, endDate: string) =>
    fetchApi<ConversionData>(
      `/statistics/conversion?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
    ),

  getSourceMonthStats: (year: number, month: number, source: string) =>
    fetchApi<{
      sourceName: string;
      year: number;
      month: number;
      taken: number;
      completed: number;
      totalSum: number;
      commissionRate: number;
      commissionSum: number;
      boostRemaining: number | null;
      paidAmount: number;
      remaining: number;
      payments: PayEntry[];
    }>(`/statistics/source-pay/${year}/${month}?source=${encodeURIComponent(source)}`),

  addSourceMonthPayEntry: (year: number, month: number, sourceName: string, amount: number) =>
    fetchApi<{ sourceName: string; year: number; month: number; paidAmount: number; payments: PayEntry[] }>(
      '/statistics/source-pay/entries',
      { method: 'POST', body: JSON.stringify({ year, month, sourceName, amount }) },
    ),

  deleteSourceMonthPayEntry: (id: string) =>
    fetchApi<{ sourceName: string; year: number; month: number; paidAmount: number; payments: PayEntry[] }>(
      `/statistics/source-pay/entries/${id}`,
      { method: 'DELETE' },
    ),

  setSourceMonthPay: (year: number, month: number, sourceName: string, paidAmount: number) =>
    fetchApi<{ sourceName: string; year: number; month: number; paidAmount: number }>(
      '/statistics/source-pay',
      { method: 'PUT', body: JSON.stringify({ year, month, sourceName, paidAmount }) },
    ),

  // ── Sources (admin) ────────────────────────────────────────

  getSources: (includeInactive?: boolean) =>
    fetchApi<Source[]>(`/sources${includeInactive ? '?includeInactive=true' : ''}`),

  createSource: (name: string) =>
    fetchApi<Source>('/sources', { method: 'POST', body: JSON.stringify({ name }) }),

  updateSource: (id: string, data: { name?: string; isActive?: boolean }) =>
    fetchApi<Source>(`/sources/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteSource: (id: string, permanent?: boolean) =>
    fetchApi<void>(`/sources/${id}${permanent ? '?permanent=true' : ''}`, { method: 'DELETE' }),

  updateSourceCampaign: (id: string, adCampaign: string) =>
    fetchApi<Source>(`/sources/${id}/campaign`, {
      method: 'PUT',
      body: JSON.stringify({ adCampaign }),
    }),

  updateSourceClicks: (data: { sourceName: string; year: number; month: number; clicks: number }) =>
    fetchApi<SourceClicksData>('/sources/clicks', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // ── Legacy field masters (admin) ───────────────────────────

  getFieldMasters: (includeInactive?: boolean) =>
    fetchApi<any[]>(`/field-masters${includeInactive ? '?includeInactive=true' : ''}`),

  createFieldMaster: (data: any) =>
    fetchApi<any>('/field-masters', { method: 'POST', body: JSON.stringify(data) }),

  updateFieldMaster: (id: string, data: any) =>
    fetchApi<any>(`/field-masters/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteFieldMaster: (id: string, permanent?: boolean) =>
    fetchApi<void>(`/field-masters/${id}${permanent ? '?permanent=true' : ''}`, { method: 'DELETE' }),

  getMasterWorkDays: (id: string, year: number, month: number) =>
    fetchApi<string[]>(`/field-masters/${id}/workdays?year=${year}&month=${month}`),

  toggleMasterWorkDay: (id: string, date: string) =>
    fetchApi<{ date: string; working: boolean }>(
      `/field-masters/${id}/workdays/toggle`,
      { method: 'POST', body: JSON.stringify({ date }) },
    ),
};

export default api;
