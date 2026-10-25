import type {
  ChannelStat,
  CityStat,
  ConversionData,
  DailyStats,
  ManagerStat,
  MonthlyExpense,
  MonthlyPlan,
  Order,
  PestStat,
  SourceDayStat,
  SourceStats,
} from '@/types';
import type { StatisticsData } from '@/lib/api';
import type { DemoDb } from './store';
import { ymKey } from './store';
import { CITY_NAMES, cityCodeOf, type CityCode } from '@/lib/cityLabel';

function bumpSourceDayStat(map: Record<string, SourceDayStat>, order: Order) {
  const city = cityCodeOf(order);
  const sourceName = order.source || '—';
  const key = `${sourceName}\0${city}`;
  if (!map[key]) {
    map[key] = {
      name: sourceName,
      city,
      count: 0,
      createdPrimary: 0,
      createdSecondary: 0,
      completedPrimary: 0,
      completedSecondary: 0,
      primarySum: 0,
      secondarySum: 0,
      sum: 0,
      cashDesk: 0,
      masterIncome: 0,
      cancelled: 0,
    };
  }
  const row = map[key];
  row.count = (row.count || 0) + 1;
  if (order.orderType === 'primary') {
    row.createdPrimary += 1;
    row.primarySum = (row.primarySum || 0) + order.basePrice;
  } else {
    row.createdSecondary += 1;
    row.secondarySum = (row.secondarySum || 0) + order.basePrice;
  }
  if (order.status === 'completed') {
    const amount = order.finalAmount ?? order.basePrice;
    row.sum += amount;
    row.cashDesk = (row.cashDesk || 0) + (order.cashDesk ?? amount);
    row.masterIncome = (row.masterIncome || 0) + (order.masterIncome ?? 0);
    if (order.orderType === 'primary') row.completedPrimary += 1;
    else row.completedSecondary += 1;
  }
  if (order.status === 'cancelled') row.cancelled += 1;
}

function cityStatName(code: string): string {
  return CITY_NAMES[code as CityCode] || code;
}

function inMonth(order: Order, year: number, month: number): boolean {
  const [y, m] = order.date.split('-').map(Number);
  return y === year && m === month;
}

function inRange(order: Order, start: string, end: string): boolean {
  return order.date >= start && order.date <= end;
}

function sumCompleted(orders: Order[]) {
  return orders
    .filter(o => o.status === 'completed')
    .reduce((acc, o) => acc + (o.finalAmount ?? o.basePrice), 0);
}

function adSpendForDay(db: DemoDb, date: string, today: string): number {
  if (date > today) return 0;
  return db.dailyAdSpend[date] ?? 0;
}

