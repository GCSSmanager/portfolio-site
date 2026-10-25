import type { ChannelStat, DailyStats, SourceDayStat, SourceStats } from '@/types';

export type SourceScope =
  | { kind: 'all' }
  | { kind: 'channel'; name: string }
  | { kind: 'source'; name: string };

export const sourceMatchesScope = (sourceName: string, scope: SourceScope): boolean => {
  if (scope.kind === 'all') return true;
  return sourceName === scope.name;
};

export const isAllSources = (scope: SourceScope): boolean => scope.kind === 'all';
export const isAllCities = (city: string | null | undefined): boolean => !city;

const sumRows = (rows: SourceDayStat[], key: keyof SourceDayStat): number =>
  rows.reduce((total, row) => total + (Number(row[key]) || 0), 0);

const rowMatches = (row: SourceDayStat, scope: SourceScope, city?: string | null): boolean =>
  sourceMatchesScope(row.name, scope) && (isAllCities(city) || row.city === city);

export const filterDailyByScope = (
  days: DailyStats[],
  scope: SourceScope,
  city?: string | null,
): DailyStats[] => {
  if (scope.kind === 'all' && isAllCities(city)) return days;

  return days.map(day => {
    const rows = (day.sourceDayStats || []).filter(row => rowMatches(row, scope, city));
    const primarySum = sumRows(rows, 'primarySum');
    const secondarySum = sumRows(rows, 'secondarySum');
    const cashDesk = sumRows(rows, 'cashDesk');
    const masterIncome = sumRows(rows, 'masterIncome');
    const citySpend = city && day.cityAdSpend ? Number(day.cityAdSpend[city]) || 0 : 0;
    const adSpend = scope.kind === 'all' && city ? citySpend : 0;
    return {
      ...day,
      sourceDayStats: rows,
      createdPrimaryCount: sumRows(rows, 'createdPrimary'),
      createdSecondaryCount: sumRows(rows, 'createdSecondary'),
      primaryCount: sumRows(rows, 'completedPrimary'),
      secondaryCount: sumRows(rows, 'completedSecondary'),
      primarySum,
      secondarySum,
      totalSum: primarySum + secondarySum,
      cashDesk,
      masterIncome,
      adSpend,
      netProfit: cashDesk - adSpend,
      createdPestStats: [],
    };
  });
};

export const filterSourceStats = (stats: SourceStats[], scope: SourceScope): SourceStats[] =>
  stats.filter(source => sourceMatchesScope(source.name, scope));

export const sourceStatsFromDays = (days: DailyStats[], scope: SourceScope = { kind: 'all' }): SourceStats[] => {
  const map: Record<string, SourceStats> = {};

  days.forEach(day => {
    (day.sourceDayStats || []).forEach(row => {
      if (!sourceMatchesScope(row.name, scope)) return;
      if (!map[row.name]) {
        map[row.name] = {
          name: row.name,
          count: 0,
          sum: 0,
          cashDesk: 0,
          masterIncome: 0,
          primary: 0,
          secondary: 0,
          cancelled: 0,
          cancelledOnSite: 0,
          cancelledNotCompleted: 0,
        };
      }
      const item = map[row.name];
      item.count += Number(row.count) || 0;
      item.sum += Number(row.sum) || 0;
      item.cashDesk = (item.cashDesk || 0) + (Number(row.cashDesk) || 0);
      item.masterIncome = (item.masterIncome || 0) + (Number(row.masterIncome) || 0);
      item.primary += Number(row.completedPrimary) || 0;
      item.secondary += Number(row.completedSecondary) || 0;
      item.cancelled += Number(row.cancelled) || 0;
    });
  });

  return Object.values(map).sort((a, b) => b.count - a.count);
};

export const channelCashDesk = (channel: ChannelStat): number => channel.cashDesk || 0;
