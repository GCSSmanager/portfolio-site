
import React, { useCallback, useEffect, useState } from 'react';
import { api, RoistatLead } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import PhoneCallsModal from '@/components/Telephony/PhoneCallsModal';
import { formatPhoneRu } from '@/lib/phone';
import { isDemoMode } from '@/lib/isDemoMode';
import { DemoPhoneCallModal } from '@/components/demo/DemoPhoneCallModal';

interface Props {
  onCreateFromLead: (lead: RoistatLead) => void;
  refreshKey?: number;
}

type LeadsListTab = 'pending' | 'dismissed';

const POLL_INTERVAL_MS = 60_000;

const formatLeadDate = (iso: string) => {
  const date = new Date(iso);
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yy = String(date.getFullYear()).slice(-2);
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${dd}.${mm}.${yy} ${hh}:${min}`;
};

export default function RoistatLeadsPanel({ onCreateFromLead, refreshKey = 0 }: Props) {
  const { hasRole } = useAuth();
  const canMarkSpam = hasRole('admin');
  const [tab, setTab] = useState<LeadsListTab>('pending');
  const [leads, setLeads] = useState<RoistatLead[]>([]);
  const [spamCount, setSpamCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [callsPhone, setCallsPhone] = useState<string | null>(null);
  const [demoCallPhone, setDemoCallPhone] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const listClass = `divide-y divide-gray-100 overflow-y-auto touch-scroll-chain ${
    expanded ? 'max-h-64 sm:max-h-72' : 'max-h-28 sm:max-h-32'
  }`;

  const loadSpamCount = useCallback(async () => {
    try {
      const spamLeads = await api.getRoistatLeads('dismissed');
      setSpamCount(spamLeads.length);
    } catch (error) {
      console.error('Failed to load spam count:', error);
    }
  }, []);

  const loadLeads = useCallback(async (activeTab: LeadsListTab, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const tabLeads = await api.getRoistatLeads(activeTab);
      setLeads(tabLeads);
      if (activeTab === 'dismissed') {
        setSpamCount(tabLeads.length);
      }
    } catch (error) {
      console.error('Failed to load leads:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'dismissed' && !canMarkSpam) {
      setTab('pending');
      return;
    }
    void loadLeads(tab);
    if (tab === 'pending' && canMarkSpam) void loadSpamCount();
  }, [loadLeads, loadSpamCount, tab, refreshKey, canMarkSpam]);

  useEffect(() => {
    const poll = () => {
      if (document.visibilityState !== 'visible') return;
      void loadLeads(tab, true);
      if (tab === 'pending' && canMarkSpam) void loadSpamCount();
    };

    const timer = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [loadLeads, loadSpamCount, tab, canMarkSpam]);

  const handleSpam = async (lead: RoistatLead) => {
    const phone = formatPhoneRu(lead.phone) || lead.phone;
    if (!confirm(`Точно спам?\n\n${phone} — заявка уйдёт во вкладку «Спам», её можно будет вернуть.`)) {
      return;
    }
    try {
      await api.dismissRoistatLead(lead.id);
      setLeads(current => current.filter(item => item.id !== lead.id));
      setSpamCount(count => count + 1);
    } catch (error) {
      console.error('Failed to mark lead as spam:', error);
    }
  };

  const handleRestore = async (leadId: string) => {
    try {
      await api.restoreRoistatLead(leadId);
      setLeads(current => current.filter(item => item.id !== leadId));
      setSpamCount(count => Math.max(0, count - 1));
    } catch (error) {
      console.error('Failed to restore lead:', error);
    }
  };

  const onPhoneClick = (phone: string) => {
    if (isDemoMode) setDemoCallPhone(phone);
    else setCallsPhone(phone);
  };

  const emptyMessage = tab === 'pending'
    ? 'Новых заявок нет'
    : 'В спаме заявок нет';

  return (
    <div className="mb-3 overflow-hidden rounded-xl border border-orange-100 bg-white shadow-sm sm:mb-4 sm:rounded-2xl">
      <div className="flex items-center justify-between gap-2 border-b border-orange-50 bg-orange-50/60 px-3 py-2 sm:px-4 sm:py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="text-base">📥</span>
          <h3 className="text-sm font-semibold text-gray-900">Заявки с сайта</h3>
        </div>
        <div className="flex items-center gap-2">
          {loading && <div className="w-4 h-4 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />}
          <span className="px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-bold">
            {tab === 'pending' ? leads.length : spamCount}
          </span>
        </div>
      </div>

      <div className="flex border-b border-gray-100">
        <button
          type="button"
          onClick={() => setTab('pending')}
          className={`flex-1 px-3 py-2 text-xs font-medium transition-colors sm:text-sm ${
            tab === 'pending'
              ? 'text-orange-700 border-b-2 border-orange-500 bg-orange-50/40'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          Новые
        </button>
        {canMarkSpam && (
          <button
            type="button"
            onClick={() => setTab('dismissed')}
            className={`flex-1 px-3 py-2 text-xs font-medium transition-colors sm:text-sm ${
              tab === 'dismissed'
                ? 'text-red-600 border-b-2 border-red-500 bg-red-50/40'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            Спам{spamCount > 0 ? ` (${spamCount})` : ''}
          </button>
        )}
      </div>

      {leads.length === 0 ? (
        <div className="px-3 py-4 text-center text-sm text-gray-400">{emptyMessage}</div>
      ) : (
        <div className={listClass}>
          {leads.map(lead => (
            <div key={lead.id} className="flex flex-col gap-2 px-3 py-2 hover:bg-gray-50 sm:flex-row sm:items-center sm:gap-3 sm:px-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  {lead.phone?.trim() ? (
                    <button
                      type="button"
                      onClick={() => onPhoneClick(lead.phone)}
                      className="inline-flex items-center gap-0.5 text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      <span aria-hidden>📞</span>
                      <span>{formatPhoneRu(lead.phone) || lead.phone}</span>
                    </button>
                  ) : (
                    <span className="text-sm font-semibold text-gray-400">—</span>
                  )}
                  <span className="text-xs text-gray-500">{formatLeadDate(lead.createdAt)}</span>
                </div>

                <div className="text-xs text-gray-700 sm:text-sm">
                  {lead.name && <span className="font-medium">{lead.name}</span>}
                  {lead.source && (
                    <span className="text-gray-500">
                      {lead.name ? ' · ' : ''}
                      {lead.source}
                    </span>
                  )}
                </div>
                {lead.comment && <p className="mt-0.5 line-clamp-1 text-xs text-gray-500">{lead.comment}</p>}
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onCreateFromLead(lead)}
                  className="rounded-lg bg-green-600 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-700 sm:text-sm"
                >
                  Создать
                </button>
                {tab === 'pending' && canMarkSpam && (
                  <button
                    type="button"
                    onClick={() => void handleSpam(lead)}
                    className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 sm:text-sm"
                  >
                    Спам
                  </button>
                )}
                {tab === 'dismissed' && canMarkSpam && (
                  <button
                    type="button"
                    onClick={() => void handleRestore(lead.id)}
                    className="rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200 sm:text-sm"
                  >
                    Вернуть
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {expanded !== undefined && (
        <div className="border-t border-gray-100 bg-gray-50/80 px-3 py-1.5">
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            className="text-xs font-medium text-gray-500 hover:text-gray-800"
          >
            {expanded ? 'Свернуть список' : 'Развернуть список'}
          </button>
        </div>
      )}

      <PhoneCallsModal isOpen={!!callsPhone} phone={callsPhone} onClose={() => setCallsPhone(null)} />
      <DemoPhoneCallModal open={!!demoCallPhone} phone={demoCallPhone || ''} onClose={() => setDemoCallPhone(null)} />
    </div>
  );
}