function buildStatisticsFromOrders(
  db: DemoDb,
  orders: Order[],
  options: {
    plan?: MonthlyPlan;
    monthlyExpenses?: MonthlyExpense[];
    today?: string;
  } = {},
): StatisticsData {
  const today = options.today ?? db.anchorDate;
  const days = new Set(orders.map(o => o.date));
  const daily: DailyStats[] = [...days].sort().map(date => {
    const dayOrders = orders.filter(o => o.date === date);
    const completed = dayOrders.filter(o => o.status === 'completed');
    const primary = dayOrders.filter(o => o.orderType === 'primary');
    const secondary = dayOrders.filter(o => o.orderType === 'secondary');
    const totalSum = sumCompleted(dayOrders);
    const adSpend = adSpendForDay(db, date, today);
    const cashDesk = completed.reduce((s, o) => s + (o.cashDesk ?? o.finalAmount ?? o.basePrice), 0);
    const masterIncome = completed.reduce((s, o) => s + (o.masterIncome ?? 0), 0);
    const pestMap: Record<string, { name: string; count: number; primary: number; secondary: number }> = {};
    const sourceDayMap: Record<string, SourceDayStat> = {};
    for (const o of dayOrders) {
      if (!pestMap[o.pest]) pestMap[o.pest] = { name: o.pest, count: 0, primary: 0, secondary: 0 };
      pestMap[o.pest].count += 1;
      if (o.orderType === 'primary') pestMap[o.pest].primary += 1;
      else pestMap[o.pest].secondary += 1;
      bumpSourceDayStat(sourceDayMap, o);
    }
    return {
      date,
      primaryCount: primary.length,
      secondaryCount: secondary.length,
      primarySum: primary.reduce((s, o) => s + o.basePrice, 0),
      secondarySum: secondary.reduce((s, o) => s + o.basePrice, 0),
      totalSum,
      cashDesk,
      masterIncome,
      adSpend,
      netProfit: totalSum - adSpend - masterIncome,
      createdPrimaryCount: primary.length,
      createdSecondaryCount: secondary.length,
      createdPestStats: Object.values(pestMap),
      sourceDayStats: Object.values(sourceDayMap),
    };
  });

  const sourceStats: SourceStats[] = db.sources.map(src => {
    const related = orders.filter(o => o.source === src.name);
    const completed = related.filter(o => o.status === 'completed');
    return {
      name: src.name,
      count: related.length,
      sum: sumCompleted(related),
      cashDesk: completed.reduce((s, o) => s + (o.cashDesk ?? 0), 0),
      masterIncome: completed.reduce((s, o) => s + (o.masterIncome ?? 0), 0),
      primary: related.filter(o => o.orderType === 'primary').length,
      secondary: related.filter(o => o.orderType === 'secondary').length,
      cancelled: related.filter(o => o.status === 'cancelled').length,
      cancelledOnSite: 0,
      cancelledNotCompleted: 0,
    };
  });

  const channelStats: ChannelStat[] = sourceStats.map(s => ({
    name: s.name,
    count: s.count,
    sum: s.sum,
    cashDesk: s.cashDesk,
    masterIncome: s.masterIncome,
    primary: s.primary,
    secondary: s.secondary,
    cancelled: s.cancelled,
  }));

  const cityMap: Record<string, CityStat> = {};
  for (const o of orders) {
    const code = cityCodeOf(o);
    if (!cityMap[code]) cityMap[code] = { code, name: cityStatName(code), count: 0 };
    cityMap[code].count += 1;
    if (o.status === 'completed') {
      cityMap[code].cashDesk = (cityMap[code].cashDesk ?? 0) + (o.cashDesk ?? o.finalAmount ?? o.basePrice);
    }
  }

  const managerMap: Record<string, ManagerStat> = {};
  for (const o of orders) {
    const name = o.manager || '—';
    if (!managerMap[name]) {
      managerMap[name] = { name, primary: 0, secondary: 0, completedCount: 0, completedSum: 0 };
    }
    if (o.orderType === 'primary') managerMap[name].primary += 1;
    else managerMap[name].secondary += 1;
    if (o.status === 'completed') {
      managerMap[name].completedCount += 1;
      managerMap[name].completedSum += o.finalAmount ?? o.basePrice;
    }
  }

  const pestMap: Record<string, PestStat> = {};
  for (const o of orders) {
    if (!pestMap[o.pest]) {
      pestMap[o.pest] = { name: o.pest, count: 0, sum: 0, primary: 0, secondary: 0, cancelled: 0, completedCount: 0 };
    }
    pestMap[o.pest].count += 1;
    if (o.orderType === 'primary') pestMap[o.pest].primary += 1;
    else pestMap[o.pest].secondary += 1;
    if (o.status === 'cancelled') pestMap[o.pest].cancelled += 1;
    if (o.status === 'completed') {
      pestMap[o.pest].completedCount += 1;
      pestMap[o.pest].sum += o.finalAmount ?? o.basePrice;
    }
  }

  const totals = {
    primaryCount: orders.filter(o => o.orderType === 'primary').length,
    secondaryCount: orders.filter(o => o.orderType === 'secondary').length,
    completedCount: orders.filter(o => o.status === 'completed').length,
    totalSum: sumCompleted(orders),
  };

  return {
    daily,
    totals,
    plan: options.plan,
    monthlyExpenses: options.monthlyExpenses ?? [],
    sourceStats,
    channelStats,
    cityStats: Object.values(cityMap),
    managerStats: Object.values(managerMap),
    pestStats: Object.values(pestMap),
  };
}

