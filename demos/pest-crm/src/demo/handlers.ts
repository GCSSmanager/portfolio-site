import { v4 as uuidv4 } from 'uuid';
import type { CrmProjectId, Order, User, UserInfo } from '@/types';
import type { DemoDb, DemoUser } from './store';
import { loadDb, newId, saveDb, ymKey } from './store';
import { ActivityAction } from '@/lib/activityLabel';
import { computeConversion, computeConversionPeriod, computeStatistics, computeStatisticsPeriod, defaultPlan } from './stats';

const TOKEN_PREFIX = 'pest-demo:';

function ok<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function fail(error: string, status = 400): Response {
  return new Response(JSON.stringify({ success: false, error }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function parsePath(pathWithQuery: string) {
  const [path, qs = ''] = pathWithQuery.split('?');
  const segments = path.split('/').filter(Boolean);
  return { segments, search: new URLSearchParams(qs) };
}

function methodOf(init?: RequestInit): string {
  return (init?.method ?? 'GET').toUpperCase();
}

async function readJson(init?: RequestInit): Promise<Record<string, unknown> | null> {
  const body = init?.body;
  if (!body || typeof body !== 'string') return {};
  try {
    return JSON.parse(body) as Record<string, unknown>;
  } catch {
    return null;
  }
}

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
    reader.readAsDataURL(file);
  });
}

async function readUploadFile(init?: RequestInit): Promise<File | null> {
  const body = init?.body;
  if (!body || !(body instanceof FormData)) return null;
  const file = body.get('file');
  return file instanceof File ? file : null;
}

function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; mimetype: string } | null {
  const match = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl);
  if (!match) return null;
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return { bytes, mimetype: match[1] };
}

function headersOf(init?: RequestInit): Record<string, string> {
  const h = init?.headers;
  if (!h) return {};
  if (h instanceof Headers) return Object.fromEntries(h.entries());
  return h as Record<string, string>;
}

function authUser(db: DemoDb, init?: RequestInit): DemoUser | null {
  const auth = headersOf(init).authorization || headersOf(init).Authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token.startsWith(TOKEN_PREFIX)) return null;
  const userId = token.slice(TOKEN_PREFIX.length);
  return db.users.find(u => u.id === userId && u.isActive) ?? null;
}

function requireUser(db: DemoDb, init?: RequestInit): DemoUser | Response {
  const user = authUser(db, init);
  if (!user) return fail('Сессия истекла', 401);
  return user;
}

function toUserInfo(user: DemoUser): UserInfo {
  return {
    id: user.id,
    login: user.login,
    role: user.role,
    crmProjects: user.crmProjects,
    canViewOwnOrderHistory: user.canViewOwnOrderHistory,
    name: user.name,
  };
}

function stripPassword(user: DemoUser): User {
  const { password: _p, ...rest } = user;
  return rest;
}

function projectId(init?: RequestInit): CrmProjectId {
  const h = headersOf(init);
  const raw = h['X-CRM-Project'] || h['x-crm-project'] || 'pest-control';
  return raw === 'drying-center' ? 'pest-control' : 'pest-control';
}

function filterProject(orders: Order[], _project: CrmProjectId): Order[] {
  return orders.filter(o => !o.crmProject || o.crmProject === 'pest-control');
}

/** Заказы и аналитика хранят source как строку — при переименовании справочника обновляем ссылки. */
function renameSourceNameInDb(db: DemoDb, oldName: string, newName: string): void {
  if (!oldName || !newName || oldName === newName) return;

  for (const o of db.orders) {
    if (o.source === oldName) o.source = newName;
  }
  for (const lead of db.roistatLeads) {
    if (lead.source === oldName) lead.source = newName;
  }
  for (const camp of db.campaigns) {
    if (camp.sourceName === oldName) camp.sourceName = newName;
  }

  const prefix = `${oldName}|`;
  const nextClicks: Record<string, number> = {};
  for (const [key, clicks] of Object.entries(db.sourceClicks)) {
    nextClicks[key.startsWith(prefix) ? `${newName}${key.slice(oldName.length)}` : key] = clicks;
  }
  db.sourceClicks = nextClicks;

  const nextPay: DemoDb['sourceMonthPay'] = {};
  for (const [key, bucket] of Object.entries(db.sourceMonthPay)) {
    if (bucket === undefined) continue;
    const nextKey = key.startsWith(prefix) ? `${newName}${key.slice(oldName.length)}` : key;
    nextPay[nextKey] = bucket;
  }
  db.sourceMonthPay = nextPay;
}

