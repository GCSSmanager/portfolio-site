
import React, { useEffect, useRef, useState } from 'react';
import Modal from '@/components/UI/Modal';
import Button from '@/components/UI/Button';
import Input from '@/components/UI/Input';
import Select from '@/components/UI/Select';
import FileUpload from '@/components/UI/FileUpload';
import TaskModal from '@/components/Tasks/TaskModal';
import OrderTelephonyTab from '@/components/Orders/OrderTelephonyTab';
import OrderActivityTab from '@/components/Orders/OrderActivityTab';
import SourceLabel from '@/components/UI/SourceLabel';
import ClickToCallPhone from '@/components/UI/ClickToCallPhone';
import PhoneDuplicateHint from '@/components/Orders/PhoneDuplicateHint';
import { useOrderStore } from '@/store/orderStore';
import { useAuth } from '@/contexts/AuthContext';
import { Order, api, Source, fetchStoredUpload } from '@/lib/api';
import { formatSourceShort } from '@/lib/sourceLabel';
import { isProtectedSource } from '@/lib/protectedSources';
import { formatPhoneRu, normalizePhone, normalizePhoneList } from '@/lib/phone';
import PhoneRuField from '@/components/UI/PhoneRuField';
import { getOrderServiceLabel, getOrderServices } from '@/lib/orderFields';
import { SOURCES_UPDATED_EVENT } from '@/demo/events';
import { REQUIRED_FIELD_ERROR, submitButtonClass } from '@/lib/formSubmitStyle';
import { isPhoneRuComplete } from '@/lib/phone-ru';
import { isDemoMode } from '@/lib/isDemoMode';

interface Props {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const OBJECTS = ['Квартира', 'Дом', 'Офис', 'Склад', 'Ресторан', 'Магазин', 'Участок', 'Другое'];
const TIMES = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);

interface UserOption { id: string; name: string; phone?: string; }

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return dateStr; }
};

