import { v4 as uuidv4 } from 'uuid';
import type { Order, UserRole } from '@/types';
import { DEMO_ACCOUNTS } from './accounts';
import type { DemoDb, DemoUser } from './store';
import { enrichDemoDb } from './enrichSeed';
import { DB_VERSION, ymKey } from './store';

const now = () => new Date().toISOString();

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

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildUsers(): DemoUser[] {
  const base = now();
  return DEMO_ACCOUNTS.map((acc, index) => {
    const id = `user_${index + 1}`;
    const common = {
      id,
      login: acc.login,
      password: acc.password,
      role: acc.role as UserRole,
      name: acc.label,
      email: acc.role === 'admin' ? 'admin@demo.local' : null,
      phone: acc.role === 'master' ? '+79001234567' : '+79007654321',
      region: 'Москва',
      notes: '',
      isActive: true,
      crmProjects: ['pest-control' as const],
      canViewOwnOrderHistory: acc.role === 'master',
      createdAt: base,
      updatedAt: base,
    };
    if (acc.role === 'master') {
      return {
        ...common,
        weekdaySalary: 3500,
        weekendSalary: 4500,
        workHours: [{ start: '09:00', end: '20:00' }],
      };
    }
    return common;
  });
}

const PESTS = ['Клопы', 'Тараканы', 'Крысы', 'Блохи', 'Клещи', 'Муравьи'];
const SOURCES = ['Яндекс', '2GIS', 'Авито', 'Сарафан', 'Повторный'];
const TIMES = ['09:00', '10:00', '11:30', '13:00', '14:30', '16:00', '17:30', '19:00'];
const OBJECTS = ['Квартира', 'Дом', 'Офис', 'Кафе', 'Склад'];

const CLIENTS = [
  { name: 'Светлана Козлова', address: 'ул. Мира, 12, кв. 45' },
  { name: 'Андрей Волков', address: 'пр. Ленинский, 88' },
  { name: 'Мария Петрова', address: 'ул. Садовая, 3' },
  { name: 'Игорь Смирнов', address: 'Новочерёмушкинская, 21' },
  { name: 'Елена Орлова', address: 'Кутузовский пр., 36' },
  { name: 'Дмитрий Назаров', address: 'ул. Тверская, 7, оф. 402' },
  { name: 'Ольга Фёдорова', address: 'ул. Лесная, 15' },
  { name: 'Павел Ким', address: 'Шмитовский пр., 39' },
  { name: 'Наталья Белова', address: 'ул. Профсоюзная, 104' },
  { name: 'Сергей Громов', address: 'ул. Арбат, 24' },
  { name: 'Анна Жукова', address: 'Хорошёвское ш., 66' },
  { name: 'Виктор Лапин', address: 'ул. Большая Ордынка, 17' },
  { name: 'Татьяна Соколова', address: 'ул. Дмитровка, 9' },
  { name: 'Роман Данилов', address: 'Ленинградский пр., 62' },
  { name: 'Юлия Макарова', address: 'ул. Пятницкая, 31' },
];

const COMMENTS = [
  'Позвонить за час до выезда',
  'Домофон не работает — звонить на мобильный',
  'Дети и кот, без резких запахов',
  'Повтор через 14 дней',
  'Парковка во дворе',
  '',
  'Клиент просит мастера с опытом',
  'Оплата наличными',
];