export function computeStatistics(db: DemoDb, year: number, month: number): StatisticsData {
  const orders = db.orders.filter(o => inMonth(o, year, month));
  const plan = db.monthlyPlans[ymKey(year, month)];
  const monthlyExpenses = db.monthlyExpenses.filter(e => e.year === year && e.month === month);
  return buildStatisticsFromOrders(db, orders, { plan, monthlyExpenses, today: db.anchorDate });
}

export function computeStatisticsPeriod(db: DemoDb, startDate: string, endDate: string): StatisticsData {
  const orders = db.orders.filter(o => inRange(o, startDate, endDate));
  const y = Number(startDate.slice(0, 4));
  const m = Number(startDate.slice(5, 7));
  const plan = db.monthlyPlans[ymKey(y, m)];
  const startYm = startDate.slice(0, 7);
  const endYm = endDate.slice(0, 7);
  const monthlyExpenses = db.monthlyExpenses.filter(e => {
    const ym = `${e.year}-${String(e.month).padStart(2, '0')}`;
    return ym >= startYm && ym <= endYm;
  });
  return buildStatisticsFromOrders(db, orders, { plan, monthlyExpenses, today: db.anchorDate });
}

function eachMonthInRange(startDate: string, endDate: string, fn: (year: number, month: number) => void) {
  let y = Number(startDate.slice(0, 4));
  let m = Number(startDate.slice(5, 7));
  const endY = Number(endDate.slice(0, 4));
  const endM = Number(endDate.slice(5, 7));
  while (y < endY || (y === endY && m <= endM)) {
    fn(y, m);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
}

function clicksForSourceInRange(db: DemoDb, sourceName: string, startDate: string, endDate: string): number {
  let sum = 0;
  eachMonthInRange(startDate, endDate, (year, month) => {
    sum += db.sourceClicks[`${sourceName}|${year}|${month}`] ?? 0;
  });
  return sum;
}

function buildConversionFromOrders(
  db: DemoDb,
  orders: Order[],
  clicksForSource: (sourceName: string) => number,
): ConversionData {
  const sources = db.sources.map(src => {
    const leads = orders.filter(o => o.source === src.name).length;
    const clicks = clicksForSource(src.name);
    return {
      sourceName: src.name,
      sourceId: src.id,
      adCampaign: src.adCampaign ?? null,
      leads,
      clicks,
      conversion: clicks > 0 ? Math.round((leads / clicks) * 1000) / 10 : 0,
    };
  });
  const totals = sources.reduce(
    (acc, s) => ({ leads: acc.leads + s.leads, clicks: acc.clicks + s.clicks, conversion: 0 }),
    { leads: 0, clicks: 0, conversion: 0 },
  );
  totals.conversion = totals.clicks > 0 ? Math.round((totals.leads / totals.clicks) * 1000) / 10 : 0;
  return { sources, totals };
}

export function computeConversion(db: DemoDb, year: number, month: number): ConversionData {
  const orders = db.orders.filter(o => inMonth(o, year, month));
  return buildConversionFromOrders(db, orders, name => db.sourceClicks[`${name}|${year}|${month}`] ?? 0);
}

export function computeConversionPeriod(db: DemoDb, startDate: string, endDate: string): ConversionData {
  const orders = db.orders.filter(o => inRange(o, startDate, endDate));
  return buildConversionFromOrders(db, orders, name => clicksForSourceInRange(db, name, startDate, endDate));
}

export function defaultPlan(): MonthlyPlan {
  return {
    primaryCount: 0,
    secondaryCount: 0,
    primarySum: 0,
    secondarySum: 0,
    totalSum: 0,
    cashDesk: 0,
    adSpend: 0,
    netProfit: 0,
  };
}