function StoredFileLink({ uploadId, label }: { uploadId: string; label: string }) {
  const [href, setHref] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let objectUrl: string | null = null;
    const controller = new AbortController();
    setLoading(true);
    fetchStoredUpload(uploadId, 'GET', controller.signal)
      .then(response => (response.ok ? response.blob() : Promise.reject(new Error('missing'))))
      .then(blob => {
        objectUrl = URL.createObjectURL(blob);
        setHref(objectUrl);
      })
      .catch(() => setHref(null))
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [uploadId]);

  return (
    <a
      href={href || undefined}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 text-sm font-medium ${href ? 'text-blue-600 hover:text-blue-700 hover:underline' : 'text-gray-400 pointer-events-none'}`}
    >
      {label}
      {loading ? '…' : href ? ' →' : ' (нет файла)'}
    </a>
  );
}

const formatDateTime = (dateStr: string): string => {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch { return dateStr; }
};

const yandexIdLabel = (item?: {
  yandexCampaignId?: string | null;
  yandexBusinessCall?: boolean;
  directNumberCall?: boolean;
} | null): string | null => {
  if (!item) return null;
  if (item.yandexCampaignId) return item.yandexCampaignId;
  if (item.yandexBusinessCall) return 'Яндекс Бизнес';
  if (item.directNumberCall) return 'Прямой номер';
  return null;
};

export default function OrderDetailsModal({ order, isOpen, onClose, onSuccess }: Props) {
  const { updateOrder, deleteOrder, isLoading } = useOrderStore();
  const { hasRole, user } = useAuth();
  const canEdit = hasRole('admin', 'operator');
  const canDelete = hasRole('admin');
  const canChangeManager = hasRole('admin');
  const orderServices = getOrderServices();
  const orderServiceLabel = getOrderServiceLabel();
  const previousOrderIdRef = useRef<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileExists, setFileExists] = useState<boolean | null>(null);
  const [actFileExists, setActFileExists] = useState<boolean | null>(null);
  const [showValidation, setShowValidation] = useState(false);

  const [operators, setOperators] = useState<UserOption[]>([]);
  const [masters, setMasters] = useState<UserOption[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  const [editForm, setEditForm] = useState({
    orderType: 'primary' as 'primary' | 'secondary',
    clientName: '', pest: '', objectType: '', volume: '', address: '',
    date: '', time: '', basePrice: 0, phones: [''],
    clientType: 'individual' as 'individual' | 'legal',
    comment: '', manager: '', source: '', masterId: '',
  });
  const pestSelectOptions = orderServices.includes(editForm.pest) || !editForm.pest
    ? orderServices
    : [editForm.pest, ...orderServices];

  const [status, setStatus] = useState<'in_progress' | 'completed' | 'cancelled' | 'spam'>('in_progress');
  const [masterCheckStatus, setMasterCheckStatus] = useState<'unchecked' | 'checked' | 'issue'>('unchecked');

  const [completedForm, setCompletedForm] = useState({
    finalAmount: 0, masterPercent: 40,
    repeatDate: '', repeatTime: '09:00', repeatBasePrice: 0,
    repeatMasterId: '',
    completionComment: '', contractPhoto: '', workActPhoto: '',
  });

  const [cancelReason, setCancelReason] = useState('');
  const [cancelType, setCancelType] = useState<'on_site' | 'not_completed'>('on_site');
  const [activeTab, setActiveTab] = useState<'details' | 'telephony' | 'activity'>('details');
  const [phoneMatches, setPhoneMatches] = useState<Order[]>([]);
  const [phoneCheckLoading, setPhoneCheckLoading] = useState(false);
  const [resolvedCampaignId, setResolvedCampaignId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setActiveTab('details');
      setShowValidation(false);
    }
  }, [isOpen]);

  useEffect(() => {
    setResolvedCampaignId(yandexIdLabel(order));
    if (!isOpen || !order?.id) return;
    let cancelled = false;
    api.getOrder(order.id)
      .then((fresh) => {
        if (!cancelled) setResolvedCampaignId(yandexIdLabel(fresh));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isOpen, order?.id, order?.yandexCampaignId, order?.yandexBusinessCall, order?.directNumberCall]);

  const reloadReferenceData = React.useCallback(async () => {
    if (!canEdit) return;
    setDataLoading(true);
    try {
      const [ops, ms, srcs] = await Promise.all([
        api.getOperators(), api.getMasters(), api.getSources(false),
      ]);
      setOperators(ops);
      setMasters(ms);
      setSources(srcs);
    } catch (err) {
      console.error(err);
    } finally {
      setDataLoading(false);
    }
  }, [canEdit]);

  useEffect(() => {
    if (isOpen && canEdit) {
      void reloadReferenceData();
    }
  }, [isOpen, canEdit, reloadReferenceData]);

  useEffect(() => {
    if (!isOpen) return;
    const onSourcesUpdated = () => {
      void reloadReferenceData();
    };
    window.addEventListener(SOURCES_UPDATED_EVENT, onSourcesUpdated);
    return () => window.removeEventListener(SOURCES_UPDATED_EVENT, onSourcesUpdated);
  }, [isOpen, reloadReferenceData]);

  useEffect(() => {
    if (order?.contractPhoto) {
      setFileExists(null);
      fetchStoredUpload(order.contractPhoto, 'HEAD')
        .then(r => setFileExists(r.ok)).catch(() => setFileExists(false));
    } else { setFileExists(null); }
  }, [order?.contractPhoto]);

  useEffect(() => {
    if (order?.workActPhoto) {
      setActFileExists(null);
      fetchStoredUpload(order.workActPhoto, 'HEAD')
        .then(r => setActFileExists(r.ok)).catch(() => setActFileExists(false));
    } else { setActFileExists(null); }
  }, [order?.workActPhoto]);

  useEffect(() => {
    if (!order) {
      previousOrderIdRef.current = null;
      return;
    }

    const orderChanged = previousOrderIdRef.current !== null && previousOrderIdRef.current !== order.id;
    previousOrderIdRef.current = order.id;

    if (orderChanged) {
      setIsEditing(false);
      setIsTaskModalOpen(false);
      setError(null);
    }
  }, [order?.id]);

  useEffect(() => {
    if (order && !isEditing) {
      setStatus(order.status);
      setMasterCheckStatus(order.masterCheckStatus || 'unchecked');
      setEditForm({
        orderType: order.orderType, clientName: order.clientName,
        pest: order.pest, objectType: order.objectType,
        volume: order.volume || '', address: order.address,
        date: order.date, time: order.time, basePrice: order.basePrice,
        phones: (order.phones?.length
          ? order.phones.map(p => (p ? formatPhoneRu(p) || p : ''))
          : ['']),
        clientType: order.clientType, comment: order.comment || '',
        manager: order.manager, source: order.source || '',
        masterId: order.masterId || '',
      });
      setCompletedForm({
        finalAmount: order.finalAmount ?? 0,
        masterPercent: order.masterPercent ?? 40,
        repeatDate: order.repeatDate || '',
        repeatTime: order.repeatTime || '09:00',
        repeatBasePrice: order.repeatBasePrice ?? 0,
        repeatMasterId: '',
        completionComment: order.completionComment || '',
        contractPhoto: order.contractPhoto || '',
        workActPhoto: order.workActPhoto || '',
      });
      setCancelReason(order.cancelReason || '');
      setCancelType(order.cancelType || 'on_site');
    }
  }, [order, isEditing]);

  useEffect(() => {
    if (!isOpen) {
      setIsEditing(false);
      setIsTaskModalOpen(false);
      setError(null);
      setPhoneMatches([]);
      setPhoneCheckLoading(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !isEditing || !order) {
      setPhoneMatches([]);
      setPhoneCheckLoading(false);
      return;
    }

    const norms = Array.from(new Set(
      editForm.phones.map((p) => normalizePhone(p)).filter((p) => p.length >= 11),
    ));

    if (!norms.length) {
      setPhoneMatches([]);
      setPhoneCheckLoading(false);
      return;
    }

    let cancelled = false;
    setPhoneCheckLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const lists = await Promise.all(
          norms.map((p) => api.findOrdersByPhone(p, order.id)),
        );
        if (cancelled) return;
        const byId = new Map<string, Order>();
        for (const list of lists) {
          for (const item of list) byId.set(item.id, item);
        }
        setPhoneMatches(Array.from(byId.values()).sort((a, b) => b.date.localeCompare(a.date)));
      } catch {
        if (!cancelled) setPhoneMatches([]);
      } finally {
        if (!cancelled) setPhoneCheckLoading(false);
      }
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isOpen, isEditing, order?.id, editForm.phones]);

  if (!order) return null;

  const isAssignedMaster = Boolean(user?.id && order.masterId === user.id && hasRole('master'));
  const canCompleteAsMaster = isAssignedMaster;
  const canManageCompletion = canEdit || canCompleteAsMaster;
  const showCompletionForm = canManageCompletion && activeTab === 'details' && status === 'completed' && !isEditing;

  const masterIncome = Math.round((completedForm.finalAmount * completedForm.masterPercent) / 100);
  const cashDesk = completedForm.finalAmount - masterIncome;
  const sourceLocked = isProtectedSource(order?.source || '');
  const hasValidFinalAmount = Number.isFinite(completedForm.finalAmount) && completedForm.finalAmount > 0;
  const hasValidEditPhones = editForm.phones.some(p => isPhoneRuComplete(p) || normalizePhone(p).length >= 11);
  const canSaveOrder = (canCompleteAsMaster && !canEdit && !isEditing)
    ? ((status !== 'completed' || hasValidFinalAmount) && (status !== 'cancelled' || cancelReason.trim().length > 0))
    : (
      (!isEditing || (
        editForm.clientName.trim().length > 0
        && editForm.address.trim().length > 0
        && hasValidEditPhones
        && (sourceLocked || Boolean(editForm.source))
      ))
      && (status !== 'completed' || hasValidFinalAmount)
      && (status !== 'cancelled' || cancelReason.trim().length > 0)
    );
  const initialTaskValues = {
    orderNumber: order.orderNumber,
    phone: editForm.phones.find(phone => phone.trim()) || order.phones?.[0] || '',
    responsible: editForm.manager || order.manager,
  };

  const operatorOptions = (() => {
    const opts = operators.map(o => ({ value: o.name, label: o.name }));
    if (editForm.manager && !opts.find(o => o.value === editForm.manager)) {
      opts.unshift({ value: editForm.manager, label: `${editForm.manager} (неактивен)` });
    }
    return opts;
  })();

  const sourceOptions = (() => {
    const opts = sources.map(s => ({ value: s.name, label: formatSourceShort(s.name) }));
    if (editForm.source && !opts.find(s => s.value === editForm.source)) {
      opts.unshift({ value: editForm.source, label: `${formatSourceShort(editForm.source)} (неактивен)` });
    }
    return opts;
  })();

  const masterOptions = [
    { value: '', label: '— Не назначен —' },
    ...masters.map(m => ({ value: m.id, label: `${m.name}${m.phone ? ` (${m.phone})` : ''}` })),
  ];

  const addPhone = () => setEditForm({ ...editForm, phones: [...editForm.phones, ''] });
  const updatePhone = (i: number, v: string) => {
    const p = [...editForm.phones]; p[i] = v; setEditForm({ ...editForm, phones: p });
  };
  const removePhone = (i: number) => {
    if (editForm.phones.length > 1) setEditForm({ ...editForm, phones: editForm.phones.filter((_, idx) => idx !== i) });
  };

  const selectedMaster = masters.find(m => m.id === editForm.masterId);

  const handleSave = async () => {
    setShowValidation(true);
    setError(null);
    if (!canSaveOrder) {
      setError('Заполните обязательные поля');
      return;
    }
    const becomingOnSiteCancel = status === 'cancelled'
      && cancelType === 'on_site'
      && !(order.status === 'cancelled' && order.cancelType === 'on_site');
    if (becomingOnSiteCancel) {
      const label = order.orderNumber ? `#${order.orderNumber}` : order.clientName;
      if (!confirm(`Точно отмена на месте?\n\n${label} — статус сменится на «Отмена на месте».`)) {
        return;
      }
    }
    try {
      const updates: Record<string, unknown> = { status, masterCheckStatus };

      if (isEditing) {
        Object.assign(updates, {
          ...editForm,
          phones: normalizePhoneList(editForm.phones.filter(p => p.trim())),
          masterId: editForm.masterId || null,
          masterName: selectedMaster?.name || '',
          masterContact: selectedMaster?.phone || '',
        });
        if (sourceLocked) {
          updates.source = order.source;
        }
      }

      if (status === 'completed') {
        Object.assign(updates, {
          finalAmount: completedForm.finalAmount,
          masterPercent: completedForm.masterPercent,
          masterIncome, cashDesk,
          masterId: editForm.masterId || null,
          masterName: selectedMaster?.name || order.masterName || '',
          masterContact: selectedMaster?.phone || order.masterContact || '',
          repeatDate: completedForm.repeatDate,
          repeatTime: completedForm.repeatTime,
          repeatBasePrice: completedForm.repeatBasePrice || null,
          repeatMasterId: completedForm.repeatMasterId || null,
          completionComment: completedForm.completionComment,
          contractPhoto: completedForm.contractPhoto,
          workActPhoto: completedForm.workActPhoto,
        });
      }

      if (status === 'cancelled') {
        updates.cancelReason = cancelReason;
        updates.cancelType = cancelType;
      } else {
        updates.cancelReason = null;
        updates.cancelType = null;
      }

      await updateOrder(order.id, updates);
      setIsEditing(false);
      setShowValidation(false);
      setError(null);
      onSuccess?.();
    } catch (err) { setError((err as Error).message); }
  };

  const handleDelete = async () => {
    if (confirm('Удалить заказ?')) {
      try { await deleteOrder(order.id); onSuccess?.(); }
      catch (err) { setError((err as Error).message); }
    }
  };

  const getStatusStyles = () => {
    if (status === 'spam') return 'from-slate-500 to-slate-600';
    if (status === 'cancelled') return 'from-red-500 to-red-600';
    if (status === 'completed') return 'from-gray-400 to-gray-500';
    return order.orderType === 'primary' ? 'from-green-500 to-emerald-600' : 'from-amber-400 to-amber-500';
  };

  const statusLabels: Record<string, string> = {
    in_progress: 'В работе',
    completed: 'Выполнен',
    cancelled: cancelType === 'on_site' ? 'Отмена на месте' : 'Не оформилась',
    spam: 'Спам',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Детали заказа" size="lg">
      <div className="space-y-4 sm:space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2 animate-fade-in">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
            {error}
          </div>
        )}

        {/* Header Card */}
        <div className={`bg-gradient-to-br ${getStatusStyles()} text-white p-4 sm:p-6 rounded-2xl shadow-lg`}>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                {order.orderNumber && <span className="px-2 py-0.5 bg-white/30 rounded-full text-xs font-bold">#{order.orderNumber}</span>}
                <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-medium">{order.orderType === 'primary' ? 'Первичный' : 'Повторный'}</span>
                <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-medium">{statusLabels[status]}</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold">{editForm.clientName || order.clientName}</h3>
              <p className="opacity-90 mt-1">{editForm.pest || order.pest} • {editForm.objectType || order.objectType}</p>
              {order.source && (
                <div className="opacity-90 mt-1 text-xs sm:text-sm flex items-start gap-1">
                  <span>🔗</span>
                  <SourceLabel source={order.source} light align="start" />
                </div>
              )}
            </div>
            <div className="text-left sm:text-right">
              <div className="text-2xl sm:text-3xl font-bold">{(order.finalAmount || order.basePrice).toLocaleString()} ₽</div>
              <div className="text-sm opacity-75">{order.finalAmount ? 'итоговая сумма' : 'базовая цена'}</div>
            </div>
          </div>
          {canEdit && status === 'in_progress' && (
            <button
              onClick={() => {
                setIsEditing(prev => {
                  if (prev) setError(null);
                  return !prev;
                });
              }}
              className="mt-4 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              {isEditing ? 'Отменить редактирование' : 'Редактировать заявку'}
            </button>
          )}
        </div>

        {canEdit && !isEditing && (
          <div className="flex rounded-xl bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={`flex-1 py-2 px-2 sm:px-4 rounded-lg text-sm font-medium transition-all ${activeTab === 'details' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'}`}
            >
              Заявка
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('telephony')}
              className={`flex-1 py-2 px-2 sm:px-4 rounded-lg text-sm font-medium transition-all ${activeTab === 'telephony' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'}`}
            >
              📞 Телефония
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('activity')}
              className={`flex-1 py-2 px-2 sm:px-4 rounded-lg text-sm font-medium transition-all ${activeTab === 'activity' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'}`}
            >
              Активность
            </button>
          </div>
        )}

        {activeTab === 'telephony' && canEdit && order && !isEditing ? (
          <OrderTelephonyTab
            orderId={order.id}
            isActive={isOpen && activeTab === 'telephony'}
          />
        ) : activeTab === 'activity' && canEdit && order && !isEditing ? (
          <OrderActivityTab
            orderId={order.id}
            isActive={isOpen && activeTab === 'activity'}
          />
        ) : (
        <>
        {/* Edit Form */}
        {isEditing && canEdit ? (
          <div className="bg-blue-50 rounded-2xl p-4 sm:p-6 space-y-4 animate-fade-in">
            <h4 className="font-semibold text-blue-900 flex items-center gap-2">✏️ Редактирование</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <Input
                label="Имя клиента *"
                value={editForm.clientName}
                onChange={e => setEditForm({ ...editForm, clientName: e.target.value })}
                error={showValidation && isEditing && !editForm.clientName.trim() ? REQUIRED_FIELD_ERROR : undefined}
              />
              <Select label={orderServiceLabel} value={editForm.pest} onChange={e => setEditForm({ ...editForm, pest: e.target.value })} options={pestSelectOptions.map(p => ({ value: p, label: p }))} />
              <Select label="Объект" value={editForm.objectType} onChange={e => setEditForm({ ...editForm, objectType: e.target.value })} options={OBJECTS.map(o => ({ value: o, label: o }))} />
              <Input label="Объем" value={editForm.volume} onChange={e => setEditForm({ ...editForm, volume: e.target.value })} />
              <Input label="Дата" type="date" value={editForm.date} onChange={e => setEditForm({ ...editForm, date: e.target.value })} />
              <Select label="Время" value={editForm.time} onChange={e => setEditForm({ ...editForm, time: e.target.value })} options={TIMES.map(t => ({ value: t, label: t }))} />
              <Input label="Базовая цена" type="number" inputMode="numeric" value={editForm.basePrice || ''} onChange={e => setEditForm({ ...editForm, basePrice: Number(e.target.value) })} />
              <Select label="Тип клиента" value={editForm.clientType} onChange={e => setEditForm({ ...editForm, clientType: e.target.value as any })} options={[{ value: 'individual', label: '👤 Физ. лицо' }, { value: 'legal', label: '🏢 Юр. лицо' }]} />
            </div>
            <Input
              label="Адрес *"
              value={editForm.address}
              onChange={e => setEditForm({ ...editForm, address: e.target.value })}
              error={showValidation && isEditing && !editForm.address.trim() ? REQUIRED_FIELD_ERROR : undefined}
            />
            <div className="space-y-2">
              <label className={`block text-sm font-medium ${showValidation && isEditing && !hasValidEditPhones ? 'text-red-600' : 'text-gray-700'}`}>
                Телефоны *
              </label>
              {editForm.phones.map((phone, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <PhoneRuField
                    value={phone}
                    onChange={value => updatePhone(idx, value)}
                    className="flex-1 min-w-0"
                    error={showValidation && isEditing && !hasValidEditPhones && idx === 0 ? REQUIRED_FIELD_ERROR : undefined}
                  />
                  <button type="button" onClick={() => removePhone(idx)} className={`p-2.5 rounded-xl ${editForm.phones.length > 1 ? 'text-red-500' : 'text-gray-300'}`} disabled={editForm.phones.length <= 1}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                  {idx === editForm.phones.length - 1 && <button type="button" onClick={addPhone} className="p-2.5 rounded-xl text-gray-500"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg></button>}
                </div>
              ))}
              <PhoneDuplicateHint orders={phoneMatches} loading={phoneCheckLoading} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {canChangeManager ? (
                <Select
                  label="Оператор"
                  value={editForm.manager}
                  onChange={e => setEditForm({ ...editForm, manager: e.target.value })}
                  options={dataLoading ? [{ value: editForm.manager, label: 'Загрузка...' }] : operatorOptions}
                />
              ) : (
                <Input label="Оператор" value={order.manager} disabled />
              )}
              <Select
                label="Источник *"
                value={editForm.source}
                onChange={e => setEditForm({ ...editForm, source: e.target.value })}
                disabled={sourceLocked || dataLoading}
                error={showValidation && isEditing && !sourceLocked && !editForm.source ? REQUIRED_FIELD_ERROR : undefined}
                options={
                  dataLoading
                    ? [{ value: editForm.source, label: 'Загрузка...' }]
                    : sourceLocked
                      ? [{ value: editForm.source, label: editForm.source }]
                      : sourceOptions
                }
              />
            </div>
            <Select label="Мастер" value={editForm.masterId} onChange={e => setEditForm({ ...editForm, masterId: e.target.value })} options={masterOptions} />
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Комментарий</label>
              <textarea value={editForm.comment} onChange={e => setEditForm({ ...editForm, comment: e.target.value })} className="w-full px-4 py-3 sm:py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 resize-none text-base sm:text-sm" rows={3} />
            </div>
          </div>
        ) : (
          /* ─── View mode ─── */
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <h4 className="font-medium text-gray-900 text-sm sm:text-base">ℹ️ Информация</h4>
                <div className="space-y-2 text-sm">
                  {[
                    ['Объём', order.volume || '-'],
                    ['Дата', formatDate(order.date)],
                    ['Создан', formatDateTime(order.createdAt)],
                    ['Время', order.time],
                    ['Тип клиента', order.clientType === 'individual' ? 'Физ. лицо' : 'Юр. лицо'],
                    ['Менеджер', order.manager],
                    ...(order.roistatVisitId ? [['Визит', order.roistatVisitId] as [string, string]] : []),
                    ['Яндекс ID', resolvedCampaignId || order.yandexCampaignId || '-'],
                    ['Мастер', order.masterName || (order.masterId ? 'Назначен' : 'Не назначен')],
                    ['Базовая цена', `${order.basePrice.toLocaleString()} ₽`],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3">
                      <span className="text-gray-500 shrink-0">{k}:</span>
                      <span className="font-medium text-right">{v}</span>
                    </div>
                  ))}
                  <div className="flex justify-between gap-3 items-start">
                    <span className="text-gray-500 shrink-0">Источник:</span>
                    <SourceLabel source={order.source} className="font-medium" />
                  </div>
                  {hasRole('admin') && order.externalCrmId ? (
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500 shrink-0">Внешний №:</span>
                      <span className="font-medium text-right">{order.externalCrmId}</span>
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <h4 className="font-medium text-gray-900 text-sm sm:text-base">📍 Контакты</h4>
                <div className="space-y-2 text-sm">
                  <div><span className="text-gray-500">Адрес:</span><p className="font-medium mt-0.5 break-words">{order.address}</p></div>
                  <div>
                    <span className="text-gray-500">Телефоны:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(order.phones || []).map((phone, i) => (
                        <ClickToCallPhone
                          key={i}
                          phone={phone}
                          className="px-2 py-1 bg-white rounded-lg text-sm"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {order.comment && (
              <div className="bg-blue-50 rounded-xl p-4">
                <h4 className="font-medium text-blue-900 mb-2 text-sm sm:text-base">💬 Комментарий</h4>
                <p className="text-blue-800 text-sm">{order.comment}</p>
              </div>
            )}
            {order.status === 'completed' && !showCompletionForm && (order.contractPhoto || order.workActPhoto || order.completionComment) ? (
              <div className="bg-green-50 rounded-xl p-4 space-y-2">
                <h4 className="font-medium text-green-900 text-sm sm:text-base">Документы</h4>
                <div className="flex flex-col gap-1.5 text-sm">
                  {order.contractPhoto ? (
                    <StoredFileLink uploadId={order.contractPhoto} label="Фото договора" />
                  ) : null}
                  {order.workActPhoto ? (
                    <StoredFileLink uploadId={order.workActPhoto} label="Акт выполненных работ" />
                  ) : null}
                </div>
                {order.completionComment ? (
                  <p className="text-green-900 text-sm pt-1">{order.completionComment}</p>
                ) : null}
              </div>
            ) : null}
          </>
        )}
        </>
        )}

        {/* Master Check Status — visible to admin & operator */}
        {canEdit && activeTab === 'details' && !isEditing && (
          <div className="border-t border-gray-100 pt-4 sm:pt-6">
            <h4 className="font-medium text-gray-900 mb-3 text-sm sm:text-base">Прозвон и сверка с мастером</h4>
            <div className="flex rounded-xl bg-gray-100 p-1">
              {(['unchecked', 'checked', 'issue'] as const).map(val => {
                const labels: Record<string, string> = { unchecked: 'Не проверен', checked: 'Проверен', issue: 'Проблема' };
                const colors: Record<string, string> = { unchecked: 'bg-red-500', checked: 'bg-green-500', issue: 'bg-amber-500' };
                return (
                  <button key={val} type="button" onClick={() => setMasterCheckStatus(val)}
                    className={`flex-1 py-2 sm:py-2.5 px-2 sm:px-4 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${masterCheckStatus === val ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'}`}>
                    <span className={`w-2.5 h-2.5 rounded-full ${colors[val]}`} />
                    <span className="hidden sm:inline">{labels[val]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Status Selector */}
        {canManageCompletion && activeTab === 'details' && !isEditing && (
          <div className="border-t border-gray-100 pt-4 sm:pt-6">
            <h4 className="font-medium text-gray-900 mb-3 text-sm sm:text-base">{canCompleteAsMaster && !canEdit ? 'Завершение работ' : 'Изменить статус'}</h4>
            <div className="flex flex-wrap rounded-xl bg-gray-100 p-1 gap-1">
              {canEdit && (
                <button type="button" onClick={() => setStatus('in_progress')} className={`flex-1 min-w-[80px] py-2 sm:py-2.5 px-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${status === 'in_progress' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600'}`}>В работе</button>
              )}
              {(canEdit || order.status === 'in_progress') && (
                <button type="button" onClick={() => setStatus('completed')} className={`flex-1 min-w-[80px] py-2 sm:py-2.5 px-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${status === 'completed' ? 'bg-green-600 text-white shadow-sm' : 'text-gray-600'}`}>✓ Выполнен</button>
              )}
              {canEdit && (
                <button type="button" onClick={() => setStatus('cancelled')} className={`flex-1 min-w-[80px] py-2 sm:py-2.5 px-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${status === 'cancelled' ? 'bg-red-600 text-white shadow-sm' : 'text-gray-600'}`}>✕ Отменён</button>
              )}
            </div>
          </div>
        )}

        {/* Completed Form */}
        {showCompletionForm && (
          <div className="bg-green-50 rounded-2xl p-4 sm:p-6 space-y-4 animate-fade-in">
            <h4 className="font-semibold text-green-900">✅ Завершение заказа</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <Input label="Итоговая сумма" type="number" inputMode="numeric" value={completedForm.finalAmount || ''} onChange={e => setCompletedForm({ ...completedForm, finalAmount: Number(e.target.value) })} />
              <Input label="Процент мастера (%)" type="number" inputMode="numeric" value={completedForm.masterPercent} onChange={e => setCompletedForm({ ...completedForm, masterPercent: Number(e.target.value) || 0 })} />
            </div>
            {showValidation && !hasValidFinalAmount && (
              <p className="text-sm text-red-600">Укажите итоговую сумму больше 0.</p>
            )}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-white rounded-xl p-3 sm:p-4 border border-green-200">
                <div className="text-xs sm:text-sm text-gray-500 mb-1">Доход мастера</div>
                <div className="text-xl sm:text-2xl font-bold text-gray-900">{masterIncome.toLocaleString()} ₽</div>
              </div>
              <div className="bg-white rounded-xl p-3 sm:p-4 border border-green-200">
                <div className="text-xs sm:text-sm text-gray-500 mb-1">Сдать в кассу</div>
                <div className="text-xl sm:text-2xl font-bold text-green-600">{cashDesk.toLocaleString()} ₽</div>
              </div>
            </div>
            {canEdit ? (
              <>
                <Select label="Мастер (исполнитель)" value={editForm.masterId} onChange={e => setEditForm({ ...editForm, masterId: e.target.value })} options={masterOptions} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <Input label="Дата повторного визита" type="date" value={completedForm.repeatDate} onChange={e => setCompletedForm({ ...completedForm, repeatDate: e.target.value })} />
                  <Select label="Время повторного визита" value={completedForm.repeatTime} onChange={e => setCompletedForm({ ...completedForm, repeatTime: e.target.value })} options={TIMES.map(t => ({ value: t, label: t }))} />
                </div>
                <Input label="Сумма повтора" type="number" inputMode="numeric" value={completedForm.repeatBasePrice || ''} onChange={e => setCompletedForm({ ...completedForm, repeatBasePrice: Number(e.target.value) })} placeholder="Оставьте пустым для базовой цены" />
                {completedForm.repeatDate && (
                  <Select label="Мастер на повтор" value={completedForm.repeatMasterId} onChange={e => setCompletedForm({ ...completedForm, repeatMasterId: e.target.value })} options={masterOptions} />
                )}
              </>
            ) : null}
            {isDemoMode ? (
              <p className="text-xs text-gray-500">Файлы сохраняются в браузере (localStorage), до 4 МБ.</p>
            ) : null}
            <FileUpload label="Фото договора" value={fileExists === false ? '' : completedForm.contractPhoto} onChange={url => setCompletedForm({ ...completedForm, contractPhoto: url || '' })} />
            <FileUpload label="Акт выполненных работ" value={actFileExists === false ? '' : completedForm.workActPhoto} onChange={url => setCompletedForm({ ...completedForm, workActPhoto: url || '' })} />
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Комментарий к выполнению</label>
              <textarea
                value={completedForm.completionComment}
                onChange={e => setCompletedForm({ ...completedForm, completionComment: e.target.value })}
                className="w-full min-h-[112px] px-4 py-3 sm:py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 resize-y text-base sm:text-sm"
                rows={4}
                placeholder="Заметки по выполнению..."
              />
            </div>
          </div>
        )}

        {/* Cancelled Form */}
        {canEdit && activeTab === 'details' && status === 'cancelled' && (
          <div className="bg-red-50 rounded-2xl p-4 sm:p-6 space-y-4 animate-fade-in">
            <h4 className="font-semibold text-red-900">❌ Тип отмены</h4>
            <div className="flex rounded-xl bg-white p-1 border border-red-200">
              <button type="button" onClick={() => setCancelType('on_site')} className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${cancelType === 'on_site' ? 'bg-red-600 text-white shadow-sm' : 'text-gray-600'}`}>🏠 Отмена на месте</button>
              <button type="button" onClick={() => setCancelType('not_completed')} className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${cancelType === 'not_completed' ? 'bg-orange-600 text-white shadow-sm' : 'text-gray-600'}`}>❌ Не оформилась</button>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Комментарий</label>
              <textarea
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                className={`w-full px-4 py-3 sm:py-2.5 bg-white border rounded-xl text-gray-900 focus:outline-none focus:ring-2 resize-none text-base sm:text-sm ${
                  showValidation && !cancelReason.trim()
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                    : 'border-red-200 focus:border-red-500 focus:ring-red-500/20'
                }`}
                rows={3}
                placeholder="Укажите причину..."
              />
              {showValidation && !cancelReason.trim() ? (
                <p className="text-sm text-red-600">{REQUIRED_FIELD_ERROR}</p>
              ) : null}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4 border-t border-gray-100">
          {canDelete && <Button variant="danger" onClick={handleDelete} disabled={isLoading} className="w-full sm:w-auto order-last sm:order-first">🗑 Удалить</Button>}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:ml-auto">
            <Button variant="secondary" onClick={onClose} className="w-full sm:w-auto">Отмена</Button>
            {canEdit && (
              <Button type="button" variant="secondary" onClick={() => setIsTaskModalOpen(true)} className="w-full sm:w-auto">
                Создать задачу
              </Button>
            )}
            {(canEdit || canCompleteAsMaster) && (
              <Button
                variant="success"
                onClick={handleSave}
                loading={isLoading}
                disabled={isLoading}
                className={submitButtonClass(canSaveOrder, 'w-full sm:w-auto')}
              >
                Сохранить
              </Button>
            )}
          </div>
        </div>
        <TaskModal
          isOpen={isTaskModalOpen}
          onClose={() => setIsTaskModalOpen(false)}
          initialValues={initialTaskValues}
          title="Создать задачу"
        />
      </div>
    </Modal>
  );
}
