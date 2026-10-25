import { v4 as uuidv4 } from 'uuid';
import type { ActivityItem, CallRecord, RoistatLead } from '@/lib/api';
import { ActivityAction } from '@/lib/activityLabel';
import type { DemoDb, DemoUser } from './store';
import type { Order } from '@/types';

/** Детерминированный RNG от даты — при сбросе демо набор тот же, но выглядит «живым». */
function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const LEAD_NAMES = ['Алексей', 'Мария', 'Дмитий', 'Елена', 'Игорь', 'Ольга', 'Сергей', 'Анна', 'Павел', 'Наталья'];
const LEAD_SOURCES = ['Яндекс', '2GIS', 'Авито', 'Сарафан', 'Повторный'];
const LEAD_COMMENTS = [
  'Клопы в спальне, нужен выезд',
  'Тараканы на кухне',
  'После отдыха на даче — клещи',
  'Срочно, дети дома',
  'Повторная обработка через месяц',
  'Уточнить цену и время',
  '',
  'Звонили в выходные',
];

function randomPhone(rng: () => number): string {
  const n = 9000000000 + Math.floor(rng() * 99999999);
  return `+7${String(n).slice(0, 10)}`;
}

function buildRoistatLeads(rng: () => number, anchorDate: string, count: number): RoistatLead[] {
  const base = new Date(`${anchorDate}T10:00:00`);
  return Array.from({ length: count }, (_, i) => {
    const created = new Date(base.getTime() - i * (35 + Math.floor(rng() * 40)) * 60_000);
    return {
      id: uuidv4(),
      phone: randomPhone(rng),
      name: LEAD_NAMES[Math.floor(rng() * LEAD_NAMES.length)],
      source: LEAD_SOURCES[Math.floor(rng() * LEAD_SOURCES.length)],
      status: 'pending' as const,
      comment: LEAD_COMMENTS[Math.floor(rng() * LEAD_COMMENTS.length)],
      createdAt: created.toISOString(),
      updatedAt: created.toISOString(),
    };
  });
}

function buildCallRecord(
  rng: () => number,
  phone: string,
  when: string,
  direction: CallRecord['direction'],
): CallRecord {
  const started = new Date(when);
  const statuses: CallRecord['status'][] = direction === 'incoming'
    ? ['answered', 'answered', 'missed', 'busy']
    : ['answered', 'no_answer'];
  const status = statuses[Math.floor(rng() * statuses.length)];
  const duration = status === 'answered' ? 15 + Math.floor(rng() * 240) : 0;
  const ended = new Date(started.getTime() + duration * 1000);
  return {
    id: uuidv4(),
    direction,
    status,
    phone,
    durationSec: status === 'answered' ? duration : 0,
    startedAt: started.toISOString(),
    endedAt: ended.toISOString(),
    employeeInternal: null,
    hasRecording: status === 'answered' && rng() > 0.35,
    recordingUrl: null,
  };
}

function phoneKey(raw: string): string {
  return raw.replace(/\D/g, '').slice(-10);
}

function shiftMinutes(iso: string, minutes: number): string {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
}

function pushActivity(
  list: ActivityItem[],
  user: DemoUser,
  action: string,
  detail: string,
  order: Order,
  at: string,
) {
  list.push({
    id: uuidv4(),
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action,
    detail,
    orderId: order.id,
    orderNumber: order.orderNumber,
    createdAt: at,
  });
}

