export type UserRole = 'admin' | 'operator' | 'master';
export type CrmProjectId = 'pest-control' | 'drying-center';

export interface WorkHourInterval {
  start: string; // HH:MM
  end: string;   // HH:MM
}

export interface User {
  id: string;
  login: string;
  role: UserRole;
  crmProjects?: CrmProjectId[];
  canViewOwnOrderHistory?: boolean;
  name: string;
  email?: string | null;
  phone: string;
  region: string;
  notes: string;
  novofonEmployeeIds?: string;
  isActive: boolean;
  weekdaySalary?: number;
  weekendSalary?: number;
  /** Рабочие интервалы специалиста (для автодозвона) */
  workHours?: WorkHourInterval[];
  createdAt: string;
  updatedAt: string;
}

export interface UserInfo {
  id: string;
  login: string;
  role: UserRole;
  crmProjects?: CrmProjectId[];
  canViewOwnOrderHistory?: boolean;
  name: string;
}

export interface Order {
  id: string;
  crmProject?: CrmProjectId;
  orderNumber: string;
  orderType: 'primary' | 'secondary';
  clientName: string;
  pest: string;
  objectType: string;
  volume: string;
  address: string;
  cityCode?: string | null;
  date: string;
  time: string;
  basePrice: number;
  phones?: string[];
  phoneCount?: number;
  phoneLabels?: string[];
  clientType: 'individual' | 'legal';
  comment: string;
  manager: string;
  source?: string;
  externalCrmId?: number | null;
  status: 'in_progress' | 'completed' | 'cancelled' | 'spam';
  roistatVisitId?: string | null;
  roistatLeadId?: string | null;
  roistatSyncedAt?: string | null;
  roistatSyncStatus?: 'pending' | 'synced' | 'failed' | null;
  ymClientId?: string | null;
  yclid?: string | null;
  yandexCampaignId?: string | null;
  directNumberCall?: boolean;
  yandexBusinessCall?: boolean;
  finalAmount?: number;
  masterPercent?: number;
  masterIncome?: number;
  cashDesk?: number;
  repeatDate?: string;
  repeatTime?: string;
  repeatBasePrice?: number;
  masterName?: string;
  masterContact?: string;
  masterId?: string;
  completionComment?: string;
  contractPhoto?: string;
  workActPhoto?: string;
  cancelReason?: string;
  cancelType?: 'on_site' | 'not_completed';
  masterCheckStatus?: 'unchecked' | 'checked' | 'issue';
  createdAt: string;
}

export interface Task {
  id: string;
  taskNumber: number;
  deadline: string;
  notifyAt?: string | null;
  emailNotificationSentAt?: string | null;
  orderNumber: string;
  phone: string;
  comment: string;
  responsible: string;
  completed: boolean;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ManagerStat {
  name: string;
  primary: number;
  secondary: number;
  completedCount: number;
  completedSum: number;
}

export interface DailyCreatedPestStat {
  name: string;
  count: number;
  primary: number;
  secondary: number;
}

export interface CityStat {
  code: string;
  name: string;
  count: number;
  cashDesk?: number;
}

export interface SourceDayStat {
  name: string;
  city?: string;
  count?: number;
  createdPrimary: number;
  createdSecondary: number;
  completedPrimary: number;
  completedSecondary: number;
  primarySum?: number;
  secondarySum?: number;
  sum: number;
  cashDesk?: number;
  masterIncome?: number;
  cancelled: number;
}

export interface ChannelStat {
  name: string;
  count: number;
  sum: number;
  cashDesk?: number;
  masterIncome?: number;
  primary: number;
  secondary: number;
  cancelled: number;
}

export interface DailyStats {
  date: string;
  primaryCount: number;
  secondaryCount: number;
  primarySum: number;
  secondarySum: number;
  totalSum: number;
  cashDesk: number;
  masterIncome: number;
  adSpend: number;
  netProfit: number;
  createdPrimaryCount?: number;
  createdSecondaryCount?: number;
  createdPestStats?: DailyCreatedPestStat[];
  sourceDayStats?: SourceDayStat[];
  cityAdSpend?: Record<string, number>;
}

export interface MonthlyPlan {
  primaryCount: number;
  secondaryCount: number;
  primarySum: number;
  secondarySum: number;
  totalSum: number;
  cashDesk: number;
  adSpend: number;
  netProfit: number;
}

export interface MonthlyExpense {
  id: string;
  year: number;
  month: number;
  amount: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
}

export interface PayEntry {
  id: string;
  amount: number;
  createdAt: string;
}

export interface SourceStats {
  name: string;
  count: number;
  sum: number;
  cashDesk?: number;
  masterIncome?: number;
  primary: number;
  secondary: number;
  cancelled: number;
  cancelledOnSite: number;
  cancelledNotCompleted: number;
}

export interface PestStat {
  name: string;
  count: number;
  sum: number;
  primary: number;
  secondary: number;
  cancelled: number;
  completedCount: number;
}

export interface TaskEmailStatus {
  enabled: boolean;
  email: string | null;
  canReceiveReminders: boolean;
}

export interface FieldMaster {
  id: string;
  name: string;
  phone: string;
  notes: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  workDays?: { id: string; date: string }[];
}

export interface ConversionSourceStats {
  sourceName: string;
  sourceId: string | null;
  adCampaign: string | null;
  leads: number;
  clicks: number;
  conversion: number;
}

export interface ConversionData {
  sources: ConversionSourceStats[];
  totals: { leads: number; clicks: number; conversion: number };
}