function sampleOrders(users: DemoUser[], anchor: string): Order[] {
  const masters = users.filter(u => u.role === 'master');
  const operator = users.find(u => u.role === 'operator')!;
  const seedNum = anchor.split('-').reduce((acc, p) => acc + Number(p), 0);
  const rng = mulberry32(seedNum * 7919);

  const orders: Order[] = [];
  let seq = 1000;

  for (let offset = -32; offset <= 18; offset += 1) {
    const date = addDays(anchor, offset);
    const isPast = offset < 0;
    const isToday = offset === 0;
    const isFuture = offset > 0;

    let slots = 0;
    if (isPast) {
      if (rng() < 0.72) slots = 1 + Math.floor(rng() * 2);
    } else if (isToday) {
      slots = 5 + Math.floor(rng() * 4);
    } else if (offset <= 7) {
      slots = 2 + Math.floor(rng() * 3);
    } else if (rng() < 0.55) {
      slots = 1 + Math.floor(rng() * 2);
    }

    const usedTimes = new Set<string>();
    for (let s = 0; s < slots; s += 1) {
      let time = TIMES[Math.floor(rng() * TIMES.length)];
      for (let tryN = 0; tryN < 8 && usedTimes.has(time); tryN += 1) {
        time = TIMES[Math.floor(rng() * TIMES.length)];
      }
      usedTimes.add(time);

      const client = CLIENTS[Math.floor(rng() * CLIENTS.length)];
      const pest = PESTS[Math.floor(rng() * PESTS.length)];
      const basePrice = 3200 + Math.floor(rng() * 8) * 400;
      const orderType: Order['orderType'] = rng() > 0.28 ? 'primary' : 'secondary';

      let status: Order['status'];
      if (isPast) {
        status = rng() > 0.18 ? 'completed' : 'cancelled';
      } else if (isToday && rng() < 0.12) {
        status = 'completed';
      } else {
        status = 'in_progress';
      }

      const unassigned = status === 'in_progress' && rng() < 0.22;
      const assignedMaster = masters.length ? masters[Math.floor(rng() * masters.length)] : undefined;
      const masterCheckStatus =
        status === 'completed'
          ? 'checked'
          : status === 'in_progress' && rng() < 0.35
            ? 'issue'
            : status === 'in_progress'
              ? 'unchecked'
              : undefined;

      const finalAmount = status === 'completed' ? basePrice + Math.floor(rng() * 3) * 300 : undefined;
      const masterPercent = status === 'completed' ? 38 + Math.floor(rng() * 8) : undefined;
      const masterIncome =
        status === 'completed' && finalAmount && masterPercent
          ? Math.round(finalAmount * (masterPercent / 100))
          : undefined;

      const phoneSuffix = String(1000000 + seq).slice(-7);
      const createdAt = new Date(`${date}T${time.slice(0, 2)}:00:00`);
      createdAt.setDate(createdAt.getDate() - (isPast ? 1 + Math.floor(rng() * 3) : 0));

      orders.push({
        id: uuidv4(),
        crmProject: 'pest-control',
        orderNumber: String(seq++),
        orderType,
        clientName: client.name,
        pest,
        objectType: OBJECTS[Math.floor(rng() * OBJECTS.length)],
        volume: `${35 + Math.floor(rng() * 12) * 5} м²`,
        address: client.address,
        cityCode: rng() > 0.35 ? 'МСК' : 'СПБ',
        date,
        time,
        basePrice,
        phones: [`+7900${phoneSuffix}`],
        phoneCount: 1,
        clientType: rng() > 0.12 ? 'individual' : 'legal',
        comment: COMMENTS[Math.floor(rng() * COMMENTS.length)],
        manager: operator.name,
        source: SOURCES[Math.floor(rng() * SOURCES.length)],
        status,
        masterCheckStatus,
        finalAmount,
        masterPercent,
        masterIncome,
        cashDesk: finalAmount,
        masterName: unassigned ? undefined : assignedMaster?.name,
        masterId: unassigned ? undefined : assignedMaster?.id,
        masterContact: unassigned ? undefined : assignedMaster?.phone,
        cancelReason: status === 'cancelled' ? (rng() > 0.5 ? 'Клиент отказался на месте' : 'Не дозвонились') : undefined,
        cancelType: status === 'cancelled' ? (rng() > 0.5 ? 'on_site' : 'not_completed') : undefined,
        completionComment: status === 'completed' && rng() > 0.6 ? 'Обработка прошла штатно' : undefined,
        createdAt: createdAt.toISOString(),
      });
    }
  }

  return orders;
}

function buildWorkDays(orders: Order[], masterId: string): string[] {
  const days = new Set<string>();
  for (const o of orders) {
    if (o.masterId === masterId && o.status !== 'cancelled') days.add(o.date);
  }
  return [...days].sort();
}

