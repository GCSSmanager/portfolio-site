/*
 * File: src/app/statistics/page.tsx
 * Version: 1.1.0
 * Description: Statistics dashboard.
 */


import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import Button from '@/components/UI/Button';
import Modal from '@/components/UI/Modal';
import Input from '@/components/UI/Input';
import { useOrderStore } from '@/store/orderStore';
import { useAuth } from '@/contexts/AuthContext';
import api, { DailyStats, MonthlyPlan, MonthlyExpense, SourceStats, ConversionSourceStats, ManagerStat, PestStat, StatisticsData } from '@/lib/api';
import SourceLabel from '@/components/UI/SourceLabel';
import StatisticsCharts from '@/components/Statistics/StatisticsCharts';
import SourceAnalyticsCard, { SourceScopeBar } from '@/components/Statistics/SourceAnalyticsCard';
import CityScopeBar from '@/components/Statistics/CityScopeBar';
import MobileDailyStats from '@/components/Statistics/MobileDailyStats';
import StatisticsInsights, { type PeriodSnapshot } from '@/components/Statistics/StatisticsInsights';
import { formatSourceShort } from '@/lib/sourceLabel';
import { SOURCES_UPDATED_EVENT, type SourcesUpdatedDetail } from '@/demo/events';
import {
  filterDailyByScope,
  filterSourceStats,
  isAllCities,
  isAllSources,
  sourceStatsFromDays,
  type SourceScope,
} from '@/lib/sourceScope';
import { PRIVATE_ADVERTISER_SOURCE } from '@/lib/protectedSources';
import { getOrderServiceLabel } from '@/lib/orderFields';
import { REQUIRED_FIELD_ERROR, submitButtonClass } from '@/lib/formSubmitStyle';

type PeriodMode = 'month' | 'custom';
type MobileTab = 'table' | 'summary';
type CreatedOrderType = 'primary' | 'secondary';

interface CreatedDetailsSelection {
  title: string;
  days: DailyStats[];
  type: CreatedOrderType;
}

const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const makeSnapshot = (daily: DailyStats[], sources: SourceStats[], scoped: boolean): PeriodSnapshot => {
  const primary = sources.reduce((sum, source) => sum + source.primary, 0);
  const secondary = sources.reduce((sum, source) => sum + source.secondary, 0);
  const cancellations = sources.reduce((sum, source) => sum + source.cancelled, 0);
  const leads = primary + secondary + cancellations;
  const orders = primary + secondary;
  const completed = daily.reduce((sum, day) => sum + day.primaryCount + day.secondaryCount, 0);
  const revenue = daily.reduce((sum, day) => sum + day.totalSum, 0);
  const cash = daily.reduce((sum, day) => sum + day.cashDesk, 0);
  const adSpend = scoped ? 0 : daily.reduce((sum, day) => sum + day.adSpend, 0);
  return {
    leads,
    orders,
    completed,
    primary,
    secondary,
    cancellations,
    revenue,
    cash,
    adSpend,
    netProfit: cash - adSpend,
  };
};

