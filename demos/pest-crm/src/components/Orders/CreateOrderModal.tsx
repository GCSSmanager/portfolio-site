
import React, { useEffect, useState } from 'react';
import Modal from '@/components/UI/Modal';
import Button from '@/components/UI/Button';
import Input from '@/components/UI/Input';
import Select from '@/components/UI/Select';
import TaskModal from '@/components/Tasks/TaskModal';
import PhoneDuplicateHint from '@/components/Orders/PhoneDuplicateHint';
import { useOrderStore } from '@/store/orderStore';
import { useAuth } from '@/contexts/AuthContext';
import { api, Order, Source } from '@/lib/api';
import { formatSourceShort } from '@/lib/sourceLabel';
import { formatPhoneRu, normalizePhone, normalizePhoneList } from '@/lib/phone';
import {
  getDefaultOrderService,
  getOrderServiceLabel,
  getOrderServices,
  resolveOrderService,
} from '@/lib/orderFields';
import { REQUIRED_FIELD_ERROR, submitButtonClass } from '@/lib/formSubmitStyle';
import PhoneRuField from '@/components/UI/PhoneRuField';
import { SOURCES_UPDATED_EVENT, type SourcesUpdatedDetail } from '@/demo/events';

export interface CreateOrderInitialValues {
  clientName?: string;
  phones?: string[];
  source?: string;
  comment?: string;
  address?: string;
  pest?: string;
  volume?: string;
  objectType?: string;
  basePrice?: number;
  date?: string;
  time?: string;
  /** Зафиксировать источник — нельзя сменить в форме */
  lockSource?: boolean;
  externalCrmId?: number;
  roistatVisitId?: string;
  roistatLeadId?: string;
  roistatLeadRecordId?: string;
  ymClientId?: string;
  yclid?: string;
  yandexCampaignId?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  /** Вызывается после успешного createOrder, до onSuccess/onClose. Ошибка покажется в модалке. */
  onAfterCreate?: (order: Order) => void | Promise<void>;
  /** Одно подтверждение перед сохранением */
  confirmMessage?: string;
  /** Показать кнопку «Создать задачу» (по умолчанию да) */
  showCreateTask?: boolean;
  selectedDate?: string;
  selectedTime?: string;
  initialValues?: CreateOrderInitialValues | null;
}

const OBJECTS = ['Квартира', 'Дом', 'Офис', 'Склад', 'Ресторан', 'Магазин', 'Участок'];
const TIMES = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);

interface UserOption {
  id: string;
  name: string;
  phone?: string;
}

const createInitialForm = (selectedDate?: string, selectedTime?: string) => ({
  orderType: 'primary' as 'primary' | 'secondary',
  clientName: '',
  pest: getDefaultOrderService(),
  objectType: 'Квартира',
  volume: '',
  address: '',
  date: selectedDate || new Date().toISOString().split('T')[0],
  time: selectedTime || '09:00',
  basePrice: 0,
  clientType: 'individual' as 'individual' | 'legal',
  comment: '',
  manager: '',
  source: '',
  masterId: '',
});