function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, '').slice(-10);
}

function logActivity(
  db: DemoDb,
  user: DemoUser,
  action: string,
  detail: string,
  order?: Order,
) {
  db.activities.unshift({
    id: uuidv4(),
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action,
    detail,
    orderId: order?.id ?? null,
    orderNumber: order?.orderNumber ?? null,
    createdAt: new Date().toISOString(),
  });
}

export async function handleDemoFetch(pathWithQuery: string, init?: RequestInit): Promise<Response> {
  const db = loadDb();
  const { segments, search } = parsePath(pathWithQuery);
  const method = methodOf(init);

  if (segments[0] !== 'api') return fail('Not found', 404);

  // ── Auth ───────────────────────────────────────────────────
  if (segments[1] === 'auth') {
    if (segments[2] === 'login' && method === 'POST') {
      const body = await readJson(init);
      if (body === null) return fail('Некорректный JSON');
      const login = String(body.login ?? '').trim();
      const password = String(body.password ?? '');
      const user = db.users.find(u => u.login === login && u.password === password && u.isActive);
      if (!user) return fail('Неверный логин или пароль', 401);
      return ok({
        token: `${TOKEN_PREFIX}${user.id}`,
        expiresIn: '7d',
        user: toUserInfo(user),
      });
    }
    if (segments[2] === 'verify' && method === 'GET') {
      const user = authUser(db, init);
      if (!user) return fail('Сессия истекла', 401);
      return ok({ valid: true, user: toUserInfo(user) });
    }
  }

  const auth = requireUser(db, init);
  if (auth instanceof Response) return auth;
  const user = auth;
  const project = projectId(init);

  // ── Users ──────────────────────────────────────────────────
  if (segments[1] === 'users' && segments[2] === 'operators' && method === 'GET') {
    return ok(db.users.filter(u => u.role === 'operator' && u.isActive).map(stripPassword));
  }
  if (segments[1] === 'users' && segments[2] === 'task-assignees' && method === 'GET') {
    return ok(db.users.filter(u => u.role !== 'master' && u.isActive).map(u => ({
      id: u.id, login: u.login, role: u.role as 'admin' | 'operator', name: u.name, email: u.email ?? null, phone: u.phone,
    })));
  }
  if (segments[1] === 'users' && segments[2] === 'masters' && segments[3] === 'working' && method === 'GET') {
    const date = search.get('date') || db.anchorDate;
    const masters = db.users.filter(u => u.role === 'master' && u.isActive && (db.userWorkDays[u.id] ?? []).includes(date));
    return ok(masters.map(m => ({
      id: m.id,
      name: m.name,
      phone: m.phone,
      region: m.region,
      notes: m.notes,
      avgCheck: 4200,
      completedCount: db.orders.filter(o => o.masterId === m.id && o.status === 'completed').length,
    })));
  }
  if (segments[1] === 'users' && segments[2] === 'masters' && !segments[3] && method === 'GET') {
    return ok(db.users.filter(u => u.role === 'master' && u.isActive).map(stripPassword));
  }

  if (segments[1] === 'users') {
    const userId = segments[2];
    if (!userId) {
      if (method === 'GET') {
        let list = db.users.map(stripPassword);
        const role = search.get('role');
        if (role) list = list.filter(u => u.role === role);
        if (search.get('includeInactive') !== 'true') list = list.filter(u => u.isActive);
        return ok(list);
      }
      if (method === 'POST') {
        const body = await readJson(init);
        if (body === null) return fail('Некорректный JSON');
        const created: DemoUser = {
          id: newId('user'),
          login: String(body.login ?? ''),
          password: String(body.password ?? 'demo111111'),
          role: body.role as DemoUser['role'],
          name: String(body.name ?? ''),
          email: (body.email as string | undefined) ?? null,
          phone: String(body.phone ?? ''),
          region: String(body.region ?? ''),
          notes: String(body.notes ?? ''),
          isActive: true,
          crmProjects: ['pest-control'],
          canViewOwnOrderHistory: Boolean(body.canViewOwnOrderHistory),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        db.users.push(created);
        saveDb(db);
        return ok(stripPassword(created));
      }
      return fail('Not found', 404);
    }

    if (segments[3] === 'workdays') {
      const dates = db.userWorkDays[userId] ?? [];
      if (segments[4] === 'toggle' && method === 'POST') {
        const body = await readJson(init);
        const date = String(body?.date ?? '');
        const set = new Set(dates);
        const working = !set.has(date);
        if (working) set.add(date);
        else set.delete(date);
        db.userWorkDays[userId] = [...set];
        saveDb(db);
        return ok({ date, working });
      }
      const year = Number(search.get('year'));
      const month = Number(search.get('month'));
      const prefix = `${year}-${String(month).padStart(2, '0')}`;
      return ok(dates.filter(d => d.startsWith(prefix)));
    }

    if (segments[3] === 'month-pay') {
      const key = ymKey(Number(search.get('year')), Number(search.get('month')));
      const bucket = db.userMonthPay[userId]?.[key] ?? { paidAmount: 0, payments: [] };
      if (segments[4] === 'entries') {
        const entryId = segments[5];
        if (entryId && method === 'DELETE') {
          bucket.payments = bucket.payments.filter(p => p.id !== entryId);
          bucket.paidAmount = bucket.payments.reduce((s, p) => s + p.amount, 0);
          db.userMonthPay[userId] = { ...db.userMonthPay[userId], [key]: bucket };
          saveDb(db);
          return ok({ year: Number(search.get('year')), month: Number(search.get('month')), ...bucket });
        }
        if (method === 'POST') {
          const body = await readJson(init);
          const amount = Number(body?.amount ?? 0);
          bucket.payments.push({ id: newId('pay'), amount, createdAt: new Date().toISOString() });
          bucket.paidAmount += amount;
          db.userMonthPay[userId] = { ...db.userMonthPay[userId], [key]: bucket };
          saveDb(db);
          return ok({ year: body?.year, month: body?.month, ...bucket });
        }
      }
      if (method === 'PUT') {
        const body = await readJson(init);
        bucket.paidAmount = Number(body?.paidAmount ?? 0);
        db.userMonthPay[userId] = { ...db.userMonthPay[userId], [key]: bucket };
        saveDb(db);
        return ok({ year: body?.year, month: body?.month, paidAmount: bucket.paidAmount });
      }
      return ok({ year: Number(search.get('year')), month: Number(search.get('month')), ...bucket });
    }

    if (method === 'PUT') {
      const body = await readJson(init);
      const idx = db.users.findIndex(u => u.id === userId);
      if (idx < 0) return fail('Не найден', 404);
      const target = db.users[idx];
      if (body?.password) target.password = String(body.password);
      Object.assign(target, {
        ...body,
        password: target.password,
        updatedAt: new Date().toISOString(),
      });
      saveDb(db);
      return ok(stripPassword(target));
    }
    if (method === 'DELETE') {
      const idx = db.users.findIndex(u => u.id === userId);
      if (idx < 0) return fail('Не найден', 404);
      if (search.get('permanent') === 'true') db.users.splice(idx, 1);
      else db.users[idx].isActive = false;
      saveDb(db);
      return ok(undefined);
    }
    return fail('Not found', 404);
  }

  // ── Orders ─────────────────────────────────────────────────
  if (segments[1] === 'orders') {
    const orderId = segments[2];
    if (orderId === 'search' && segments[3] === 'query') {
      let list = filterProject([...db.orders], project);
      const phone = search.get('phone');
      const address = search.get('address');
      const date = search.get('date');
      const orderNumber = search.get('orderNumber');
      if (phone) list = list.filter(o => o.phones?.some(p => p.includes(phone)));
      if (address) list = list.filter(o => o.address.toLowerCase().includes(address.toLowerCase()));
      if (date) list = list.filter(o => o.date === date);
      if (orderNumber) list = list.filter(o => o.orderNumber.includes(orderNumber));
      return ok(list);
    }
    if (orderId === 'by-phone') {
      const phone = normalizePhone(search.get('phone') || '');
      const excludeId = search.get('excludeId');
      let list = filterProject(db.orders, project).filter(o => o.status !== 'spam' && o.phones?.some(p => normalizePhone(p) === phone));
      if (excludeId) list = list.filter(o => o.id !== excludeId);
      return ok(list);
    }
    if (orderId === 'master-history') {
      const masterId = search.get('masterId') || (user.role === 'master' ? user.id : undefined);
      let list = filterProject(db.orders, project);
      if (masterId) list = list.filter(o => o.masterId === masterId);
      return ok(list.sort((a, b) => b.date.localeCompare(a.date)));
    }
    if (!orderId) {
      if (method === 'GET') {
        let list = filterProject([...db.orders], project);
        const date = search.get('date');
        const month = search.get('month');
        const year = search.get('year');
        if (date) list = list.filter(o => o.date === date);
        else if (year && month) {
          const prefix = `${year}-${month.padStart(2, '0')}`;
          list = list.filter(o => o.date.startsWith(prefix));
        }
        if (user.role === 'master') list = list.filter(o => o.masterId === user.id);
        return ok(list);
      }
      if (method === 'POST') {
        const body = await readJson(init);
        if (body === null) return fail('Некорректный JSON');
        const order: Order = {
          id: uuidv4(),
          crmProject: 'pest-control',
          orderNumber: String(db.orderSeq++),
          orderType: (body.orderType as Order['orderType']) || 'primary',
          clientName: String(body.clientName ?? ''),
          pest: String(body.pest ?? 'Клопы'),
          objectType: String(body.objectType ?? 'Квартира'),
          volume: String(body.volume ?? ''),
          address: String(body.address ?? ''),
          cityCode: (body.cityCode as string | null) ?? 'МСК',
          date: String(body.date ?? db.anchorDate),
          time: String(body.time ?? '10:00'),
          basePrice: Number(body.basePrice ?? 0),
          phones: (body.phones as string[]) ?? [],
          clientType: (body.clientType as Order['clientType']) || 'individual',
          comment: String(body.comment ?? ''),
          manager: String(body.manager ?? user.name),
          source: String(body.source ?? ''),
          status: 'in_progress',
          masterId: body.masterId as string | undefined,
          masterName: body.masterName as string | undefined,
          createdAt: new Date().toISOString(),
        };
        db.orders.push(order);
        logActivity(db, user, ActivityAction.orderCreated, `Создан заказ №${order.orderNumber}`, order);
        saveDb(db);
        return ok(order);
      }
    }

    const order = db.orders.find(o => o.id === orderId);
    if (!order) return fail('Заказ не найден', 404);

    if (segments[3] === 'calls') {
      const callId = segments[4];
      if (callId && segments[5] === 'recording') {
        return ok({ url: 'about:blank', expiresAt: null });
      }
      return ok(db.orderCalls[orderId] ?? []);
    }
    if (segments[3] === 'activity') return ok(db.activities.filter(a => a.orderId === orderId));
    if (segments[3] === 'call' && method === 'POST') return ok({ message: 'Демо: звонок поставлен в очередь' });

    if (method === 'GET') return ok(order);
    if (method === 'PUT') {
      const body = await readJson(init);
      Object.assign(order, body);
      logActivity(db, user, ActivityAction.orderUpdated, `Обновлён заказ №${order.orderNumber}`, order);
      saveDb(db);
      return ok(order);
    }
    if (method === 'DELETE') {
      db.orders = db.orders.filter(o => o.id !== orderId);
      saveDb(db);
      return ok(undefined);
    }
  }

  // ── Tasks ──────────────────────────────────────────────────
  if (segments[1] === 'tasks') {
    if (segments[2] === 'email' && segments[3] === 'status') return ok(db.taskEmailStatus);
    const taskId = segments[2];
    if (!taskId) {
      if (method === 'GET') {
        let list = [...db.tasks];
        const completed = search.get('completed');
        if (completed === 'true') list = list.filter(t => t.completed);
        if (completed === 'false') list = list.filter(t => !t.completed);
        return ok(list);
      }
      if (method === 'POST') {
        const body = await readJson(init);
        const task = {
          id: uuidv4(),
          taskNumber: db.taskSeq++,
          deadline: String(body?.deadline ?? ''),
          notifyAt: (body?.notifyAt as string | null) ?? null,
          orderNumber: String(body?.orderNumber ?? ''),
          phone: String(body?.phone ?? ''),
          comment: String(body?.comment ?? ''),
          responsible: String(body?.responsible ?? ''),
          completed: Boolean(body?.completed),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        db.tasks.push(task);
        saveDb(db);
        return ok(task);
      }
    }
    const task = db.tasks.find(t => t.id === taskId);
    if (!task) return fail('Не найдено', 404);
    if (method === 'GET') return ok(task);
    if (method === 'PUT') {
      const body = await readJson(init);
      Object.assign(task, body, { updatedAt: new Date().toISOString() });
      saveDb(db);
      return ok(task);
    }
  }

  // ── Statistics ─────────────────────────────────────────────
  if (segments[1] === 'statistics') {
    if (segments[2] === 'period') {
      const start = search.get('startDate') || db.anchorDate;
      const end = search.get('endDate') || db.anchorDate;
      return ok(computeStatisticsPeriod(db, start, end));
    }
    if (segments[2] === 'ad-spend' && method === 'PUT') {
      const body = await readJson(init);
      const date = String(body?.date ?? '');
      db.dailyAdSpend[date] = Number(body?.amount ?? 0);
      saveDb(db);
      return ok(undefined);
    }
    if (segments[2] === 'expenses') {
      if (!segments[3] && method === 'POST') {
        const body = await readJson(init);
        const expense = {
          id: newId('exp'),
          year: Number(body?.year),
          month: Number(body?.month),
          amount: Number(body?.amount ?? 0),
          comment: String(body?.comment ?? ''),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        db.monthlyExpenses.push(expense);
        saveDb(db);
        return ok(expense);
      }
      if (segments[3] && method === 'DELETE') {
        db.monthlyExpenses = db.monthlyExpenses.filter(e => e.id !== segments[3]);
        saveDb(db);
        return ok({ id: segments[3] });
      }
    }
    if (segments[2] === 'plan' && segments[3] && segments[4]) {
      const year = Number(segments[3]);
      const month = Number(segments[4]);
      const key = ymKey(year, month);
      if (method === 'PUT') {
        const body = await readJson(init);
        db.monthlyPlans[key] = { ...defaultPlan(), ...db.monthlyPlans[key], ...body };
        saveDb(db);
        return ok(db.monthlyPlans[key]);
      }
    }
    if (segments[2] === 'yandex-config') return ok({ enabled: false });
    if (segments[2] === 'sync-yandex' && method === 'POST') {
      return ok({ updatedDays: 3, totalSpend: 4500, totalClicks: 120, campaignsDiscovered: 2, campaignsBound: 1, campaignsUnbound: 0 });
    }
    if (segments[2] === 'conversion') {
      const start = search.get('startDate');
      const end = search.get('endDate');
      if (start && end) return ok(computeConversionPeriod(db, start, end));
      if (segments[3] && segments[4]) {
        return ok(computeConversion(db, Number(segments[3]), Number(segments[4])));
      }
    }
    if (segments[2] === 'source-pay') {
      const sourceName = search.get('source') || '';
      const year = Number(search.get('year'));
      const month = Number(search.get('month'));
      const key = `${sourceName}|${ymKey(year, month)}`;
      const bucket = db.sourceMonthPay[key] ?? { paidAmount: 0, payments: [] };
      if (segments[3] === 'entries') {
        const entryId = segments[4];
        if (entryId && method === 'DELETE') {
          bucket.payments = bucket.payments.filter(p => p.id !== entryId);
          bucket.paidAmount = bucket.payments.reduce((s, p) => s + p.amount, 0);
          db.sourceMonthPay[key] = bucket;
          saveDb(db);
          return ok({ sourceName, year, month, ...bucket });
        }
        if (method === 'POST') {
          const body = await readJson(init);
          const amount = Number(body?.amount ?? 0);
          bucket.payments.push({ id: newId('spay'), amount, createdAt: new Date().toISOString() });
          bucket.paidAmount += amount;
          db.sourceMonthPay[key] = bucket;
          saveDb(db);
          return ok({ sourceName, year, month, ...bucket });
        }
      }
      if (method === 'PUT') {
        const body = await readJson(init);
        bucket.paidAmount = Number(body?.paidAmount ?? 0);
        db.sourceMonthPay[key] = bucket;
        saveDb(db);
        return ok({ sourceName, year, month, paidAmount: bucket.paidAmount });
      }
      const orders = db.orders.filter(o => o.source === sourceName);
      const completed = orders.filter(o => o.status === 'completed');
      const totalSum = completed.reduce((s, o) => s + (o.finalAmount ?? o.basePrice), 0);
      return ok({
        sourceName,
        year,
        month,
        taken: orders.length,
        completed: completed.length,
        totalSum,
        commissionRate: 0.1,
        commissionSum: Math.round(totalSum * 0.1),
        boostRemaining: null,
        paidAmount: bucket.paidAmount,
        remaining: Math.max(0, Math.round(totalSum * 0.1) - bucket.paidAmount),
        payments: bucket.payments,
      });
    }
    if (segments[2] && segments[3]) {
      const year = Number(segments[2]);
      const month = Number(segments[3]);
      return ok(computeStatistics(db, year, month));
    }
  }

  // ── Sources / campaigns / legacy ───────────────────────────
  if (segments[1] === 'sources') {
    if (segments[2] === 'clicks' && method === 'PUT') {
      const body = await readJson(init);
      const sourceName = String(body?.sourceName ?? '');
      const year = Number(body?.year);
      const month = Number(body?.month);
      db.sourceClicks[`${sourceName}|${year}|${month}`] = Number(body?.clicks ?? 0);
      saveDb(db);
      return ok({ id: sourceName, sourceName, year, month, clicks: Number(body?.clicks ?? 0) });
    }
    const sourceId = segments[2];
    if (!sourceId) {
      if (method === 'GET') {
        let list = [...db.sources];
        if (search.get('includeInactive') !== 'true') list = list.filter(s => s.isActive);
        return ok(list);
      }
      if (method === 'POST') {
        const body = await readJson(init);
        const src = {
          id: newId('src'),
          name: String(body?.name ?? ''),
          adCampaign: null,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        db.sources.push(src);
        saveDb(db);
        return ok(src);
      }
    }
    const src = db.sources.find(s => s.id === sourceId);
    if (!src) return fail('Не найден', 404);
    if (segments[3] === 'campaign' && method === 'PUT') {
      const body = await readJson(init);
      src.adCampaign = String(body?.adCampaign ?? '');
      saveDb(db);
      return ok(src);
    }
    if (method === 'PUT') {
      const body = await readJson(init);
      if (body?.name != null) {
        const newName = String(body.name).trim();
        if (newName && newName !== src.name) {
          renameSourceNameInDb(db, src.name, newName);
        }
      }
      Object.assign(src, body, { updatedAt: new Date().toISOString() });
      saveDb(db);
      return ok(src);
    }
    if (method === 'DELETE') {
      if (search.get('permanent') === 'true') db.sources = db.sources.filter(s => s.id !== sourceId);
      else src.isActive = false;
      saveDb(db);
      return ok(undefined);
    }
  }

  if (segments[1] === 'field-masters') {
    const id = segments[2];
    if (id && segments[3] === 'workdays') {
      const dates = db.masterWorkDays[id] ?? [];
      if (segments[4] === 'toggle' && method === 'POST') {
        const body = await readJson(init);
        const date = String(body?.date ?? '');
        const set = new Set(dates);
        const working = !set.has(date);
        if (working) set.add(date);
        else set.delete(date);
        db.masterWorkDays[id] = [...set];
        saveDb(db);
        return ok({ date, working });
      }
      const year = Number(search.get('year'));
      const month = Number(search.get('month'));
      const prefix = `${year}-${String(month).padStart(2, '0')}`;
      return ok(dates.filter(d => d.startsWith(prefix)));
    }
    if (!id) {
      if (method === 'GET') {
        let list = [...db.fieldMasters];
        if (search.get('includeInactive') !== 'true') list = list.filter(m => m.isActive);
        return ok(list);
      }
      if (method === 'POST') {
        const body = await readJson(init);
        const fm = {
          id: newId('fm'),
          name: String(body?.name ?? ''),
          phone: String(body?.phone ?? ''),
          notes: String(body?.notes ?? ''),
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        db.fieldMasters.push(fm);
        saveDb(db);
        return ok(fm);
      }
    }
    const fm = db.fieldMasters.find(m => m.id === id);
    if (!fm) return fail('Не найден', 404);
    if (method === 'PUT') {
      const body = await readJson(init);
      Object.assign(fm, body, { updatedAt: new Date().toISOString() });
      saveDb(db);
      return ok(fm);
    }
    if (method === 'DELETE') {
      if (search.get('permanent') === 'true') db.fieldMasters = db.fieldMasters.filter(m => m.id !== id);
      else fm.isActive = false;
      saveDb(db);
      return ok(undefined);
    }
  }

  // ── Activity / integrations ────────────────────────────────
  if (segments[1] === 'activity') {
    if (segments[2] === 'actions') {
      const actions = [...new Set(db.activities.map(a => a.action))];
      return ok(actions);
    }
    const page = Number(search.get('page') || '1');
    const limit = Number(search.get('limit') || '50');
    let items = [...db.activities];
    const role = search.get('role');
    const userId = search.get('userId');
    const action = search.get('action');
    if (role) items = items.filter(a => a.userRole === role);
    if (userId) items = items.filter(a => a.userId === userId);
    if (action) items = items.filter(a => a.action === action);
    const slice = items.slice((page - 1) * limit, page * limit);
    return ok({ items: slice, page, hasMore: page * limit < items.length });
  }

  if (segments[1] === 'roistat') {
    if (segments[2] === 'config') return ok({ enabled: true, projectId: 'demo' });
    if (segments[2] === 'leads') {
      const status = search.get('status') || 'pending';
      let list = [...db.roistatLeads];
      if (status !== 'all') list = list.filter(l => l.status === status);
      return ok(list);
    }
    const leadId = segments[3];
    const lead = db.roistatLeads.find(l => l.id === leadId);
    if (!lead) return fail('Не найден', 404);
    if (segments[4] === 'dismiss') lead.status = 'dismissed';
    if (segments[4] === 'restore') lead.status = 'pending';
    if (segments[4] === 'link') {
      const body = await readJson(init);
      lead.status = 'linked';
      lead.orderId = String(body?.orderId ?? '');
    }
    lead.updatedAt = new Date().toISOString();
    saveDb(db);
    return ok(lead);
  }

  if (segments[1] === 'telephony') {
    if (segments[2] === 'calls') {
      const callId = segments[3];
      if (callId && segments[4] === 'recording') {
        return ok({ url: 'about:blank', expiresAt: null });
      }
      const phone = search.get('phone') || '';
      const key = normalizePhone(phone);
      return ok(db.phoneCalls[key] ?? []);
    }
    if (segments[2] === 'callback' && method === 'POST') {
      return ok({ message: 'Демо: callback поставлен', clientPhone: '+79000000000', operatorPhone: user.phone });
    }
  }

  if (segments[1] === 'upload') {
    if (method === 'POST') {
      const file = await readUploadFile(init);
      if (!file) return fail('Файл не передан');
      if (file.size > MAX_UPLOAD_BYTES) return fail('Файл больше 4 МБ');
      const dataUrl = await fileToDataUrl(file);
      const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
      const filename = `${newId('file')}.${ext}`;
      const url = `/api/upload/file/${filename}`;
      db.uploads[filename] = {
        filename,
        originalName: file.name,
        dataUrl,
        mimetype: file.type || 'application/octet-stream',
        size: file.size,
      };
      saveDb(db);
      return ok({
        filename,
        originalName: file.name,
        url,
        size: file.size,
        mimetype: file.type || 'application/octet-stream',
      });
    }
    const filename = segments[2] === 'file' ? decodeURIComponent(segments[3] || '') : segments[2];
    if (method === 'DELETE') {
      delete db.uploads[filename];
      saveDb(db);
      return ok(undefined);
    }
    const stored = db.uploads[filename];
    if (!stored?.dataUrl) {
      return new Response('', { status: stored ? 200 : 404 });
    }
    const parsed = dataUrlToBytes(stored.dataUrl);
    if (!parsed) return new Response('', { status: 500 });
    const body = Uint8Array.from(parsed.bytes);
    return new Response(body, {
      status: 200,
      headers: { 'Content-Type': parsed.mimetype || stored.mimetype },
    });
  }

  if (segments[1] === 'external-leads') {
    if (segments[2] === 'browser-command' && method === 'POST') {
      return ok({ enabled: false });
    }
    if (segments[2] === 'browser-process' && method === 'POST') {
      return ok({});
    }
  }

  if (segments[1] === 'external-leads-db') {
    const date = search.get('date') || db.anchorDate;
    return ok({ enabled: true, leads: db.externalLeadsByDate[date] ?? [] });
  }

  if (segments[1] === 'external-order-calls') {
    return ok({ enabled: false, calls: [] });
  }

  if (segments[1] === 'live' && segments[2] === 'incoming') {
    return fail('Not available', 404);
  }

  return fail(`Демо: маршрут не реализован (${pathWithQuery})`, 404);
}
