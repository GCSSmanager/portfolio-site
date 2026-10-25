import type {
  FieldMaster,
  MonthlyExpense,
  MonthlyPlan,
  Order,
  PayEntry,
  Task,
  TaskEmailStatus,
  User,
} from '@/types';
import type {
  ActivityItem,
  AdCampaign as ApiCampaign,
  CallRecord,
  Manager,
  RoistatLead,
  Source as ApiSource,
} from '@/lib/api';
import type { ExternalLead } from '@/lib/externalCrm';
import { activityActionLabel } from '@/lib/activityLabel';
import { normalizeCityCode } from '@/lib/cityLabel';
import { ensureDemoJournal } from './enrichSeed';
import { createSeedDb } from './seed';

export const DB_KEY = 'pest-demo.db';
/** Служебное поле в JSON; смена не форсирует пересид — только «Сбросить демо». */
export const DB_VERSION = 1;

export type DemoUser = User & { password: string };

export interface DemoDb {
  version: number;
  anchorDate: string;
  orderSeq: number;
  taskSeq: number;
  users: DemoUser[];
  orders: Order[];
  tasks: Task[];
  sources: ApiSource[];
  managers: Manager[];
  fieldMasters: FieldMaster[];
  campaigns: ApiCampaign[];
  roistatLeads: RoistatLead[];
  activities: ActivityItem[];
  orderCalls: Record<string, CallRecord[]>;
  phoneCalls: Record<string, CallRecord[]>;
  userWorkDays: Record<string, string[]>;
  masterWorkDays: Record<string, string[]>;
  userMonthPay: Record<string, Record<string, { paidAmount: number; payments: PayEntry[] }>>;
  sourceMonthPay: Record<string, { paidAmount: number; payments: PayEntry[] } | undefined>;
  sourceClicks: Record<string, number>;
  dailyAdSpend: Record<string, number>;
  monthlyPlans: Record<string, MonthlyPlan>;
  monthlyExpenses: MonthlyExpense[];
  uploads: Record<string, { filename: string; originalName: string; dataUrl: string; mimetype: string; size: number }>;
  taskEmailStatus: TaskEmailStatus;
  externalLeadsByDate: Record<string, ExternalLead[]>;
}

function isoDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(iso: string, delta: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return isoDay(d);
}

function shiftOrderDates(db: DemoDb, deltaDays: number) {
  if (!deltaDays) return;
  for (const order of db.orders) {
    order.date = addDays(order.date, deltaDays);
    if (order.repeatDate) order.repeatDate = addDays(order.repeatDate, deltaDays);
    order.createdAt = shiftIso(order.createdAt, deltaDays);
  }
  for (const task of db.tasks) {
    task.deadline = addDays(task.deadline.slice(0, 10), deltaDays) + task.deadline.slice(10);
    if (task.notifyAt) task.notifyAt = shiftIso(task.notifyAt, deltaDays);
    task.createdAt = shiftIso(task.createdAt, deltaDays);
    task.updatedAt = shiftIso(task.updatedAt, deltaDays);
  }
  for (const item of db.activities) {
    item.createdAt = shiftIso(item.createdAt, deltaDays);
  }
  for (const lead of db.roistatLeads) {
    lead.createdAt = shiftIso(lead.createdAt, deltaDays);
    lead.updatedAt = shiftIso(lead.updatedAt, deltaDays);
  }
  const nextAd: Record<string, number> = {};
  for (const [date, amount] of Object.entries(db.dailyAdSpend)) {
    nextAd[addDays(date, deltaDays)] = amount;
  }
  db.dailyAdSpend = nextAd;
  for (const leads of Object.values(db.externalLeadsByDate)) {
    for (const lead of leads) {
      lead.date = addDays(lead.date, deltaDays);
    }
  }
  const nextExt: Record<string, ExternalLead[]> = {};
  for (const [date, leads] of Object.entries(db.externalLeadsByDate)) {
    nextExt[addDays(date, deltaDays)] = leads;
  }
  db.externalLeadsByDate = nextExt;
  const nextWork: Record<string, string[]> = {};
  for (const [userId, days] of Object.entries(db.userWorkDays)) {
    nextWork[userId] = days.map(d => addDays(d, deltaDays));
  }
  db.userWorkDays = nextWork;
  const nextMasterDays: Record<string, string[]> = {};
  for (const [id, days] of Object.entries(db.masterWorkDays)) {
    nextMasterDays[id] = days.map(d => addDays(d, deltaDays));
  }
  db.masterWorkDays = nextMasterDays;
}

function shiftIso(value: string, deltaDays: number): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  d.setDate(d.getDate() + deltaDays);
  return d.toISOString();
}

function trimFutureAdSpend(db: DemoDb): boolean {
  const today = db.anchorDate;
  let changed = false;
  for (const date of Object.keys(db.dailyAdSpend)) {
    if (date > today) {
      delete db.dailyAdSpend[date];
      changed = true;
    }
  }
  return changed;
}

function normalizeOrderCityCodes(db: DemoDb): boolean {
  let changed = false;
  for (const order of db.orders) {
    const raw = String(order.cityCode || '').trim();
    if (!raw) continue;
    const next = String(normalizeCityCode(raw));
    if (order.cityCode !== next) {
      order.cityCode = next;
      changed = true;
    }
  }
  return changed;
}

function normalizeActivityActions(db: DemoDb): boolean {
  let changed = false;
  for (const item of db.activities) {
    const next = activityActionLabel(item.action);
    if (next !== item.action) {
      item.action = next;
      changed = true;
    }
  }
  return changed;
}

function alignAnchor(db: DemoDb) {
  const today = isoDay(new Date());
  if (db.anchorDate === today) return;
  const delta = Math.round(
    (new Date(`${today}T12:00:00`).getTime() - new Date(`${db.anchorDate}T12:00:00`).getTime())
      / (86400000),
  );
  shiftOrderDates(db, delta);
  db.anchorDate = today;
  saveDb(db);
}

export function loadDb(): DemoDb {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      const db = JSON.parse(raw) as DemoDb;
      alignAnchor(db);
      const beforeJournal = db.activities.length;
      ensureDemoJournal(db);
      const journalFilled = db.activities.length > beforeJournal;
      const actionsRu = normalizeActivityActions(db);
      const cities = normalizeOrderCityCodes(db);
      const adTrim = trimFutureAdSpend(db);
      if (journalFilled || actionsRu || cities || adTrim) saveDb(db);
      return db;
    }
  } catch {
    /* reset */
  }
  const db = createSeedDb();
  saveDb(db);
  return db;
}

export function saveDb(db: DemoDb) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

export function resetDb() {
  localStorage.removeItem(DB_KEY);
}

export function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function ymKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}