export default function CreateOrderModal({
  isOpen,
  onClose,
  onSuccess,
  onAfterCreate,
  confirmMessage,
  showCreateTask = true,
  selectedDate,
  selectedTime,
  initialValues,
}: Props) {
  const { createOrder, isLoading } = useOrderStore();
  const { user } = useAuth();
  const [phones, setPhones] = useState<string[]>(['']);
  const [error, setError] = useState<string | null>(null);

  const [masters, setMasters] = useState<UserOption[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [createdOrderForTask, setCreatedOrderForTask] = useState<Order | null>(null);

  const [form, setForm] = useState(createInitialForm(selectedDate, selectedTime));
  const [roistatMeta, setRoistatMeta] = useState<CreateOrderInitialValues | null>(null);
  const [phoneMatches, setPhoneMatches] = useState<Order[]>([]);
  const [phoneCheckLoading, setPhoneCheckLoading] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const sourceLocked = Boolean(initialValues?.lockSource && (initialValues.source || form.source));
  const primaryBlockedByPhone = form.orderType === 'primary' && phoneMatches.length > 0;
  const orderServices = getOrderServices();
  const orderServiceLabel = getOrderServiceLabel();

  useEffect(() => {
    if (!isOpen) {
      setShowValidation(false);
      return;
    }

    const loadData = async () => {
      setDataLoading(true);
      try {
        const [ms, srcs] = await Promise.all([
          api.getMasters(),
          api.getSources(false),
        ]);

        setMasters(ms);
        let nextSources = srcs;

        // Зафиксированный источник — гарантируем, что он есть в списке
        const lockedSource = initialValues?.lockSource ? initialValues.source?.trim() : '';
        if (lockedSource && !nextSources.some((s) => s.name === lockedSource)) {
          try {
            const created = await api.createSource(lockedSource);
            nextSources = [...nextSources, created].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
          } catch {
            // уже есть / нет прав — подставим вручную в options ниже
            nextSources = [
              ...nextSources,
              { id: 'locked', name: lockedSource, isActive: true } as Source,
            ];
          }
        }

        setSources(nextSources);
        setForm(current => ({
          ...current,
          manager: user?.name || current.manager,
          source: lockedSource || current.source || nextSources[0]?.name || '',
        }));
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setDataLoading(false);
      }
    };

    loadData();
  }, [isOpen, initialValues?.lockSource, initialValues?.source, user?.name]);

  useEffect(() => {
    if (!isOpen) return;
    const onSourcesUpdated = (event: Event) => {
      const detail = (event as CustomEvent<SourcesUpdatedDetail>).detail;
      void api.getSources(false).then(setSources).catch(() => {});
      if (detail?.oldName && detail?.newName) {
        setForm(f => (f.source === detail.oldName ? { ...f, source: detail.newName } : f));
      }
    };
    window.addEventListener(SOURCES_UPDATED_EVENT, onSourcesUpdated);
    return () => window.removeEventListener(SOURCES_UPDATED_EVENT, onSourcesUpdated);
  }, [isOpen]);

  useEffect(() => {
    if (selectedDate) setForm(current => ({ ...current, date: selectedDate }));
    if (selectedTime) setForm(current => ({ ...current, time: selectedTime }));
  }, [selectedDate, selectedTime]);

  useEffect(() => {
    if (!isOpen) {
      setForm(createInitialForm(selectedDate, selectedTime));
      setPhones(['']);
      setRoistatMeta(null);
      setError(null);
      setCreatedOrderForTask(null);
      setPhoneMatches([]);
      setPhoneCheckLoading(false);
      return;
    }

    if (initialValues) {
      setRoistatMeta(initialValues);
      setForm(current => ({
        ...current,
        clientName: initialValues.clientName ?? current.clientName,
        source: initialValues.source || current.source,
        comment: initialValues.comment ?? current.comment,
        address: initialValues.address ?? current.address,
        pest: resolveOrderService(initialValues.pest),
        volume: initialValues.volume ?? current.volume,
        objectType: initialValues.objectType || current.objectType,
        basePrice: initialValues.basePrice ?? current.basePrice,
        date: initialValues.date || current.date,
        time: initialValues.time || current.time,
      }));
      setPhones(
        initialValues.phones?.length
          ? initialValues.phones.map(p => (p ? formatPhoneRu(p) || p : ''))
          : [''],
      );
    } else {
      setForm(current => ({
        ...current,
        pest: resolveOrderService(current.pest),
      }));
    }
  }, [isOpen, selectedDate, selectedTime, initialValues]);

  // Проверка телефонов: есть ли уже заказы с этими номерами
  useEffect(() => {
    if (!isOpen) return;

    const norms = Array.from(new Set(
      phones.map((p) => normalizePhone(p)).filter((p) => p.length >= 11),
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
        const lists = await Promise.all(norms.map((p) => api.findOrdersByPhone(p)));
        if (cancelled) return;
        const byId = new Map<string, Order>();
        for (const list of lists) {
          for (const order of list) byId.set(order.id, order);
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
  }, [isOpen, phones]);

  const sourceOptions = sources.map(source => ({
    value: source.name,
    label: formatSourceShort(source.name),
  }));

  const hasValidPhone = phones.some(p => normalizePhone(p).length >= 11);

  const canSubmitOrder =
    !dataLoading
    && Boolean(user?.name)
    && sourceOptions.length > 0
    && !primaryBlockedByPhone
    && !phoneCheckLoading
    && form.clientName.trim().length > 0
    && form.address.trim().length > 0
    && Boolean(form.source)
    && hasValidPhone;


  const validateForm = (): string | null => {
    if (!form.clientName.trim()) return 'Введите имя клиента';
    if (!form.address.trim()) return 'Введите адрес';
    if (!user?.name) return 'Не удалось определить оператора';
    if (!form.source) return 'Выберите источник';
    if (!hasValidPhone) return 'Добавьте корректный телефон';
    return null;
  };

  const buildOrderPayload = () => {
    const selectedMaster = masters.find(master => master.id === form.masterId);

    return {
      ...form,
      manager: user?.name || form.manager,
      pest: resolveOrderService(form.pest),
      source: sourceLocked ? (initialValues?.source || form.source) : form.source,
      phones: normalizePhoneList(phones.filter(phone => phone.trim())),
      masterId: form.masterId || undefined,
      masterName: selectedMaster?.name || '',
      masterContact: selectedMaster?.phone || '',
      roistatVisitId: roistatMeta?.roistatVisitId,
      roistatLeadId: roistatMeta?.roistatLeadId,
      roistatLeadRecordId: roistatMeta?.roistatLeadRecordId,
      ymClientId: roistatMeta?.ymClientId,
      yclid: roistatMeta?.yclid,
      yandexCampaignId: roistatMeta?.yandexCampaignId,
      externalCrmId: roistatMeta?.externalCrmId,
    };
  };

  const submitOrder = async (): Promise<Order | null> => {
    setShowValidation(true);
    setError(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return null;
    }

    if (form.orderType === 'primary' && phoneMatches.length > 0) {
      setError('Уже есть заказ с этим номером. Создайте повторный заказ или смените телефон.');
      return null;
    }

    if (confirmMessage && !window.confirm(confirmMessage)) {
      return null;
    }

    try {
      const order = await createOrder(buildOrderPayload());
      if (onAfterCreate) {
        await onAfterCreate(order);
      }
      return order;
    } catch (err) {
      setError((err as Error).message);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const order = await submitOrder();
    if (!order) return;

    onSuccess?.();
    onClose();
  };

  const handleCreateTaskFlow = async () => {
    const order = await submitOrder();
    if (!order) return;

    setCreatedOrderForTask(order);
  };

  const addPhone = () => setPhones(current => [...current, '']);

  const updatePhone = (index: number, value: string) => {
    setPhones(current => current.map((phone, currentIndex) => currentIndex === index ? value : phone));
  };

  const removePhone = (index: number) => {
    if (phones.length <= 1) return;
    setPhones(current => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const masterOptions = [
    { value: '', label: '— Не назначен —' },
    ...masters.map(master => ({
      value: master.id,
      label: `${master.name}${master.phone ? ` (${master.phone})` : ''}`,
    })),
  ];

  const initialTaskValues = createdOrderForTask
    ? {
        orderNumber: createdOrderForTask.orderNumber,
        phone: createdOrderForTask.phones?.[0] || '',
        responsible: form.manager,
      }
    : undefined;

  const closeTaskFlow = () => {
    setCreatedOrderForTask(null);
    onSuccess?.();
    onClose();
  };

  return (
    <>
      <Modal isOpen={isOpen && !createdOrderForTask} onClose={onClose} title="Создать заявку" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {sourceLocked && (
            <div className="bg-blue-50 border border-blue-100 text-blue-800 px-4 py-3 rounded-xl text-sm">
              Источник зафиксирован: {initialValues?.source || form.source}
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2 animate-fade-in">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <div className="flex rounded-xl bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setForm(current => ({ ...current, orderType: 'primary' }))}
              className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${form.orderType === 'primary' ? 'bg-green-600 text-white shadow-sm' : 'text-gray-600'}`}
            >
              Первичный
            </button>
            <button
              type="button"
              onClick={() => setForm(current => ({ ...current, orderType: 'secondary' }))}
              className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${form.orderType === 'secondary' ? 'bg-amber-500 text-white shadow-sm' : 'text-gray-600'}`}
            >
              Повторный
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Input
              label="Имя клиента *"
              value={form.clientName}
              onChange={e => setForm(current => ({ ...current, clientName: e.target.value }))}
              placeholder="Иванов Иван"
              error={showValidation && !form.clientName.trim() ? REQUIRED_FIELD_ERROR : undefined}
            />
            <Select label={orderServiceLabel} value={form.pest} onChange={e => setForm(current => ({ ...current, pest: e.target.value }))} options={orderServices.map(pest => ({ value: pest, label: pest }))} />
            <Select label="Объект" value={form.objectType} onChange={e => setForm(current => ({ ...current, objectType: e.target.value }))} options={OBJECTS.map(object => ({ value: object, label: object }))} />
            <Input label="Объем" value={form.volume} onChange={e => setForm(current => ({ ...current, volume: e.target.value }))} placeholder="2-комн." />
            <Input label="Дата" type="date" value={form.date} onChange={e => setForm(current => ({ ...current, date: e.target.value }))} />
            <Select label="Время" value={form.time} onChange={e => setForm(current => ({ ...current, time: e.target.value }))} options={TIMES.map(time => ({ value: time, label: time }))} />
            <Input label="Базовая цена" type="number" inputMode="numeric" value={form.basePrice || ''} onChange={e => setForm(current => ({ ...current, basePrice: Number(e.target.value) }))} placeholder="5000" />
            <Select
              label="Тип клиента"
              value={form.clientType}
              onChange={e => setForm(current => ({ ...current, clientType: e.target.value as 'individual' | 'legal' }))}
              options={[
                { value: 'individual', label: 'Физ. лицо' },
                { value: 'legal', label: 'Юр. лицо' },
              ]}
            />
          </div>

          <Input
            label="Адрес *"
            value={form.address}
            onChange={e => setForm(current => ({ ...current, address: e.target.value }))}
            placeholder="г. Москва, ул. Мира 12, кв. 65"
            error={showValidation && !form.address.trim() ? REQUIRED_FIELD_ERROR : undefined}
          />

          <div className="space-y-2">
            <label className={`block text-sm font-medium ${showValidation && !hasValidPhone ? 'text-red-600' : 'text-gray-700'}`}>
              Телефоны *
            </label>
            {showValidation && !hasValidPhone ? (
              <p className="text-sm text-red-600">Укажите хотя бы один полный номер</p>
            ) : null}
            {phones.map((phone, index) => (
              <div key={index} className="flex gap-2 items-start">
                <PhoneRuField
                  value={phone}
                  onChange={value => updatePhone(index, value)}
                  className="flex-1 min-w-0"
                  error={showValidation && !hasValidPhone && index === 0 ? ' ' : undefined}
                />
                <button
                  type="button"
                  onClick={() => removePhone(index)}
                  className={`p-2.5 rounded-xl ${phones.length > 1 ? 'text-red-500' : 'text-gray-300'}`}
                  disabled={phones.length <= 1}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                {index === phones.length - 1 && (
                  <button type="button" onClick={addPhone} className="p-2.5 rounded-xl text-gray-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
            <PhoneDuplicateHint
              orders={phoneMatches}
              loading={phoneCheckLoading}
              blockPrimary={form.orderType === 'primary'}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Input label="Оператор" value={user?.name || ''} disabled />
            <Select
              label="Источник *"
              value={form.source}
              onChange={e => setForm(current => ({ ...current, source: e.target.value }))}
              disabled={sourceLocked || dataLoading}
              error={showValidation && !form.source ? 'Выберите источник' : undefined}
              options={
                dataLoading
                  ? [{ value: '', label: 'Загрузка...' }]
                  : sourceLocked && (initialValues?.source || form.source)
                    ? [{ value: initialValues?.source || form.source, label: initialValues?.source || form.source }]
                    : sourceOptions.length > 0
                      ? sourceOptions
                      : [{ value: '', label: 'Нет источников' }]
              }
            />
          </div>

          <Select
            label="Мастер (необязательно)"
            value={form.masterId}
            onChange={e => setForm(current => ({ ...current, masterId: e.target.value }))}
            options={masterOptions}
          />

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Комментарий</label>
            <textarea
              value={form.comment}
              onChange={e => setForm(current => ({ ...current, comment: e.target.value }))}
              className="w-full px-4 py-3 sm:py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 resize-none text-base sm:text-sm"
              rows={3}
              placeholder="Дополнительная информация..."
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="secondary" onClick={onClose} className="w-full sm:w-auto">
              Отмена
            </Button>
            {showCreateTask && (
              <Button
                type="button"
                variant="secondary"
                onClick={handleCreateTaskFlow}
                loading={isLoading}
                className={submitButtonClass(canSubmitOrder, 'w-full sm:w-auto')}
                disabled={isLoading}
              >
                Создать задачу
              </Button>
            )}
            <Button
              type="submit"
              variant="success"
              loading={isLoading}
              className={submitButtonClass(canSubmitOrder, 'w-full sm:w-auto')}
              disabled={isLoading}
            >
              Создать заказ
            </Button>
          </div>
        </form>
      </Modal>

      <TaskModal
        isOpen={Boolean(createdOrderForTask)}
        onClose={closeTaskFlow}
        initialValues={initialTaskValues}
        title="Создать задачу"
      />
    </>
  );
}