export function enrichActivities(db: DemoDb, rng: () => number): void {
  const admin = db.users.find(u => u.role === 'admin');
  const operator = db.users.find(u => u.role === 'operator');
  const master = db.users.find(u => u.role === 'master');
  if (!admin || !operator || !master) return;

  const items: ActivityItem[] = [];

  for (const order of db.orders) {
    const base = order.createdAt;
    pushActivity(items, operator, ActivityAction.orderCreated, `Создан заказ №${order.orderNumber}`, order, base);

    if (order.masterId && rng() > 0.25) {
      pushActivity(
        items,
        admin,
        ActivityAction.orderAssigned,
        `Назначен мастер ${order.masterName ?? master.name} на №${order.orderNumber}`,
        order,
        shiftMinutes(base, 8 + Math.floor(rng() * 40)),
      );
    }

    if (order.status === 'completed') {
      pushActivity(
        items,
        master,
        ActivityAction.orderCompleted,
        `Заказ №${order.orderNumber} выполнен`,
        order,
        shiftMinutes(`${order.date}T${order.time || '12:00'}:00`, 60 + Math.floor(rng() * 120)),
      );
    } else if (order.status === 'cancelled') {
      pushActivity(
        items,
        operator,
        ActivityAction.orderCancelled,
        `Заказ №${order.orderNumber} отменён`,
        order,
        shiftMinutes(base, 120 + Math.floor(rng() * 240)),
      );
    } else if (rng() > 0.55) {
      pushActivity(
        items,
        operator,
        ActivityAction.orderUpdated,
        `Обновлены данные заявки №${order.orderNumber}`,
        order,
        shiftMinutes(base, 30 + Math.floor(rng() * 180)),
      );
    }
  }

  for (const lead of db.roistatLeads.filter(l => l.status === 'pending').slice(0, 6)) {
    items.push({
      id: uuidv4(),
      userId: operator.id,
      userName: operator.name,
      userRole: operator.role,
      action: ActivityAction.leadReceived,
      detail: `Новая заявка с сайта: ${lead.phone}`,
      orderId: null,
      orderNumber: null,
      createdAt: lead.createdAt,
    });
  }

  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  db.activities = items.slice(0, 280);
}

export function ensureDemoJournal(db: DemoDb): void {
  if (db.activities.length >= 30) return;
  const seedNum = db.anchorDate.split('-').reduce((acc, p) => acc + Number(p), 0);
  enrichActivities(db, mulberry32(seedNum * 9973));
}

export function enrichDemoDb(db: DemoDb): void {
  const seedNum = db.anchorDate.split('-').reduce((acc, p) => acc + Number(p), 0);
  const rng = mulberry32(seedNum * 9973);

  db.roistatLeads = buildRoistatLeads(rng, db.anchorDate, 8 + Math.floor(rng() * 5));

  const phoneCalls: DemoDb['phoneCalls'] = {};
  const orderCalls: DemoDb['orderCalls'] = {};

  for (const order of db.orders) {
    const phones = order.phones ?? [];
    for (const p of phones) {
      const key = phoneKey(p);
      if (!key) continue;
      const list = phoneCalls[key] ?? [];
      const n = Math.floor(rng() * 4);
      for (let i = 0; i < n; i += 1) {
        const dayOffset = Math.floor(rng() * 14);
        const d = new Date(`${order.date}T12:00:00`);
        d.setDate(d.getDate() - dayOffset);
        list.push(
          buildCallRecord(
            rng,
            p,
            d.toISOString(),
            rng() > 0.45 ? 'incoming' : 'outgoing',
          ),
        );
      }
      phoneCalls[key] = list.sort((a, b) => (b.startedAt || '').localeCompare(a.startedAt || ''));
    }

    if (rng() < 0.35 && phones[0]) {
      const oc: CallRecord[] = [];
      const times = 1 + Math.floor(rng() * 3);
      for (let i = 0; i < times; i += 1) {
        oc.push(buildCallRecord(rng, phones[0], order.createdAt, rng() > 0.5 ? 'incoming' : 'outgoing'));
      }
      orderCalls[order.id] = oc;
    }
  }

  for (const lead of db.roistatLeads) {
    const key = phoneKey(lead.phone);
    if (!key || phoneCalls[key]?.length) continue;
    phoneCalls[key] = [
      buildCallRecord(rng, lead.phone, lead.createdAt, 'incoming'),
      ...(rng() > 0.5 ? [buildCallRecord(rng, lead.phone, lead.createdAt, 'outgoing')] : []),
    ];
  }

  db.phoneCalls = phoneCalls;
  db.orderCalls = orderCalls;

  enrichActivities(db, rng);

  if (rng() > 0.4) {
    const dismissed = db.roistatLeads.pop();
    if (dismissed) {
      dismissed.status = 'dismissed';
      db.roistatLeads.push(dismissed);
    }
  }
}

