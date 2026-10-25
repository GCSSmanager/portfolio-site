const SESSION_KEY = 'external-crm-session';

export type LeadDistributionStatus = 'assigned' | 'unassigned' | 'rejected';
export type LeadVisitKind = 'first' | 'repeat';

export interface ExternalCrmSession {
  token: string;
  createdAt: string;
  login?: string;
}

export interface MasterCallRecord {
  id: number;
  time: string;
  durationSec: number | null;
  recordUrl: string;
  gateway: string;
  callCause: string;
  fromPhone: string;
  toPhone: string;
  masterName: string;
}

export interface ExternalLead {
  id: number;
  name: string;
  phone: string;
  address: string;
  date: string;
  pest: string;
  volume: string;
  cost: number | string;
  comment: string;
  distributionStatus: LeadDistributionStatus;
  assigneeName: string;
  callRecords: MasterCallRecord[];
  visitKind?: LeadVisitKind;
  previousId?: number | null;
}

export function getExternalSession(): ExternalCrmSession | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ExternalCrmSession;
    return parsed?.token ? parsed : null;
  } catch {
    return null;
  }
}

export function saveExternalSession(session: ExternalCrmSession): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearExternalSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SESSION_KEY);
}

export const LEAD_DISTRIBUTION_STATUSES: LeadDistributionStatus[] = [
  'unassigned',
  'assigned',
  'rejected',
];

export function getVisitKindLabel(kind?: LeadVisitKind, previousId?: number | null): string {
  if (kind === 'repeat') return previousId ? `Повтор №${previousId}` : 'Повтор';
  if (kind === 'first') return 'Первичка';
  return '';
}

export function leadCallsWithContent(calls: MasterCallRecord[]): MasterCallRecord[] {
  return calls.filter((call) =>
    Boolean(call.recordUrl?.trim()) || (typeof call.durationSec === 'number' && call.durationSec > 0));
}

export function getDistributionLabel(status: LeadDistributionStatus): string {
  switch (status) {
    case 'assigned':
      return 'Распределён';
    case 'rejected':
      return 'Отклонён';
    default:
      return 'Нераспределён';
  }
}