function StatisticsContent() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const orderServiceLabel = getOrderServiceLabel();
  const orderServicesLabel = orderServiceLabel === 'Услуга' ? 'услуги' : 'вредителей';

  const {
    statistics,
    isLoading,
    fetchStatistics,
    fetchStatisticsByPeriod,
    updateAdSpend,
    updatePlan
  } = useOrderStore();

  // UI State
  const [periodMode, setPeriodMode] = useState<PeriodMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [mounted, setMounted] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>('summary');
  const [showDailyStats, setShowDailyStats] = useState(false);

  // Ad Spend State
  const [localAdSpend, setLocalAdSpend] = useState<Record<string, string>>({});
  const initializedRef = useRef(false);
  const dirtyFieldsRef = useRef<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  // Plan State
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planForm, setPlanForm] = useState<MonthlyPlan>({
    primaryCount: 30,
    secondaryCount: 15,
    primarySum: 800000,
    secondarySum: 150000,
    totalSum: 950000,
    cashDesk: 600000,
    adSpend: 300000,
    netProfit: 300000,
  });
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [showExpensesModal, setShowExpensesModal] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseComment, setExpenseComment] = useState('');
  const [expenseShowValidation, setExpenseShowValidation] = useState(false);
  const [isSavingExpense, setIsSavingExpense] = useState(false);
  const [periodApplyTouched, setPeriodApplyTouched] = useState(false);
  const [sourceShowValidation, setSourceShowValidation] = useState(false);
  const [planShowValidation, setPlanShowValidation] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [yandexEnabled, setYandexEnabled] = useState(false);

  // Conversion State
  const [conversionData, setConversionData] = useState<ConversionSourceStats[]>([]);
  const [conversionTotals, setConversionTotals] = useState({ leads: 0, clicks: 0, conversion: 0 });
  const [localClicks, setLocalClicks] = useState<Record<string, string>>({});
  const [isSavingClicks, setIsSavingClicks] = useState(false);
  const [previousStatistics, setPreviousStatistics] = useState<StatisticsData | null>(null);

  // Source Detail Modal State
  const [selectedSource, setSelectedSource] = useState<ConversionSourceStats | null>(null);
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [editClicks, setEditClicks] = useState('');
  const [isSavingSource, setIsSavingSource] = useState(false);
  const [selectedCreatedDetails, setSelectedCreatedDetails] = useState<CreatedDetailsSelection | null>(null);
  const [sourceScope, setSourceScope] = useState<SourceScope>({ kind: 'all' });
  const [cityScope, setCityScope] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const months = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  const monthsShort = [
    'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
    'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'
  ];

  useEffect(() => {
    if (!customStart && !customEnd) {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setCustomStart(firstDay.toISOString().split('T')[0]);
      setCustomEnd(lastDay.toISOString().split('T')[0]);
    }
  }, [customStart, customEnd]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setSourceScope({ kind: 'all' });
  }, [year, month, periodMode]);

  useEffect(() => {
    void api.getYandexConfig()
      .then((cfg) => setYandexEnabled(cfg.enabled))
      .catch(() => setYandexEnabled(false));
  }, []);

  const loadData = useCallback(() => {
    if (!mounted) return;
    initializedRef.current = false;

    if (periodMode === 'month') {
      fetchStatistics(year, month);
    } else if (customStart && customEnd) {
      fetchStatisticsByPeriod(customStart, customEnd);
    }
  }, [mounted, periodMode, year, month, customStart, customEnd, fetchStatistics, fetchStatisticsByPeriod]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadConversion = useCallback(async () => {
    if (!mounted) return;
    if (periodMode === 'custom' && (!customStart || !customEnd || customStart > customEnd)) {
      setConversionData([]);
      setConversionTotals({ leads: 0, clicks: 0, conversion: 0 });
      return;
    }
    try {
      const result = periodMode === 'month'
        ? await api.getConversionStats(year, month)
        : await api.getConversionStatsByPeriod(customStart, customEnd);
      setConversionData(result.sources);
      setConversionTotals(result.totals);
      const clicksMap: Record<string, string> = {};
      result.sources.forEach((s: ConversionSourceStats) => {
        clicksMap[s.sourceName] = s.clicks > 0 ? s.clicks.toString() : '';
      });
      setLocalClicks(clicksMap);
    } catch (error) {
      console.error('Failed to fetch conversion data:', error);
    }
  }, [mounted, periodMode, year, month, customStart, customEnd]);

  useEffect(() => {
    const onSourcesUpdated = (event: Event) => {
      const detail = (event as CustomEvent<SourcesUpdatedDetail>).detail;
      loadData();
      void loadConversion();
      if (detail?.oldName && detail?.newName) {
        setSelectedSource(prev =>
          prev?.sourceName === detail.oldName ? { ...prev, sourceName: detail.newName } : prev,
        );
        setLocalClicks(prev => {
          if (!(detail.oldName in prev)) return prev;
          const next = { ...prev };
          next[detail.newName] = next[detail.oldName];
          delete next[detail.oldName];
          return next;
        });
      }
    };

    window.addEventListener(SOURCES_UPDATED_EVENT, onSourcesUpdated);
    return () => window.removeEventListener(SOURCES_UPDATED_EVENT, onSourcesUpdated);
  }, [loadData, loadConversion, mounted]);

  useEffect(() => {
    void loadConversion();
  }, [loadConversion]);

  useEffect(() => {
    if (!mounted) return;

    let previousStart: Date;
    let previousEnd: Date;
    if (periodMode === 'month') {
      previousStart = new Date(year, month - 2, 1);
      previousEnd = new Date(year, month - 1, 0);
    } else {
      if (!customStart || !customEnd) return;
      const start = new Date(`${customStart}T12:00:00`);
      const end = new Date(`${customEnd}T12:00:00`);
      const periodDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
      previousEnd = new Date(start);
      previousEnd.setDate(previousEnd.getDate() - 1);
      previousStart = new Date(previousEnd);
      previousStart.setDate(previousStart.getDate() - periodDays + 1);
    }

    void api.getStatisticsByPeriod(dateKey(previousStart), dateKey(previousEnd))
      .then(setPreviousStatistics)
      .catch(() => setPreviousStatistics(null));
  }, [mounted, periodMode, year, month, customStart, customEnd]);

  useEffect(() => {
    if (statistics?.daily && !initializedRef.current) {
      const adSpendMap: Record<string, string> = {};
      statistics.daily.forEach(day => {
        adSpendMap[day.date] = day.adSpend ? day.adSpend.toString() : '';
      });
      setLocalAdSpend(adSpendMap);
      initializedRef.current = true;
      dirtyFieldsRef.current.clear();
    }
  }, [statistics]);

  const handleClicksChange = (sourceName: string, value: string) => {
    const cleanValue = value.replace(/[^\d]/g, '');
    setLocalClicks(prev => ({ ...prev, [sourceName]: cleanValue }));
  };

  const handleClicksBlur = async (sourceName: string) => {
    if (periodMode !== 'month') return;
    const clicks = Number(localClicks[sourceName]) || 0;
    setIsSavingClicks(true);
    try {
      await api.updateSourceClicks({ sourceName, year, month, clicks });
      await loadConversion();
    } catch (error) {
      console.error('Error saving clicks:', error);
    } finally {
      setIsSavingClicks(false);
    }
  };

  const openSourceDetail = (source: ConversionSourceStats) => {
    setSelectedSource(source);
    setEditClicks(source.clicks > 0 ? source.clicks.toString() : '');
    setShowSourceModal(true);
  };

  const canSaveSourceDetail =
    periodMode === 'month'
    && selectedSource !== null
    && editClicks.trim().length > 0;

  const canSavePlan =
    planForm.primaryCount > 0
    || planForm.secondaryCount > 0
    || planForm.primarySum > 0
    || planForm.secondarySum > 0
    || planForm.cashDesk > 0
    || planForm.adSpend > 0;

  const handleSaveSourceDetail = async () => {
    if (!selectedSource) return;
    setSourceShowValidation(true);
    if (!canSaveSourceDetail) return;
    setIsSavingSource(true);
    try {
      const clicks = Number(editClicks) || 0;
      await api.updateSourceClicks({ sourceName: selectedSource.sourceName, year, month, clicks });
      await loadConversion();
      setShowSourceModal(false);
      setSourceShowValidation(false);
    } catch (error) {
      console.error('Error saving source detail:', error);
    } finally {
      setIsSavingSource(false);
    }
  };

  useEffect(() => {
    if (statistics?.plan) {
      setPlanForm(statistics.plan);
    }
  }, [statistics?.plan]);

  const saveAllDirtyFields = useCallback(async () => {
    const dirtyDates = Array.from(dirtyFieldsRef.current);
    if (dirtyDates.length === 0) return;

    setIsSaving(true);
    try {
      for (const date of dirtyDates) {
        const value = Number(localAdSpend[date]) || 0;
        await updateAdSpend(date, value);
      }
      dirtyFieldsRef.current.clear();
    } catch (error) {
      console.error('Error saving:', error);
    } finally {
      setIsSaving(false);
    }
  }, [localAdSpend, updateAdSpend]);

  const handleAdSpendChange = (date: string, value: string) => {
    const cleanValue = value.replace(/[^\d]/g, '');
    setLocalAdSpend(prev => ({ ...prev, [date]: cleanValue }));
    dirtyFieldsRef.current.add(date);
  };

  const handleAdSpendBlur = async (date: string) => {
    if (!dirtyFieldsRef.current.has(date)) return;
    const value = Number(localAdSpend[date]) || 0;
    try {
      await updateAdSpend(date, value);
      dirtyFieldsRef.current.delete(date);
    } catch (error) {
      console.error('Error saving:', error);
    }
  };

  const changeMonth = async (delta: number) => {
    await saveAllDirtyFields();
    setCurrentDate(new Date(year, currentDate.getMonth() + delta, 1));
  };

  const handleApplyPeriod = async () => {
    if (periodMode === 'custom') {
      setPeriodApplyTouched(true);
      if (!customStart || !customEnd || customStart > customEnd) return;
    }
    await saveAllDirtyFields();
    loadData();
  };

  const handleBack = async () => {
    await saveAllDirtyFields();
    navigate('/');
  };

  const handleLogout = async () => {
    await saveAllDirtyFields();
    logout();
    navigate('/login');
  };

  const handleSavePlan = async () => {
    setPlanShowValidation(true);
    if (!canSavePlan) return;
    setIsSavingPlan(true);
    try {
      const updatedPlan = {
        ...planForm,
        totalSum: planForm.primarySum + planForm.secondarySum,
        netProfit: planForm.cashDesk - planForm.adSpend,
      };
      await updatePlan(year, month, updatedPlan);
      setShowPlanModal(false);
      setPlanShowValidation(false);
    } catch (error) {
      console.error('Error saving plan:', error);
    } finally {
      setIsSavingPlan(false);
    }
  };

  const parsedExpenseAmount = Number(expenseAmount.replace(/\s/g, '').replace(',', '.'));
  const canAddExpense =
    Number.isFinite(parsedExpenseAmount)
    && parsedExpenseAmount > 0
    && expenseComment.trim().length > 0;

  const canApplyCustomPeriod =
    periodMode !== 'custom'
    || (Boolean(customStart && customEnd) && customStart <= customEnd);

  const handleAddExpense = async () => {
    setExpenseShowValidation(true);
    if (!canAddExpense) return;

    setIsSavingExpense(true);
    try {
      await api.createMonthlyExpense({
        year,
        month,
        amount: parsedExpenseAmount,
        comment: expenseComment.trim(),
      });
      setExpenseAmount('');
      setExpenseComment('');
      setExpenseShowValidation(false);
      await fetchStatistics(year, month);
    } catch (error) {
      console.error('Error adding expense:', error);
    } finally {
      setIsSavingExpense(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Удалить этот расход?')) return;
    try {
      await api.deleteMonthlyExpense(id);
      await fetchStatistics(year, month);
    } catch (error) {
      console.error('Error deleting expense:', error);
    }
  };

  const handleSyncYandex = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      let startDate: string;
      let endDate: string;

      if (periodMode === 'month') {
        startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
      } else {
        startDate = customStart;
        endDate = customEnd;
      }

      const result = await api.syncYandex(startDate, endDate);

      const unboundInfo = result.campaignsUnbound > 0
        ? ` | ⚠ ${result.campaignsUnbound} кампаний без привязки`
        : '';
      setSyncMessage(`✅ Обновлено ${result.updatedDays} дней. Расходы: ${result.totalSpend.toLocaleString('ru-RU')} ₽, Клики: ${result.totalClicks}${unboundInfo}`);

      loadData();
    } catch (error: any) {
      console.error('Sync error:', error);
      setSyncMessage(`❌ Ошибка: ${error.message}`);
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncMessage(null), 5000);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="relative">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-4 border-gray-200"></div>
          <div className="absolute top-0 left-0 w-14 h-14 sm:w-16 sm:h-16 rounded-full border-4 border-green-500 border-t-transparent animate-spin"></div>
        </div>
      </div>
    );
  }

  const daily = statistics?.daily || [];
  const sourceStats = statistics?.sourceStats || [];
  const cityStats = statistics?.cityStats || [];
  const sourceScoped = !isAllSources(sourceScope);
  const cityScoped = !isAllCities(cityScope);
  const scoped = sourceScoped || cityScoped;
  const hideAdSpend = sourceScoped;
  const cityDaily = filterDailyByScope(daily, { kind: 'all' }, cityScope);
  const sourceStatsForPicker = isAllCities(cityScope) ? sourceStats : sourceStatsFromDays(cityDaily);
  const visibleDaily = filterDailyByScope(daily, sourceScope, cityScope);
  const visibleSources = filterSourceStats(sourceStatsForPicker, sourceScope);
  const managerStats = statistics?.managerStats || [];
  const pestStats = statistics?.pestStats || [];
  const monthlyExpenses: MonthlyExpense[] = statistics?.monthlyExpenses || [];
  const monthlyExpensesTotal = scoped
    ? 0
    : (statistics?.totals?.monthlyExpensesTotal ?? monthlyExpenses.reduce((sum, e) => sum + e.amount, 0));

  const calculateTotals = () => {
    const serverTotals = statistics?.totals;
    let primarySum = 0, secondarySum = 0, totalSum = 0;
    let cashDesk = 0, adSpend = 0, masterIncome = 0;
    let createdPrimaryCount = 0, createdSecondaryCount = 0;

    visibleDaily.forEach(day => {
      primarySum += day.primarySum;
      secondarySum += day.secondarySum;
      totalSum += day.totalSum;
      cashDesk += day.cashDesk;
      masterIncome += day.masterIncome || 0;
      createdPrimaryCount += day.createdPrimaryCount || 0;
      createdSecondaryCount += day.createdSecondaryCount || 0;
      adSpend += hideAdSpend ? 0 : cityScoped ? (day.adSpend || 0) : Number(localAdSpend[day.date]) || 0;
    });

    let primaryCount = 0, secondaryCount = 0;
    let cancelledOnSiteCount = 0, cancelledNotCompletedCount = 0;

    visibleSources.forEach(source => {
      primaryCount += source.primary || 0;
      secondaryCount += source.secondary || 0;
      cancelledOnSiteCount += source.cancelledOnSite || 0;
      cancelledNotCompletedCount += source.cancelledNotCompleted || 0;
    });

    const totalCancelled = cancelledOnSiteCount + cancelledNotCompletedCount;
    const totalLeads = primaryCount + secondaryCount + totalCancelled;
    const totalCount = primaryCount + secondaryCount;
    const scopedExpenses = scoped ? 0 : monthlyExpensesTotal;
    const netProfitBeforeExpenses = cashDesk - adSpend;
    const netProfit = netProfitBeforeExpenses - scopedExpenses;

    const dailyPrimaryCount = visibleDaily.reduce((sum, day) => sum + day.primaryCount, 0);
    const dailySecondaryCount = visibleDaily.reduce((sum, day) => sum + day.secondaryCount, 0);

    const avgCheckPrimary = !scoped && typeof serverTotals?.avgCheckPrimary === 'number'
      ? serverTotals.avgCheckPrimary
      : (dailyPrimaryCount > 0 ? Math.round(primarySum / dailyPrimaryCount) : 0);
    const avgCheckSecondary = !scoped && typeof serverTotals?.avgCheckSecondary === 'number'
      ? serverTotals.avgCheckSecondary
      : (dailySecondaryCount > 0 ? Math.round(secondarySum / dailySecondaryCount) : 0);
    const avgCheckTotal = !scoped && typeof serverTotals?.avgCheckTotal === 'number'
      ? serverTotals.avgCheckTotal
      : ((dailyPrimaryCount + dailySecondaryCount) > 0 ? Math.round(totalSum / (dailyPrimaryCount + dailySecondaryCount)) : 0);

    const marginPercent = totalSum > 0 ? (netProfit / totalSum) * 100 : 0;
    const profitabilityPercent = adSpend > 0 ? (netProfit / adSpend) * 100 : 0;
    const cplDivisor = primaryCount + cancelledOnSiteCount + cancelledNotCompletedCount;
    const costPerLead = cplDivisor > 0 ? Math.round(adSpend / cplDivisor) : 0;
    const costPerSuccessfulOrder = dailyPrimaryCount > 0 ? Math.round(adSpend / dailyPrimaryCount) : 0;
    const drrPercent = primarySum > 0 ? (adSpend / primarySum) * 100 : 0;

    return {
      primaryCount, secondaryCount, totalCount,
      primarySum, secondarySum, totalSum,
      cashDesk, masterIncome, adSpend, monthlyExpensesTotal: scopedExpenses, netProfitBeforeExpenses, netProfit,
      avgCheckPrimary, avgCheckSecondary, avgCheckTotal,
      marginPercent, profitabilityPercent, costPerLead, costPerSuccessfulOrder, drrPercent,
      cancelledOnSiteCount, cancelledNotCompletedCount, totalLeads,
      createdPrimaryCount, createdSecondaryCount,
    };
  };

  const totals = calculateTotals();
  const plan = statistics?.plan || planForm;
  const currentSnapshot = makeSnapshot(
    visibleDaily.map(day => ({
      ...day,
      adSpend: hideAdSpend ? 0 : cityScoped ? day.adSpend : Number(localAdSpend[day.date]) || day.adSpend,
    })),
    visibleSources,
    sourceScoped,
  );
  const previousSnapshot = previousStatistics
    ? makeSnapshot(
        filterDailyByScope(previousStatistics.daily || [], sourceScope, cityScope),
        filterSourceStats(
          isAllCities(cityScope)
            ? (previousStatistics.sourceStats || [])
            : sourceStatsFromDays(filterDailyByScope(previousStatistics.daily || [], { kind: 'all' }, cityScope)),
          sourceScope,
        ),
        sourceScoped,
      )
    : null;

  const getPercent = (fact: number, planValue: number) =>
    planValue ? Math.round((fact / planValue) * 100) : 0;

  const getDayNetProfit = (day: DailyStats) => {
    if (sourceScoped) return day.cashDesk;
    if (cityScoped) return day.cashDesk - (day.adSpend || 0);
    const adSpend = Number(localAdSpend[day.date]) || 0;
    return day.cashDesk - adSpend;
  };

  const formatDisplayDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
  };

  const isWeekend = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  const now = new Date();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const isToday = (dateStr: string) => dateStr === todayKey;
  const todayStats = visibleDaily.find(day => day.date === todayKey);

  const formatNumber = (value: number) => value.toLocaleString('ru-RU');
  const formatMoney = (value: number) => value.toLocaleString('ru-RU') + ' ₽';
  const formatPercent = (value: number) => value.toFixed(1) + '%';

  const getCreatedCount = (day: DailyStats, type: CreatedOrderType) =>
    type === 'primary' ? (day.createdPrimaryCount || 0) : (day.createdSecondaryCount || 0);

  const getCurrentPeriodLabel = () => {
    if (periodMode === 'month') {
      return `${months[month - 1]} ${year}`;
    }

    return `${formatDisplayDate(customStart)} - ${formatDisplayDate(customEnd)}`;
  };

  const getCreatedTypeShortLabel = (type: CreatedOrderType) => type === 'primary' ? 'П' : 'В';

  const aggregateCreatedPestStats = (days: DailyStats[], type: CreatedOrderType) => {
    const pestMap: Record<string, { name: string; count: number; primary: number; secondary: number }> = {};

    days.forEach(day => {
      (day.createdPestStats || []).forEach(pest => {
        const primary = type === 'primary' ? pest.primary : 0;
        const secondary = type === 'secondary' ? pest.secondary : 0;
        const count = primary + secondary;

        if (count === 0) return;

        if (!pestMap[pest.name]) {
          pestMap[pest.name] = { name: pest.name, count: 0, primary: 0, secondary: 0 };
        }

        pestMap[pest.name].primary += primary;
        pestMap[pest.name].secondary += secondary;
        pestMap[pest.name].count += count;
      });
    });

    return Object.values(pestMap).sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.name.localeCompare(b.name, 'ru');
    });
  };

  const openCreatedPestDetails = (day: DailyStats, type: CreatedOrderType) => {
    if (scoped) return;
    if (getCreatedCount(day, type) === 0) return;

    setSelectedCreatedDetails({
      title: `Оформлено ${getCreatedTypeShortLabel(type)} ${formatDisplayDate(day.date)}`,
      days: [day],
      type,
    });
  };

  const openCreatedTotalPestDetails = (type: CreatedOrderType) => {
    if (scoped) return;
    const count = type === 'primary' ? totals.createdPrimaryCount : totals.createdSecondaryCount;
    if (!count) return;

    setSelectedCreatedDetails({
      title: `Оформлено ${getCreatedTypeShortLabel(type)}: ${getCurrentPeriodLabel()}`,
      days: daily,
      type,
    });
  };

  const CreatedCountButton = ({ day, type }: { day: DailyStats; type: CreatedOrderType }) => {
    const count = getCreatedCount(day, type);

    if (count === 0) {
      return <span className="text-gray-400 font-medium">0</span>;
    }

    return (
      <button
        type="button"
        onClick={() => openCreatedPestDetails(day, type)}
        className="inline-flex min-w-6 items-center justify-center rounded-lg px-1.5 py-0.5 font-semibold text-gray-900 transition-colors hover:bg-emerald-50 hover:text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        title={`Показать ${orderServicesLabel} за день`}
      >
        {count}
      </button>
    );
  };

  const CreatedTotalButton = ({ type }: { type: CreatedOrderType }) => {
    const count = type === 'primary' ? totals.createdPrimaryCount : totals.createdSecondaryCount;

    if (!count) {
      return <span className="font-bold text-gray-700">0</span>;
    }

    return (
      <button
        type="button"
        onClick={() => openCreatedTotalPestDetails(type)}
        className="inline-flex min-w-7 items-center justify-center rounded-lg px-2 py-0.5 font-bold text-gray-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        title={`Показать ${orderServicesLabel} за период`}
      >
        {count}
      </button>
    );
  };

  const planFactRows = [
    { label: 'Первичные (шт)', plan: plan.primaryCount, fact: totals.primaryCount, isCount: true },
    { label: 'Повторные (шт)', plan: plan.secondaryCount, fact: totals.secondaryCount, isCount: true },
    { label: 'Первичные (₽)', plan: plan.primarySum, fact: totals.primarySum },
    { label: 'Повторные (₽)', plan: plan.secondarySum, fact: totals.secondarySum },
    { label: 'Всего (₽)', plan: plan.totalSum, fact: totals.totalSum },
    { label: 'В кассу', plan: plan.cashDesk, fact: totals.cashDesk },
    { label: 'Реклама', plan: plan.adSpend, fact: totals.adSpend },
    { label: 'ЧП', plan: plan.netProfit, fact: totals.netProfit, isBold: true },
  ];

  const renderSourceAnalytics = () => (
    <SourceAnalyticsCard
      stats={sourceStatsForPicker}
      scope={sourceScope}
      onChange={setSourceScope}
      conversionData={conversionData}
      onOpenConversion={periodMode === 'month' ? openSourceDetail : undefined}
      conversionPeriodHint={periodMode === 'custom' ? 'Клики суммируются по месяцам внутри выбранного периода. Редактирование — в режиме «Месяц».' : undefined}
    />
  );

  const ManagerStatsCard = ({ stats }: { stats: ManagerStat[] }) => (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="border-b border-gray-100 px-4 py-2.5 text-gray-900">
        <h3 className="font-semibold">Менеджеры</h3>
      </div>
      <div className="max-h-[22rem] overflow-y-auto p-3">
        {stats.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-2">Нет данных</p>
        ) : (
          <div className="space-y-2">
            {stats.map((manager, idx) => (
              <div key={idx} className="rounded-xl border border-gray-100 bg-gray-50 p-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-gray-900">{manager.name}</div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs">
                      <span className="px-2 py-1 rounded-full bg-green-100 text-green-700">
                        Первички: {manager.primary}
                      </span>
                      <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                        Вторички: {manager.secondary}
                      </span>
                      <span className="px-2 py-1 rounded-full bg-gray-200 text-gray-700">
                        Закрыто: {manager.completedCount}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-gray-500">Сумма закрытых</div>
                    <div className="text-base font-bold text-blue-700">{formatMoney(manager.completedSum)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const PestStatsCard = ({ stats }: { stats: PestStat[] }) => (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="border-b border-gray-100 px-4 py-2.5 text-gray-900">
        <h3 className="font-semibold">
          {orderServiceLabel === 'Услуга' ? 'Услуги' : 'Вредители'}
        </h3>
      </div>
      <div className="max-h-[22rem] overflow-y-auto p-3">
        {stats.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-2">Нет данных</p>
        ) : (
          <div className="space-y-2">
            {stats.map((pest, idx) => (
              <div key={idx} className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-gray-900">{pest.name}</div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs">
                      <span className="px-2 py-1 rounded-full bg-green-100 text-green-700">
                        Первичные: {pest.primary}
                      </span>
                      <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                        Повторные: {pest.secondary}
                      </span>
                      <span className="px-2 py-1 rounded-full bg-gray-200 text-gray-700">
                        Всего: {pest.count}
                      </span>
                      {pest.cancelled > 0 && (
                        <span className="px-2 py-1 rounded-full bg-red-100 text-red-700">
                          Отмены: {pest.cancelled}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-gray-500">Закрыто / сумма</div>
                    <div className="text-sm font-semibold text-gray-900">{pest.completedCount}</div>
                    <div className="text-base font-bold text-emerald-700">{formatMoney(pest.sum)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-4">
      {/* Header - Desktop */}
      <header className="hidden sm:block bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-full mx-auto px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={handleBack} className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <span className="text-xl">📊</span>
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">Статистика</h1>
                  <p className="text-xs text-gray-500">Аналитика и отчёты</p>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                {isLoading && (
                  <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full">
                    <div className="w-3 h-3 rounded-full border-2 border-blue-600 border-t-transparent animate-spin"></div>
                    Загрузка...
                  </div>
                )}
                {isSaving && (
                  <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 px-3 py-1.5 rounded-full">
                    <div className="w-3 h-3 rounded-full border-2 border-orange-600 border-t-transparent animate-spin"></div>
                    Сохранение...
                  </div>
                )}
              </div>
            </div>
            <button onClick={handleLogout} className="p-2.5 rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors" title="Выход">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Header - Mobile */}
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur sm:hidden safe-top">
        <div className="px-4 py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={handleBack} className="p-2 -ml-2 rounded-lg text-gray-500 active:bg-gray-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="font-semibold tracking-tight text-gray-950">Статистика</span>
            </div>
            <div className="flex items-center gap-2">
              {(isLoading || isSaving) && (
                <div className="w-5 h-5 rounded-full border-2 border-blue-600 border-t-transparent animate-spin"></div>
              )}
              <button onClick={handleLogout} className="p-2 rounded-lg text-gray-500 active:bg-red-50 active:text-red-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Period Selector - Desktop */}
      <div className="hidden sm:block bg-white border-b border-gray-100 px-4 lg:px-6 py-4">
        <div className="flex items-center gap-4 lg:gap-6 flex-wrap">
          <div className="flex rounded-xl bg-gray-100 p-1">
            <button onClick={() => setPeriodMode('month')} className={`px-3 lg:px-4 py-2 rounded-lg text-sm font-medium transition-all ${periodMode === 'month' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
              📅 Месяц
            </button>
            <button onClick={() => setPeriodMode('custom')} className={`px-3 lg:px-4 py-2 rounded-lg text-sm font-medium transition-all ${periodMode === 'custom' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
              📆 Период
            </button>
          </div>

          {periodMode === 'month' ? (
            <div className="flex items-center gap-2">
              <button onClick={() => changeMonth(-1)} disabled={isSaving} className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-50">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <div className="min-w-[140px] lg:min-w-[180px] text-center">
                <span className="text-base lg:text-lg font-semibold text-gray-900">{months[month - 1]} {year}</span>
              </div>
              <button onClick={() => changeMonth(1)} disabled={isSaving} className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-50">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
              <button onClick={() => setCurrentDate(new Date())} className="ml-2 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                Сейчас
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">С</span>
                <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">по</span>
                <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500" />
              </div>
              <Button
                onClick={handleApplyPeriod}
                size="sm"
                variant="success"
                disabled={isLoading}
                className={periodMode === 'custom' ? submitButtonClass(canApplyCustomPeriod) : undefined}
              >
                Применить
              </Button>
            </div>
          )}
          <div className="grid w-full min-w-0 grid-cols-2 gap-2 sm:ml-auto sm:w-[min(100%,22rem)]">
            <SourceScopeBar sourceStats={sourceStatsForPicker} scope={sourceScope} onChange={setSourceScope} compact />
            <CityScopeBar cityStats={cityStats} city={cityScope} onChange={setCityScope} compact />
          </div>
        </div>
      </div>

      {/* Period Selector - Mobile */}
      <div className="space-y-3 border-b border-gray-100 bg-white px-4 py-3 sm:hidden">
        <div className="flex rounded-xl bg-gray-100 p-1">
          <button onClick={() => setPeriodMode('month')} className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${periodMode === 'month' ? 'bg-white text-gray-950 shadow-sm' : 'text-gray-500'}`}>Месяц</button>
          <button onClick={() => setPeriodMode('custom')} className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${periodMode === 'custom' ? 'bg-white text-gray-950 shadow-sm' : 'text-gray-500'}`}>Период</button>
        </div>
        {periodMode === 'month' ? (
          <div className="flex items-center justify-between">
            <button onClick={() => changeMonth(-1)} disabled={isSaving} className="p-2 rounded-lg text-gray-500 active:bg-gray-100">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button onClick={() => setCurrentDate(new Date())} className="text-center">
              <span className="text-base font-semibold text-gray-900">{monthsShort[month - 1]} {year}</span>
            </button>
            <button onClick={() => changeMonth(1)} disabled={isSaving} className="p-2 rounded-lg text-gray-500 active:bg-gray-100">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">С</label>
                <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">По</label>
                <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500" />
              </div>
            </div>
            <Button
              onClick={handleApplyPeriod}
              variant="success"
              className={['w-full', periodMode === 'custom' ? submitButtonClass(canApplyCustomPeriod) : ''].filter(Boolean).join(' ')}
              disabled={isLoading}
            >
              Применить
            </Button>
            {periodMode === 'custom' && periodApplyTouched && !canApplyCustomPeriod ? (
              <p className="text-sm text-red-600">Укажите корректный период (дата начала не позже конца).</p>
            ) : null}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <SourceScopeBar sourceStats={sourceStatsForPicker} scope={sourceScope} onChange={setSourceScope} compact />
          <CityScopeBar cityStats={cityStats} city={cityScope} onChange={setCityScope} compact />
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="border-b border-gray-100 bg-white px-4 py-2 sm:hidden">
        <div className="flex rounded-lg bg-gray-100 p-1">
          <button onClick={() => setMobileTab('summary')} className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${mobileTab === 'summary' ? 'bg-white text-gray-950 shadow-sm' : 'text-gray-500'}`}>Обзор</button>
          <button onClick={() => setMobileTab('table')} className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${mobileTab === 'table' ? 'bg-white text-gray-950 shadow-sm' : 'text-gray-500'}`}>По дням</button>
        </div>
      </div>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-[100rem] p-3 sm:p-4 lg:p-6">
        {todayStats && (
          <section className="mb-4 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm" aria-label="Статистика за сегодня">
            <div className="grid grid-cols-2 divide-x divide-y divide-gray-100 md:grid-cols-[1.15fr_repeat(5,1fr)] md:divide-y-0">
              <div className="col-span-2 px-4 py-3 md:col-span-1 md:px-5">
                <div className="text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-blue-600">Сегодня</div>
                <div className="mt-1 font-semibold text-gray-900">{formatDisplayDate(todayStats.date)}</div>
              </div>
              <div className="px-4 py-3">
                <div className="text-xs text-gray-500">Оформлено</div>
                <div className="mt-1 font-bold tabular-nums text-gray-900">{todayStats.createdPrimaryCount || 0} / {todayStats.createdSecondaryCount || 0}</div>
                <div className="text-[0.6875rem] text-gray-400">перв. / повт.</div>
              </div>
              <div className="px-4 py-3">
                <div className="text-xs text-gray-500">Заказы</div>
                <div className="mt-1 font-bold tabular-nums text-gray-900">{todayStats.primaryCount + todayStats.secondaryCount}</div>
                <div className="text-[0.6875rem] text-gray-400">{todayStats.primaryCount} перв. · {todayStats.secondaryCount} повт.</div>
              </div>
              <div className="px-4 py-3">
                <div className="text-xs text-gray-500">Касса</div>
                <div className="mt-1 font-bold tabular-nums text-green-600">{formatMoney(todayStats.cashDesk)}</div>
              </div>
              <div className="px-4 py-3">
                <div className="text-xs text-gray-500">Реклама</div>
                <div className="mt-1 font-bold tabular-nums text-red-600">{hideAdSpend ? '—' : formatMoney(cityScoped ? todayStats.adSpend : Number(localAdSpend[todayStats.date]) || todayStats.adSpend)}</div>
              </div>
              <div className="px-4 py-3">
                <div className="text-xs text-gray-500">Чистая прибыль</div>
                <div className={`mt-1 font-bold tabular-nums ${getDayNetProfit(todayStats) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {getDayNetProfit(todayStats) > 0 ? '+' : ''}{formatMoney(getDayNetProfit(todayStats))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Desktop Layout */}
        <div className="hidden flex-col gap-4 sm:flex">
          <div className="order-3">
            <StatisticsCharts
              daily={visibleDaily.map(day => ({
                ...day,
                adSpend: hideAdSpend ? 0 : cityScoped ? day.adSpend : Number(localAdSpend[day.date]) || day.adSpend,
              }))}
              showAdSpend={!hideAdSpend}
            />
          </div>
        <div className="contents">
          {/* Daily Table */}
          <div className="order-4 min-w-0">
            <div className="flex h-full flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="shrink-0 border-b border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowDailyStats(value => !value)}
                  className="flex w-full items-center gap-2 px-4 py-4 text-left font-semibold text-gray-900 hover:bg-gray-50 lg:px-6"
                  aria-expanded={showDailyStats}
                >
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Ежедневная статистика
                  <span className="text-sm font-normal text-gray-400">{daily.length} дней</span>
                  <svg className={`ml-auto h-4 w-4 text-gray-400 transition-transform ${showDailyStats ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showDailyStats && (hideAdSpend || cityScoped) && (
                  <p className="border-t border-gray-100 px-4 py-2 text-xs text-amber-800 bg-amber-50 lg:px-6">
                    {hideAdSpend
                      ? 'При фильтре по источнику сумма РК в таблице не редактируется и не входит в сводку — учитываются заказы выбранного источника.'
                      : 'При фильтре по городу РК показана только по городу (доля из общих расходов дня); редактирование — без фильтра «все города».'}
                  </p>
                )}
                {showDailyStats && <div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-100 px-4 py-3 lg:px-6">
                  {syncMessage && (
                    <span className={`text-sm px-2 py-1 rounded ${syncMessage.startsWith('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {syncMessage}
                    </span>
                  )}
                  {!import.meta.env.VITE_DEMO_MODE && yandexEnabled && (
                  <button
                    onClick={handleSyncYandex}
                    disabled={isSyncing}
                    className="px-3 py-1.5 text-sm font-medium text-orange-700 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isSyncing ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Загрузка...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Яндекс.Директ
                      </>
                    )}
                  </button>
                  )}
                  {periodMode === 'month' && (
                    <button
                      onClick={() => setShowExpensesModal(true)}
                      className="px-3 py-1.5 text-sm font-medium text-rose-700 bg-rose-50 rounded-lg hover:bg-rose-100 transition-colors flex items-center gap-1.5"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Расходы
                      {monthlyExpensesTotal > 0 && (
                        <span className="text-xs opacity-80">({formatNumber(monthlyExpensesTotal)})</span>
                      )}
                    </button>
                  )}
                </div>}
              </div>

              {showDailyStats && <div className="max-h-[32rem] overflow-auto scrollbar-thin">
                <table className="w-full min-w-[820px]">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Дата</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Оформ. П</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Оформ. В</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase">
                        <span className="flex items-center justify-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full"></span>1°</span>
                      </th>
                      <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase">
                        <span className="flex items-center justify-center gap-1"><span className="w-2 h-2 bg-amber-500 rounded-full"></span>2°</span>
                      </th>
                      <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Σ 1°</th>
                      <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Σ 2°</th>
                      <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Всего</th>
                      <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Касса</th>
                      <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Мастер</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase">РК</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Стоимость обращения</th>
                      <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase">ЧП</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {visibleDaily.map((day, i) => {
                      const dayNetProfit = getDayNetProfit(day);
                      const isDirty = dirtyFieldsRef.current.has(day.date);
                      return (
                        <tr key={i} className={`${isToday(day.date) ? 'bg-blue-50/50' : ''} ${isWeekend(day.date) && !isToday(day.date) ? 'bg-gray-50/50' : ''} hover:bg-gray-50/50`}>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-medium ${isToday(day.date) ? 'text-blue-600' : 'text-gray-900'}`}>{formatDisplayDate(day.date)}</span>
                              {isToday(day.date) && <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700 rounded">Сегодня</span>}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-center"><CreatedCountButton day={day} type="primary" /></td>
                          <td className="px-3 py-2.5 text-center"><CreatedCountButton day={day} type="secondary" /></td>
                          <td className="px-3 py-2.5 text-center">
                            {day.primaryCount > 0 ? <span className="inline-flex items-center justify-center w-6 h-6 bg-green-100 text-green-700 rounded-lg text-sm font-medium">{day.primaryCount}</span> : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {day.secondaryCount > 0 ? <span className="inline-flex items-center justify-center w-6 h-6 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium">{day.secondaryCount}</span> : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-3 py-2.5 text-right">{day.primarySum > 0 ? <span className="text-sm text-gray-900">{formatNumber(day.primarySum)}</span> : <span className="text-gray-300">—</span>}</td>
                          <td className="px-3 py-2.5 text-right">{day.secondarySum > 0 ? <span className="text-sm text-gray-900">{formatNumber(day.secondarySum)}</span> : <span className="text-gray-300">—</span>}</td>
                          <td className="px-3 py-2.5 text-right">{day.totalSum > 0 ? <span className="text-sm font-bold text-gray-900">{formatNumber(day.totalSum)}</span> : <span className="text-gray-300">—</span>}</td>
                          <td className="px-3 py-2.5 text-right">{day.cashDesk > 0 ? <span className="text-sm font-medium text-green-600">{formatNumber(day.cashDesk)}</span> : <span className="text-gray-300">—</span>}</td>
                          <td className="px-3 py-2.5 text-right">{day.masterIncome > 0 ? <span className="text-sm font-medium text-purple-600">{formatNumber(day.masterIncome)}</span> : <span className="text-gray-300">—</span>}</td>
                          <td className="px-3 py-2.5">
                            {sourceScoped ? (
                              <span className="text-gray-300">—</span>
                            ) : cityScoped ? (
                              day.adSpend > 0
                                ? <span className="block w-24 text-right text-sm font-medium text-red-600">{formatNumber(day.adSpend)}</span>
                                : <span className="text-gray-300">—</span>
                            ) : (
                            <input type="text" inputMode="numeric" pattern="[0-9]*"
                              className={`w-24 px-2 py-1.5 text-right text-sm rounded-lg border transition-all focus:outline-none focus:ring-2 ${isDirty ? 'border-orange-300 bg-orange-50 focus:ring-orange-500/20' : 'border-gray-200 bg-white focus:ring-blue-500/20'}`}
                              value={localAdSpend[day.date] ?? ''} onChange={(e) => handleAdSpendChange(day.date, e.target.value)} onBlur={() => handleAdSpendBlur(day.date)} placeholder="0" />
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {(() => {
                              const spend = cityScoped ? (day.adSpend || 0) : (Number(localAdSpend[day.date]) || 0);
                              return (day.createdPrimaryCount ?? 0) > 0 && spend > 0
                                ? <span className="text-sm font-medium text-red-600">{formatNumber(Math.round(spend / (day.createdPrimaryCount ?? 0)))}</span>
                                : <span className="text-gray-300">—</span>;
                            })()}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <span className={`text-sm font-bold px-2 py-1 rounded-lg ${dayNetProfit > 0 ? 'text-green-700 bg-green-50' : dayNetProfit < 0 ? 'text-red-700 bg-red-50' : 'text-gray-400'}`}>
                              {dayNetProfit !== 0 ? `${dayNetProfit > 0 ? '+' : ''}${formatNumber(dayNetProfit)}` : '—'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2 border-gray-200 sticky bottom-0 z-10 shadow-[0_-1px_3px_rgba(0,0,0,0.1)]">
                    <tr className="bg-gray-50">
                      <td className="px-3 py-3 font-semibold text-gray-700">ИТОГО</td>
                      <td className="px-3 py-3 text-center"><CreatedTotalButton type="primary" /></td>
                      <td className="px-3 py-3 text-center"><CreatedTotalButton type="secondary" /></td>
                      <td className="px-3 py-3 text-center font-bold text-green-600">{totals.primaryCount}</td>
                      <td className="px-3 py-3 text-center font-bold text-amber-600">{totals.secondaryCount}</td>
                      <td className="px-3 py-3 text-right font-medium">{formatNumber(totals.primarySum)}</td>
                      <td className="px-3 py-3 text-right font-medium">{formatNumber(totals.secondarySum)}</td>
                      <td className="px-3 py-3 text-right font-bold">{formatNumber(totals.totalSum)}</td>
                      <td className="px-3 py-3 text-right font-bold text-green-600">{formatNumber(totals.cashDesk)}</td>
                      <td className="px-3 py-3 text-right font-medium text-purple-600">{formatNumber(totals.masterIncome)}</td>
                      <td className="px-3 py-3 text-center font-medium text-red-600">{formatNumber(totals.adSpend)}</td>
                      <td className="px-3 py-3 text-center font-medium text-red-600">
                        {totals.createdPrimaryCount > 0 && totals.adSpend > 0
                          ? formatNumber(Math.round(totals.adSpend / totals.createdPrimaryCount))
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className={`font-bold px-2 py-0.5 rounded ${totals.netProfit > 0 ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'}`}>
                          {totals.netProfit >= 0 ? '+' : ''}{formatNumber(totals.netProfit)}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>}
            </div>
          </div>

          {/* Сводные карточки */}
          <div className="order-1 grid gap-5 md:grid-cols-2 xl:gap-6">
            {/* Юнит-экономика ШТ */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="border-b border-gray-100 px-4 py-2.5 text-gray-900"><h3 className="font-semibold">Заказы</h3></div>
              <div className="p-4">
                <div className="mb-2 flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                  <div className="text-xs text-gray-500">Всего лидов</div>
                  <div className="text-xl font-bold text-gray-900">{totals.totalLeads}</div>
                </div>
                <div className="mb-2 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-green-50 p-2 text-center">
                    <div className="text-xl font-bold text-green-600">{totals.primaryCount}<span className="text-sm font-normal text-green-500 ml-1">({totals.totalLeads > 0 ? Math.round((totals.primaryCount / totals.totalLeads) * 100) : 0}%)</span></div>
                    <div className="text-xs text-gray-500 mt-1">Первичные</div>
                  </div>
                  <div className="rounded-xl bg-amber-50 p-2 text-center">
                    <div className="text-xl font-bold text-amber-600">{totals.secondaryCount}<span className="text-sm font-normal text-amber-500 ml-1">({totals.totalLeads > 0 ? Math.round((totals.secondaryCount / totals.totalLeads) * 100) : 0}%)</span></div>
                    <div className="text-xs text-gray-500 mt-1">Вторичные</div>
                  </div>
                </div>
                {(totals.cancelledOnSiteCount > 0 || totals.cancelledNotCompletedCount > 0) && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-red-50 p-2 text-center">
                      <div className="text-xl font-bold text-red-600">{totals.cancelledOnSiteCount}<span className="text-sm font-normal text-red-400 ml-1">({totals.totalLeads > 0 ? Math.round((totals.cancelledOnSiteCount / totals.totalLeads) * 100) : 0}%)</span></div>
                      <div className="text-xs text-gray-500 mt-1">Отм. на месте</div>
                    </div>
                    <div className="rounded-xl bg-orange-50 p-2 text-center">
                      <div className="text-xl font-bold text-orange-600">{totals.cancelledNotCompletedCount}<span className="text-sm font-normal text-orange-400 ml-1">({totals.totalLeads > 0 ? Math.round((totals.cancelledNotCompletedCount / totals.totalLeads) * 100) : 0}%)</span></div>
                      <div className="text-xs text-gray-500 mt-1">Не оформились</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Юнит-экономика ₽ */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="border-b border-gray-100 px-4 py-2.5 text-gray-900"><h3 className="font-semibold">Деньги</h3></div>
              <div className="space-y-3 p-4">
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-gray-50 p-2 text-center"><div className="font-bold text-gray-900">{formatNumber(totals.totalSum)}</div><div className="text-xs text-gray-500">Всего</div></div>
                  <div className="rounded-xl bg-green-50 p-2 text-center"><div className="font-bold text-green-600">{formatNumber(totals.primarySum)}</div><div className="text-xs text-gray-500">Первичные</div></div>
                  <div className="rounded-xl bg-amber-50 p-2 text-center"><div className="font-bold text-amber-600">{formatNumber(totals.secondarySum)}</div><div className="text-xs text-gray-500">Вторичные</div></div>
                </div>
                <div className="h-px bg-gray-100"></div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col items-center py-1"><span className="text-xs text-gray-600">Сдано в кассу</span><span className="text-sm font-semibold text-green-600">{formatMoney(totals.cashDesk)}</span></div>
                  <div className="flex flex-col items-center py-1"><span className="text-xs text-gray-600">Доход мастеров</span><span className="text-sm font-semibold text-purple-600">{formatMoney(totals.masterIncome)}</span></div>
                  <div className="flex flex-col items-center py-1"><span className="text-xs text-gray-600">Сумма РК</span><span className="text-sm font-semibold text-red-600">{hideAdSpend ? '—' : formatMoney(totals.adSpend)}</span></div>
                </div>
                {!scoped && totals.monthlyExpensesTotal > 0 && (
                  <div className="space-y-1 border-t border-gray-100 py-2 px-1">
                    {periodMode === 'custom' && (
                      <p className="text-xs text-gray-500">Операционные расходы — сумма по календарным месяцам, попавшим в выбранный период.</p>
                    )}
                    <div className="flex items-center justify-between">
                      {periodMode === 'month' ? (
                        <button
                          type="button"
                          onClick={() => setShowExpensesModal(true)}
                          className="text-sm text-gray-600 hover:text-rose-600"
                        >
                          Расходы месяца
                        </button>
                      ) : (
                        <span className="text-sm text-gray-600">Операционные расходы</span>
                      )}
                      <span className="font-semibold text-rose-600">{formatMoney(totals.monthlyExpensesTotal)}</span>
                    </div>
                  </div>
                )}
                <div className={`-mx-4 -mb-4 px-4 py-3 ${totals.netProfit >= 0 ? 'bg-emerald-700' : 'bg-red-700'}`}>
                  <div className="flex items-center justify-between text-white">
                    <span className="font-medium">Маржинальность (ЧП)</span>
                    <span className="text-xl font-bold">{formatMoney(totals.netProfit)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Аналитика */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="border-b border-gray-100 px-4 py-2.5 text-gray-900"><h3 className="font-semibold">Эффективность</h3></div>
              <div className="space-y-3 p-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-gray-50 p-2"><div className="font-bold text-gray-900">{formatPercent(totals.marginPercent)}</div><div className="text-xs text-gray-500">Маржинальность %</div></div>
                  <div className="rounded-xl bg-gray-50 p-2"><div className="font-bold text-gray-900">{formatPercent(totals.profitabilityPercent)}</div><div className="text-xs text-gray-500">Рентабельность %</div></div>
                </div>
                <div className="h-px bg-gray-100"></div>
                <div>
                  <div className="flex justify-between py-1"><span className="text-xs text-gray-600">Стоимость первичного лида (CPL)</span><span className="text-sm font-semibold text-gray-900">{hideAdSpend ? '—' : formatMoney(totals.costPerLead)}</span></div>
                  <div className="flex justify-between py-1"><span className="text-xs text-gray-600">Ср. стоимость успешного заказа</span><span className="text-sm font-semibold text-gray-900">{hideAdSpend ? '—' : formatMoney(totals.costPerSuccessfulOrder)}</span></div>
                  <div className="flex justify-between py-1"><span className="text-xs text-gray-600">ДРР %</span><span className="text-sm font-semibold text-gray-900">{hideAdSpend ? '—' : formatPercent(totals.drrPercent)}</span></div>
                  <div className="flex justify-between py-1"><span className="text-xs text-gray-600">Ср. чек первички</span><span className="text-sm font-semibold text-green-600">{formatMoney(totals.avgCheckPrimary)}</span></div>
                  <div className="flex justify-between py-1"><span className="text-xs text-gray-600">Ср. чек повтора</span><span className="text-sm font-semibold text-amber-600">{formatMoney(totals.avgCheckSecondary)}</span></div>
                  <div className="-mx-4 flex justify-between rounded-lg bg-gray-50 px-4 py-1.5"><span className="text-xs font-medium text-gray-700">Ср. чек общий</span><span className="text-sm font-bold text-gray-900">{formatMoney(totals.avgCheckTotal)}</span></div>
                </div>
              </div>
            </div>

            {/* План/Факт */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between bg-gradient-to-r from-gray-700 to-gray-900 px-4 py-2.5 text-white">
                <h3 className="font-semibold">План / Факт</h3>
                {periodMode === 'month' && (
                  <button onClick={() => setShowPlanModal(true)} className="px-2 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-medium transition-colors">✏️ Изменить план</button>
                )}
              </div>
              <div className="p-4">
                {periodMode === 'custom' && (
                  <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">⚠️ План доступен только для режима "Месяц"</div>
                )}
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500"><th className="py-1 text-left">Показатель</th><th className="py-1 text-right">План</th><th className="py-1 text-right">Факт</th><th className="py-1 text-right">%</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {planFactRows.map((row, i) => {
                      const percent = getPercent(row.fact, row.plan);
                      return (
                        <tr key={i} className={row.isBold ? 'font-semibold' : ''}>
                          <td className="py-1 text-gray-700">{row.label}</td>
                          <td className="py-1 text-right text-gray-400">{row.isCount ? row.plan : formatNumber(row.plan)}</td>
                          <td className="py-1 text-right text-gray-900">{row.isCount ? row.fact : formatNumber(row.fact)}</td>
                          <td className="py-1 text-right">
                            <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${percent >= 100 ? 'bg-green-100 text-green-700' : percent >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{percent}%</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="order-2">
          <StatisticsInsights
            current={currentSnapshot}
            previous={previousSnapshot}
            comparisonTitle={periodMode === 'month' ? 'Сравнение с прошлым месяцем' : 'Сравнение с прошлым периодом'}
          />
        </div>

        <div className="order-5 grid items-start gap-4 lg:grid-cols-3 lg:gap-6">
          <div className="min-w-0">
            {renderSourceAnalytics()}
          </div>
          <PestStatsCard stats={pestStats} />
          <ManagerStatsCard stats={managerStats} />
        </div>
        </div>

        {/* Mobile Layout */}
        <div className="sm:hidden">
          {mobileTab === 'table' ? (
            <MobileDailyStats
              daily={visibleDaily}
              scoped={scoped}
              cityScoped={cityScoped}
              localAdSpend={localAdSpend}
              dirtyDates={dirtyFieldsRef.current}
              totals={{
                createdPrimaryCount: totals.createdPrimaryCount,
                createdSecondaryCount: totals.createdSecondaryCount,
                totalCount: totals.totalCount,
                cashDesk: totals.cashDesk,
                adSpend: totals.adSpend,
                netProfit: totals.netProfit,
              }}
              onAdSpendChange={handleAdSpendChange}
              onAdSpendBlur={handleAdSpendBlur}
              onOpenCreated={openCreatedPestDetails}
            />
          ) : (
            <div className="space-y-4">
              <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="text-xs font-medium uppercase tracking-[0.12em] text-gray-500">Чистая прибыль</div>
                <div className={`mt-2 text-3xl font-bold tracking-tight tabular-nums ${totals.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatMoney(totals.netProfit)}</div>
                <div className="mt-5 grid grid-cols-3 gap-3 border-t border-gray-100 pt-4 text-gray-900">
                  <div>
                    <div className="text-[0.6875rem] text-gray-400">Касса</div>
                    <div className="mt-1 truncate text-sm font-semibold tabular-nums">{formatNumber(totals.cashDesk)}</div>
                  </div>
                  <div>
                    <div className="text-[0.6875rem] text-gray-400">Заказы</div>
                    <div className="mt-1 text-sm font-semibold tabular-nums">{totals.totalCount}</div>
                  </div>
                  <div>
                    <div className="text-[0.6875rem] text-gray-400">Реклама</div>
                    <div className="mt-1 truncate text-sm font-semibold tabular-nums">{hideAdSpend ? '—' : formatNumber(totals.adSpend)}</div>
                  </div>
                </div>
              </section>

              <StatisticsCharts
                daily={visibleDaily.map(day => ({
                  ...day,
                  adSpend: hideAdSpend ? 0 : cityScoped ? day.adSpend : Number(localAdSpend[day.date]) || day.adSpend,
                }))}
                showAdSpend={!hideAdSpend}
              />

              {/* Количества */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="border-b border-gray-100 px-4 py-3 font-semibold text-gray-900">Заказы</div>
                <div className="p-3 space-y-2">
                  <div className="text-center p-2 bg-gray-50 rounded-lg"><div className="text-xl font-bold">{totals.totalLeads}</div><div className="text-xs text-gray-500">Всего лидов</div></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-center p-2 bg-green-50 rounded-lg"><div className="text-xl font-bold text-green-600">{totals.primaryCount}<span className="text-sm font-normal text-green-500 ml-1">({totals.totalLeads > 0 ? Math.round((totals.primaryCount / totals.totalLeads) * 100) : 0}%)</span></div><div className="text-xs text-gray-500">Первичные</div></div>
                    <div className="text-center p-2 bg-amber-50 rounded-lg"><div className="text-xl font-bold text-amber-600">{totals.secondaryCount}<span className="text-sm font-normal text-amber-500 ml-1">({totals.totalLeads > 0 ? Math.round((totals.secondaryCount / totals.totalLeads) * 100) : 0}%)</span></div><div className="text-xs text-gray-500">Повторные</div></div>
                  </div>
                  {(totals.cancelledOnSiteCount > 0 || totals.cancelledNotCompletedCount > 0) && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-center p-2 bg-red-50 rounded-lg"><div className="text-xl font-bold text-red-600">{totals.cancelledOnSiteCount}<span className="text-sm font-normal text-red-400 ml-1">({totals.totalLeads > 0 ? Math.round((totals.cancelledOnSiteCount / totals.totalLeads) * 100) : 0}%)</span></div><div className="text-xs text-gray-500">Отм. на месте</div></div>
                      <div className="text-center p-2 bg-orange-50 rounded-lg"><div className="text-xl font-bold text-orange-600">{totals.cancelledNotCompletedCount}<span className="text-sm font-normal text-orange-400 ml-1">({totals.totalLeads > 0 ? Math.round((totals.cancelledNotCompletedCount / totals.totalLeads) * 100) : 0}%)</span></div><div className="text-xs text-gray-500">Не оформились</div></div>
                    </div>
                  )}
                </div>
              </div>

              {/* Суммы */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="border-b border-gray-100 px-4 py-3 font-semibold text-gray-900">Деньги</div>
                <div className="p-3 space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center p-2 bg-gray-50 rounded-lg"><div className="text-sm font-bold">{formatNumber(totals.totalSum)}</div><div className="text-xs text-gray-500">Всего</div></div>
                    <div className="text-center p-2 bg-green-50 rounded-lg"><div className="text-sm font-bold text-green-600">{formatNumber(totals.primarySum)}</div><div className="text-xs text-gray-500">Первичные</div></div>
                    <div className="text-center p-2 bg-amber-50 rounded-lg"><div className="text-sm font-bold text-amber-600">{formatNumber(totals.secondarySum)}</div><div className="text-xs text-gray-500">Вторичные</div></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg"><span className="text-xs text-gray-600">Касса</span><span className="font-bold text-green-600 text-sm">{formatNumber(totals.cashDesk)}</span></div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg"><span className="text-xs text-gray-600">Реклама</span><span className="font-bold text-red-600 text-sm">{hideAdSpend ? '—' : formatNumber(totals.adSpend)}</span></div>
                    {!scoped && totals.monthlyExpensesTotal > 0 && (
                      periodMode === 'month' ? (
                        <button
                          type="button"
                          onClick={() => setShowExpensesModal(true)}
                          className="col-span-2 flex justify-between items-center p-2 bg-rose-50 rounded-lg text-left"
                        >
                          <span className="text-xs text-gray-600">Расходы месяца</span>
                          <span className="font-bold text-rose-600 text-sm">{formatNumber(totals.monthlyExpensesTotal)}</span>
                        </button>
                      ) : (
                        <div className="col-span-2 flex justify-between items-center p-2 bg-rose-50 rounded-lg">
                          <span className="text-xs text-gray-600">Операционные расходы</span>
                          <span className="font-bold text-rose-600 text-sm">{formatNumber(totals.monthlyExpensesTotal)}</span>
                        </div>
                      )
                    )}
                  </div>
                </div>
                <div className={`px-4 py-3 ${totals.netProfit >= 0 ? 'bg-emerald-700' : 'bg-red-700'}`}>
                  <div className="flex justify-between items-center text-white"><span className="font-medium">ЧП</span><span className="text-xl font-bold">{formatMoney(totals.netProfit)}</span></div>
                </div>
              </div>

              {/* Аналитика */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="border-b border-gray-100 px-4 py-3 font-semibold text-gray-900">Эффективность</div>
                <div className="p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 bg-gray-50 rounded-lg"><div className="text-lg font-bold">{formatPercent(totals.marginPercent)}</div><div className="text-xs text-gray-500">Маржинальность</div></div>
                    <div className="p-2 bg-gray-50 rounded-lg"><div className="text-lg font-bold">{formatPercent(totals.profitabilityPercent)}</div><div className="text-xs text-gray-500">Рентабельность</div></div>
                  </div>
                  <div className="space-y-1 pt-2">
                    <div className="flex justify-between py-1.5"><span className="text-sm text-gray-600">CPL</span><span className="font-semibold">{hideAdSpend ? '—' : formatMoney(totals.costPerLead)}</span></div>
                    <div className="flex justify-between py-1.5"><span className="text-sm text-gray-600">Ср. стоимость успешного</span><span className="font-semibold">{hideAdSpend ? '—' : formatMoney(totals.costPerSuccessfulOrder)}</span></div>
                    <div className="flex justify-between py-1.5"><span className="text-sm text-gray-600">ДРР %</span><span className="font-semibold">{hideAdSpend ? '—' : formatPercent(totals.drrPercent)}</span></div>
                    <div className="flex justify-between py-1.5"><span className="text-sm text-gray-600">Ср. чек 1°</span><span className="font-semibold text-green-600">{formatMoney(totals.avgCheckPrimary)}</span></div>
                    <div className="flex justify-between py-1.5"><span className="text-sm text-gray-600">Ср. чек 2°</span><span className="font-semibold text-amber-600">{formatMoney(totals.avgCheckSecondary)}</span></div>
                    <div className="flex justify-between py-2 bg-gray-50 -mx-3 px-3 rounded-lg"><span className="text-sm font-medium">Ср. чек общий</span><span className="font-bold">{formatMoney(totals.avgCheckTotal)}</span></div>
                  </div>
                </div>
              </div>

              {/* План/Факт Mobile */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 py-2 bg-gray-800 text-white font-medium text-sm flex items-center justify-between">
                  <span>План / Факт</span>
                  {periodMode === 'month' && <button onClick={() => setShowPlanModal(true)} className="px-2 py-1 bg-white/20 rounded text-xs">✏️ Изменить</button>}
                </div>
                <div className="p-3">
                  {periodMode === 'custom' && <div className="mb-2 px-2 py-1.5 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">⚠️ План только для месяца</div>}
                  <div className="divide-y divide-gray-100">
                    {planFactRows.map((row, i) => {
                      const percent = getPercent(row.fact, row.plan);
                      return (
                        <div key={i} className={`py-3 ${row.isBold ? 'font-semibold' : ''}`}>
                          <div className="flex items-center justify-between gap-3">
                            <span className="min-w-0 text-sm text-gray-700">{row.label}</span>
                            <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-xs font-semibold ${percent >= 100 ? 'bg-green-100 text-green-700' : percent >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{percent}%</span>
                          </div>
                          <div className="mt-1 flex items-center justify-between text-xs tabular-nums">
                            <span className="text-gray-400">План {row.isCount ? row.plan : formatNumber(row.plan)}</span>
                            <span className="font-medium text-gray-900">Факт {row.isCount ? row.fact : formatNumber(row.fact)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {renderSourceAnalytics()}
              <PestStatsCard stats={pestStats} />
              <ManagerStatsCard stats={managerStats} />
            </div>
          )}
        </div>
      </main>

      <Modal
        isOpen={!!selectedCreatedDetails}
        onClose={() => setSelectedCreatedDetails(null)}
        title={selectedCreatedDetails?.title || 'Оформлено'}
        size="md"
      >
        {selectedCreatedDetails && (() => {
          const details = aggregateCreatedPestStats(selectedCreatedDetails.days, selectedCreatedDetails.type);
          const total = details.reduce((sum, pest) => sum + pest.count, 0);
          const primary = selectedCreatedDetails.type === 'primary' ? total : 0;
          const secondary = selectedCreatedDetails.type === 'secondary' ? total : 0;

          return (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-gray-50 p-3 text-center">
                  <div className="text-xl font-bold text-gray-900">{total}</div>
                  <div className="mt-1 text-xs text-gray-500">Всего</div>
                </div>
                <div className="rounded-xl bg-green-50 p-3 text-center">
                  <div className="text-xl font-bold text-green-700">{primary}</div>
                  <div className="mt-1 text-xs text-gray-500">Первичные</div>
                </div>
                <div className="rounded-xl bg-amber-50 p-3 text-center">
                  <div className="text-xl font-bold text-amber-700">{secondary}</div>
                  <div className="mt-1 text-xs text-gray-500">Повторные</div>
                </div>
              </div>

              {details.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-gray-100">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500">
                      <tr>
                        <th className="px-3 py-2 text-left">{orderServiceLabel}</th>
                        <th className="px-3 py-2 text-center">П</th>
                        <th className="px-3 py-2 text-center">В</th>
                        <th className="px-3 py-2 text-center">Всего</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {details.map((pest, idx) => (
                        <tr key={`${pest.name}-${idx}`}>
                          <td className="px-3 py-2 font-medium text-gray-900">{pest.name}</td>
                          <td className="px-3 py-2 text-center text-green-700">{pest.primary}</td>
                          <td className="px-3 py-2 text-center text-amber-700">{pest.secondary}</td>
                          <td className="px-3 py-2 text-center font-semibold text-gray-900">{pest.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
                  Нет детализации по {orderServicesLabel} для этого дня.
                </div>
              )}

              <p className="text-xs text-gray-500">
                Детализация считается по дате создания лида, как колонки Оформ. П и Оформ. В.
              </p>
            </div>
          );
        })()}
      </Modal>

      {/* Модалка расходов месяца */}
      <Modal
        isOpen={showExpensesModal}
        onClose={() => {
          setShowExpensesModal(false);
          setExpenseShowValidation(false);
        }}
        title={`Расходы — ${months[month - 1]} ${year}`}
        size="md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-[1fr_2fr_auto] gap-2 items-end">
            <Input
              label="Сумма (₽) *"
              type="text"
              inputMode="decimal"
              value={expenseAmount}
              onChange={(e) => setExpenseAmount(e.target.value)}
              placeholder="0"
              error={
                expenseShowValidation && (!Number.isFinite(parsedExpenseAmount) || parsedExpenseAmount <= 0)
                  ? REQUIRED_FIELD_ERROR
                  : undefined
              }
            />
            <Input
              label="Комментарий *"
              type="text"
              value={expenseComment}
              onChange={(e) => setExpenseComment(e.target.value)}
              placeholder="За что расход"
              error={expenseShowValidation && !expenseComment.trim() ? REQUIRED_FIELD_ERROR : undefined}
            />
            <Button
              variant="success"
              onClick={() => void handleAddExpense()}
              loading={isSavingExpense}
              className={submitButtonClass(canAddExpense)}
            >
              Добавить
            </Button>
          </div>

          {monthlyExpenses.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Расходов за этот месяц пока нет</p>
          ) : (
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 flex justify-between text-sm font-medium text-gray-600">
                <span>Комментарий</span>
                <span>Сумма</span>
              </div>
              <ul className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                {monthlyExpenses.map(expense => {
                  const isAdvertiser = expense.comment.trim().toLowerCase() === PRIVATE_ADVERTISER_SOURCE.toLowerCase();
                  return (
                  <li key={expense.id} className="px-4 py-3 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-gray-900">{expense.comment || 'Без комментария'}</div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-semibold text-rose-600">{formatNumber(expense.amount)} ₽</span>
                      {!isAdvertiser && (
                        <button
                          type="button"
                          onClick={() => void handleDeleteExpense(expense.id)}
                          className="text-gray-400 hover:text-red-600 text-sm"
                          title="Удалить"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </li>
                  );
                })}
              </ul>
              <div className="px-4 py-3 bg-gray-50 flex justify-between font-semibold text-gray-800 border-t border-gray-100">
                <span>Итого за месяц</span>
                <span className="text-rose-600">{formatNumber(monthlyExpensesTotal)} ₽</span>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Модалка редактирования плана */}
      <Modal
        isOpen={showPlanModal}
        onClose={() => { setShowPlanModal(false); setPlanShowValidation(false); }}
        title={`План на ${months[month - 1]} ${year}`}
        size="md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Первичные (шт)" type="number" inputMode="numeric" value={planForm.primaryCount || ''} onChange={(e) => setPlanForm({ ...planForm, primaryCount: Number(e.target.value) || 0 })} />
            <Input label="Повторные (шт)" type="number" inputMode="numeric" value={planForm.secondaryCount || ''} onChange={(e) => setPlanForm({ ...planForm, secondaryCount: Number(e.target.value) || 0 })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Первичные (₽)" type="number" inputMode="numeric" value={planForm.primarySum || ''} onChange={(e) => setPlanForm({ ...planForm, primarySum: Number(e.target.value) || 0 })} />
            <Input label="Повторные (₽)" type="number" inputMode="numeric" value={planForm.secondarySum || ''} onChange={(e) => setPlanForm({ ...planForm, secondarySum: Number(e.target.value) || 0 })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="В кассу (₽)" type="number" inputMode="numeric" value={planForm.cashDesk || ''} onChange={(e) => setPlanForm({ ...planForm, cashDesk: Number(e.target.value) || 0 })} />
            <Input label="Реклама (₽)" type="number" inputMode="numeric" value={planForm.adSpend || ''} onChange={(e) => setPlanForm({ ...planForm, adSpend: Number(e.target.value) || 0 })} />
          </div>
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="text-sm text-gray-500 mb-2">Рассчитывается автоматически:</div>
            <div className="flex justify-between text-sm"><span className="text-gray-600">Всего (₽):</span><span className="font-medium">{formatNumber(planForm.primarySum + planForm.secondarySum)} ₽</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-600">ЧП (₽):</span><span className={`font-medium ${planForm.cashDesk - planForm.adSpend >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatNumber(planForm.cashDesk - planForm.adSpend)} ₽</span></div>
          </div>
          {planShowValidation && !canSavePlan ? (
            <p className="text-sm text-red-600">Укажите хотя бы одно значение плана больше нуля.</p>
          ) : null}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="secondary" onClick={() => { setShowPlanModal(false); setPlanShowValidation(false); }}>Отмена</Button>
            <Button variant="success" onClick={handleSavePlan} loading={isSavingPlan} className={submitButtonClass(canSavePlan)}>Сохранить план</Button>
          </div>
        </div>
      </Modal>

      {/* Модалка деталей источника */}
      <Modal
        isOpen={showSourceModal}
        onClose={() => { setShowSourceModal(false); setSourceShowValidation(false); }}
        title={selectedSource ? formatSourceShort(selectedSource.sourceName) : 'Источник'}
        size="md"
      >
        {selectedSource && (() => {
          const currentSourceStats: SourceStats | null = (sourceStats ?? []).find((s: SourceStats) => s.name === selectedSource.sourceName) ?? null;
          const convClicks = Number(editClicks) || 0;
          const convRate = convClicks > 0 ? (selectedSource.leads / convClicks) * 100 : 0;
          return (
            <div className="space-y-5">
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="text-xs text-gray-500 mb-1">Полный источник</div>
                <SourceLabel source={selectedSource.sourceName} align="start" />
              </div>
              <div className="bg-gradient-to-r from-indigo-50 to-violet-50 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">🎯 Конверсия ({months[month - 1]} {year})</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center"><div className="text-xl font-bold text-green-600">{selectedSource.leads}</div><div className="text-xs text-gray-500 mt-0.5">Лиды</div></div>
                  <div className="text-center">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className={`w-full px-2 py-1 text-center text-xl font-bold text-blue-600 bg-white rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${
                        sourceShowValidation && !editClicks.trim() ? 'border-red-300' : 'border-gray-200 focus:border-indigo-500'
                      }`}
                      value={editClicks}
                      onChange={(e) => setEditClicks(e.target.value.replace(/[^\d]/g, ''))}
                      placeholder="0"
                    />
                    <div className="text-xs text-gray-500 mt-0.5">Клики</div>
                    {sourceShowValidation && !editClicks.trim() ? (
                      <p className="text-xs text-red-600 mt-1">{REQUIRED_FIELD_ERROR}</p>
                    ) : null}
                  </div>
                  <div className="text-center"><div className={`text-xl font-bold ${convRate > 0 ? 'text-indigo-600' : 'text-gray-400'}`}>{convRate > 0 ? `${convRate.toFixed(1)}%` : '—'}</div><div className="text-xs text-gray-500 mt-0.5">Конверсия</div></div>
                </div>
              </div>
              {currentSourceStats && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">📊 Заказы</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Первичные:</span><span className="font-medium text-green-600">{currentSourceStats.primary}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Повторные:</span><span className="font-medium text-amber-600">{currentSourceStats.secondary}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Отменены:</span><span className="font-medium text-red-600">{currentSourceStats.cancelled}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Сумма:</span><span className="font-medium">{formatMoney(currentSourceStats.sum)}</span></div>
                  </div>
                </div>
              )}
              <p className="text-xs text-gray-400">💡 Конверсия = (лиды / клики) × 100%. Сохранение обновит данные для всех источников.</p>
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <Button variant="secondary" onClick={() => setShowSourceModal(false)}>Закрыть</Button>
                <Button variant="success" onClick={handleSaveSourceDetail} loading={isSavingSource} className={submitButtonClass(canSaveSourceDetail)}>Сохранить</Button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}

export default function StatisticsPage() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <StatisticsContent />
    </ProtectedRoute>
  );
}
