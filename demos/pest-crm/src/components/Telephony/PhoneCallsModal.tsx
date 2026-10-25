
import React, { useCallback, useEffect, useState } from 'react';
import { api, CallRecord } from '@/lib/api';
import Modal from '@/components/UI/Modal';
import Button from '@/components/UI/Button';
import ClickToCallPhone from '@/components/UI/ClickToCallPhone';
import { formatPhoneRu } from '@/lib/phone';
import { isDemoMode } from '@/lib/isDemoMode';
import DemoTelephonyRecordingBanner from '@/components/demo/DemoTelephonyRecordingBanner';
import { DemoCallRecordingModal } from '@/components/demo/DemoCallRecordingModal';

interface Props {
  phone: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const formatDuration = (seconds: number): string => {
  if (seconds <= 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const directionLabel: Record<string, string> = {
  incoming: 'Входящий',
  outgoing: 'Исходящий',
};

const statusLabel: Record<string, string> = {
  answered: 'Отвечен',
  missed: 'Пропущен',
  busy: 'Занято',
  failed: 'Не удался',
  cancelled: 'Отменён',
};

const statusColor: Record<string, string> = {
  answered: 'text-green-700 bg-green-50',
  missed: 'text-red-700 bg-red-50',
  busy: 'text-amber-700 bg-amber-50',
  failed: 'text-gray-700 bg-gray-100',
  cancelled: 'text-gray-600 bg-gray-100',
};

export default function PhoneCallsModal({ phone, isOpen, onClose }: Props) {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingDemoOpen, setRecordingDemoOpen] = useState(false);

  const loadCalls = useCallback(async () => {
    if (!phone) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getPhoneCalls(phone);
      setCalls(data);
    } catch (err) {
      setError((err as Error).message);
      setCalls([]);
    } finally {
      setLoading(false);
    }
  }, [phone]);

  useEffect(() => {
    if (!isOpen || !phone) {
      setCalls([]);
      setError(null);
      setPlayingId(null);
      setAudioUrl(null);
      return;
    }
    void loadCalls();
  }, [isOpen, phone, loadCalls]);

  const handlePlay = async (call: CallRecord) => {
    if (!call.hasRecording) return;
    if (isDemoMode) {
      setRecordingDemoOpen(true);
      return;
    }
    if (!phone) return;
    setPlayingId(call.id);
    setError(null);
    try {
      const { url } = await api.getPhoneCallRecording(call.id, phone);
      setAudioUrl(url);
    } catch (err) {
      setError((err as Error).message);
      setPlayingId(null);
    }
  };

  const display = formatPhoneRu(phone || '') || phone || '';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={display ? `Звонки · ${display}` : 'Звонки'} size="md">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-gray-500 min-w-0 truncate">{display}</p>
          {phone ? (
            <ClickToCallPhone phone={phone} buttonLabel="Позвонить" className="shrink-0" />
          ) : null}
        </div>

        <DemoTelephonyRecordingBanner />

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {!isDemoMode && audioUrl && (
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Прослушивание</span>
              <button
                type="button"
                onClick={() => { setAudioUrl(null); setPlayingId(null); }}
                className="text-xs text-gray-500"
              >
                Закрыть
              </button>
            </div>
            <audio controls autoPlay src={audioUrl} className="w-full" />
          </div>
        )}

        {loading && calls.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">Загрузка звонков...</div>
        ) : calls.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <p className="text-sm">Звонков по этому номеру пока нет</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {calls.map((call) => (
              <div key={call.id} className="bg-gray-50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {call.startedAt
                        ? new Date(call.startedAt).toLocaleString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                        : '—'}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600">
                      {directionLabel[call.direction] || call.direction}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[call.status] || 'bg-gray-100 text-gray-600'}`}>
                      {statusLabel[call.status] || call.status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {formatDuration(call.durationSec)}
                    {call.employeeInternal ? ` · внутр. ${call.employeeInternal}` : ''}
                  </div>
                </div>
                {call.hasRecording && (
                  <Button
                    variant="secondary"
                    onClick={() => void handlePlay(call)}
                    disabled={playingId === call.id && !audioUrl}
                    className="shrink-0 w-full sm:w-auto"
                  >
                    {isDemoMode
                      ? '▶ Запись (демо)'
                      : playingId === call.id
                        ? 'Загрузка...'
                        : '▶ Слушать'}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <DemoCallRecordingModal open={recordingDemoOpen} onClose={() => setRecordingDemoOpen(false)} />
    </Modal>
  );
}