export function createSeedDb(): DemoDb {
  const anchorDate = isoDay(new Date());
  const users = buildUsers();
  const orders = sampleOrders(users, anchorDate);
  const y = Number(anchorDate.slice(0, 4));
  const m = Number(anchorDate.slice(5, 7));
  const created = now();
  const seedNum = anchorDate.split('-').reduce((acc, p) => acc + Number(p), 0);
  const rng = mulberry32(seedNum * 7919);

  const sources = [
    { id: 'src_1', name: 'Яндекс', adCampaign: 'camp_1', isActive: true, createdAt: created, updatedAt: created },
    { id: 'src_2', name: '2GIS', adCampaign: null, isActive: true, createdAt: created, updatedAt: created },
    { id: 'src_3', name: 'Авито', adCampaign: null, isActive: true, createdAt: created, updatedAt: created },
    { id: 'src_4', name: 'Сарафан', adCampaign: null, isActive: true, createdAt: created, updatedAt: created },
    { id: 'src_5', name: 'Повторный', adCampaign: null, isActive: true, createdAt: created, updatedAt: created },
  ];

  const masters = users.filter(u => u.role === 'master');
  const operator = users.find(u => u.role === 'operator')!;
  const todayOrders = orders.filter(o => o.date === anchorDate);

  const daysInMonth = new Date(y, m, 0).getDate();
  const dailyAdSpend: Record<string, number> = {};
  for (let d = 1; d <= daysInMonth; d += 1) {
    const key = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (key <= anchorDate) {
      dailyAdSpend[key] = 900 + Math.floor(rng() * 700);
    }
  }

  const db: DemoDb = {
    version: DB_VERSION,
    anchorDate,
    orderSeq: orders.length + 1000,
    taskSeq: 8,
    users,
    orders,
    tasks: [
      {
        id: uuidv4(),
        taskNumber: 1,
        deadline: `${anchorDate}T18:00:00.000Z`,
        notifyAt: null,
        orderNumber: todayOrders[0]?.orderNumber || orders[0]?.orderNumber || '1000',
        phone: todayOrders[0]?.phones?.[0] || '+79000000001',
        comment: 'Перезвонить по смете',
        responsible: operator.name,
        completed: false,
        createdAt: created,
        updatedAt: created,
      },
      {
        id: uuidv4(),
        taskNumber: 2,
        deadline: `${addDays(anchorDate, 1)}T11:00:00.000Z`,
        notifyAt: null,
        orderNumber: todayOrders[1]?.orderNumber || '1001',
        phone: todayOrders[1]?.phones?.[0] || '+79000000002',
        comment: 'Уточнить подъезд и домофон',
        responsible: operator.name,
        completed: false,
        createdAt: created,
        updatedAt: created,
      },
      {
        id: uuidv4(),
        taskNumber: 3,
        deadline: `${addDays(anchorDate, -1)}T16:00:00.000Z`,
        notifyAt: null,
        orderNumber: orders.find(o => o.status === 'completed')?.orderNumber || '1002',
        phone: '+79000000003',
        comment: 'Отправить акт выполненных работ',
        responsible: operator.name,
        completed: true,
        completedAt: created,
        createdAt: created,
        updatedAt: created,
      },
    ],
    sources,
    managers: [
      { id: 'mgr_1', name: 'Старый менеджер', isActive: true, createdAt: created, updatedAt: created },
    ],
    fieldMasters: masters.map((m, i) => ({
      id: `fm_${i + 1}`,
      name: m.name,
      phone: m.phone,
      notes: i === 0 ? 'Основной мастер' : '',
      isActive: true,
      createdAt: created,
      updatedAt: created,
    })),
    campaigns: [
      {
        id: 'camp_1',
        campaignId: '70123456',
        campaignName: 'Дезинсекция МСК',
        sourceName: 'Яндекс',
        cityCode: 'МСК',
        state: 'active',
        createdAt: created,
        updatedAt: created,
      },
      {
        id: 'camp_2',
        campaignId: '70123457',
        campaignName: 'Клопы СПб',
        sourceName: null,
        cityCode: 'СПБ',
        state: 'active',
        createdAt: created,
        updatedAt: created,
      },
    ],
    roistatLeads: [],
    activities: [],
    orderCalls: {},
    phoneCalls: {},
    userWorkDays: Object.fromEntries(
      masters.map(m => [m.id, buildWorkDays(orders, m.id)]),
    ),
    masterWorkDays: Object.fromEntries(
      masters.map((m, i) => [`fm_${i + 1}`, buildWorkDays(orders, m.id)]),
    ),
    userMonthPay: {},
    sourceMonthPay: {},
    sourceClicks: {
      [`Яндекс|${y}|${m}`]: 420,
      [`2GIS|${y}|${m}`]: 85,
      [`Авито|${y}|${m}`]: 120,
    },
    dailyAdSpend,
    monthlyPlans: {
      [ymKey(y, m)]: {
        primaryCount: 40,
        secondaryCount: 12,
        primarySum: 180000,
        secondarySum: 48000,
        totalSum: 228000,
        cashDesk: 210000,
        adSpend: 15000,
        netProfit: 95000,
      },
    },
    monthlyExpenses: [],
    uploads: {},
    taskEmailStatus: { enabled: false, email: null, canReceiveReminders: false },
    externalLeadsByDate: {
      [anchorDate]: [
        {
          id: 1001,
          name: 'Мария',
          phone: '+79001112233',
          address: 'ул. Ленина, 5',
          date: anchorDate,
          pest: 'Клопы',
          volume: '45 м²',
          cost: 4500,
          comment: 'Демо-лид из внешней базы',
          distributionStatus: 'unassigned',
          assigneeName: '',
          callRecords: [],
        },
      ],
    },
  };
  enrichDemoDb(db);
  return db;
}
