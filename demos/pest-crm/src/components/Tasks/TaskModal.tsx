
import React, { useEffect, useState } from 'react';
import Modal from '@/components/UI/Modal';
import Button from '@/components/UI/Button';
import Input from '@/components/UI/Input';
import Select from '@/components/UI/Select';
import { api, Task, TaskAssignee } from '@/lib/api';
import { REQUIRED_FIELD_ERROR, submitButtonClass } from '@/lib/formSubmitStyle';
import { formatPhoneRu, normalizePhone } from '@/lib/phone';
import { isDemoMode } from '@/lib/isDemoMode';
import OrderSearchFields from '@/components/Orders/OrderSearchFields';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => Promise<void> | void;
  task?: Task | null;
  initialValues?: Partial<TaskFormState>;
  title?: string;
}

type TaskFormState = {
  deadline: string;
  notifyAt: string;
  orderNumber: string;
  phone: string;
  comment: string;
  responsible: string;
  completed: 'true' | 'false';
};

const pad = (value: number) => String(value).padStart(2, '0');

const toDateTimeInputValue = (value: string | Date): string => {
  const date = typeof value === 'string' ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) return '';

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const shiftInputDate = (value: string, minutesDelta: number): string => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  date.setMinutes(date.getMinutes() + minutesDelta, 0, 0);
  return toDateTimeInputValue(date);
};

const getDefaultDeadline = (): string => {
  const date = new Date();
  date.setMinutes(date.getMinutes() + 30, 0, 0);
  return toDateTimeInputValue(date);
};

const getDefaultNotifyAt = (deadline: string): string => shiftInputDate(deadline, -10);

const createEmptyForm = (initialValues?: Partial<TaskFormState>): TaskFormState => {
  const deadline = initialValues?.deadline || getDefaultDeadline();
  const notifyAt = initialValues?.notifyAt ?? getDefaultNotifyAt(deadline);

  return {
    deadline,
    notifyAt,
    orderNumber: initialValues?.orderNumber || '',
    phone: initialValues?.phone ? formatPhoneRu(initialValues.phone) || initialValues.phone : '',
    comment: initialValues?.comment || '',
    responsible: initialValues?.responsible || '',
    completed: initialValues?.completed || 'false',
  };
};

const createFormFromTask = (task: Task): TaskFormState => ({
  deadline: toDateTimeInputValue(task.deadline),
  notifyAt: task.notifyAt ? toDateTimeInputValue(task.notifyAt) : '',
  orderNumber: task.orderNumber,
  phone: task.phone ? formatPhoneRu(task.phone) || task.phone : '',
  comment: task.comment,
  responsible: task.responsible,
  completed: task.completed ? 'true' : 'false',
});

export default function TaskModal({
  isOpen,
  onClose,
  onSuccess,
  task,
  initialValues,
  title,
}: Props) {
  const [form, setForm] = useState<TaskFormState>(createEmptyForm(initialValues));
  const [assignees, setAssignees] = useState<TaskAssignee[]>([]);
  const [isLoadingAssignees, setIsLoadingAssignees] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showValidation, setShowValidation] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setError(null);
    setShowValidation(false);
    setForm(task ? createFormFromTask(task) : createEmptyForm(initialValues));
  }, [initialValues, isOpen, task]);

  useEffect(() => {
    if (!isOpen) return;

    const loadAssignees = async () => {
      setIsLoadingAssignees(true);

      try {
        const data = await api.getTaskAssignees();
        setAssignees(data);

        if (!task && data.length > 0) {
          setForm(current => current.responsible ? current : { ...current, responsible: data[0].name });
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoadingAssignees(false);
      }
    };

    loadAssignees();
  }, [isOpen, task]);

  const responsibleOptions = assignees.map(assignee => ({
    value: assignee.name,
    label: `${assignee.name}${assignee.role === 'admin' ? ' (admin)' : ''}${assignee.login ? ` • ${assignee.login}` : ''}${assignee.email ? '' : ' • без email'}`,
  }));

  const selectedAssignee = assignees.find(assignee => assignee.name === form.responsible);

  if (form.responsible && !responsibleOptions.find(option => option.value === form.responsible)) {
    responsibleOptions.unshift({
      value: form.responsible,
      label: `${form.responsible} (неактивен)`,
    });
  }

  if (responsibleOptions.length === 0) {
    responsibleOptions.push({
      value: '',
      label: isLoadingAssignees ? 'Загрузка сотрудников...' : 'Нет сотрудников',
    });
  }

  const handleDeadlineChange = (nextDeadline: string) => {
    setForm(current => {
      const currentDefaultNotifyAt = current.notifyAt === getDefaultNotifyAt(current.deadline);

      return {
        ...current,
        deadline: nextDeadline,
        notifyAt: current.notifyAt && currentDefaultNotifyAt
          ? getDefaultNotifyAt(nextDeadline)
          : current.notifyAt,
      };
    });
  };

  const hasValidPhone = normalizePhone(form.phone).length >= 11;
  const canSubmit =
    Boolean(form.deadline)
    && form.orderNumber.trim().length > 0
    && hasValidPhone
    && form.comment.trim().length > 0
    && form.responsible.trim().length > 0
    && Boolean(responsibleOptions[0]?.value);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowValidation(true);
    setError(null);

    if (!canSubmit) {
      setError('Заполните все обязательные поля');
      return;
    }

    if (form.notifyAt && form.completed === 'false' && !selectedAssignee?.email) {
      setError('Для email-напоминания у ответственного должен быть заполнен email');
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        deadline: new Date(form.deadline).toISOString(),
        notifyAt: form.notifyAt ? new Date(form.notifyAt).toISOString() : null,
        orderNumber: form.orderNumber.trim(),
        phone: form.phone.trim(),
        comment: form.comment.trim(),
        responsible: form.responsible.trim(),
        completed: form.completed === 'true',
      };

      if (task) {
        await api.updateTask(task.id, payload);
      } else {
        await api.createTask(payload);
      }

      await onSuccess?.();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={task ? `Задача #${task.taskNumber}` : title || 'Добавить задачу'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        <Input
          label="Дедлайн *"
          type="datetime-local"
          value={form.deadline}
          onChange={e => handleDeadlineChange(e.target.value)}
          error={showValidation && !form.deadline ? REQUIRED_FIELD_ERROR : undefined}
        />

        <Input
          label="Напомнить по email"
          type="datetime-local"
          value={form.notifyAt}
          onChange={e => setForm(current => ({ ...current, notifyAt: e.target.value }))}
          hint="Пусто = без email-напоминания. По умолчанию ставится за 10 минут до дедлайна."
        />

        <OrderSearchFields
          orderNumber={form.orderNumber}
          phone={form.phone}
          onOrderNumberChange={value => setForm(current => ({ ...current, orderNumber: value }))}
          onPhoneChange={value => setForm(current => ({ ...current, phone: value }))}
          orderNumberError={showValidation && !form.orderNumber.trim() ? REQUIRED_FIELD_ERROR : undefined}
          phoneError={showValidation && !hasValidPhone ? REQUIRED_FIELD_ERROR : undefined}
        />

        <div className="space-y-1.5">
          <label className={`block text-sm font-medium ${showValidation && !form.comment.trim() ? 'text-red-600' : 'text-gray-700'}`}>
            Комментарий *
          </label>
          <textarea
            value={form.comment}
            onChange={e => setForm(current => ({ ...current, comment: e.target.value }))}
            className={`w-full resize-none rounded-xl border bg-white px-4 py-3 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 sm:py-2.5 sm:text-sm ${
              showValidation && !form.comment.trim()
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                : 'border-gray-200 focus:border-green-500'
            }`}
            rows={4}
            placeholder="Что нужно сделать по задаче"
          />
          {showValidation && !form.comment.trim() ? (
            <p className="text-sm text-red-600">{REQUIRED_FIELD_ERROR}</p>
          ) : null}
        </div>

        <Select
          label="Ответственный *"
          value={form.responsible}
          onChange={e => setForm(current => ({ ...current, responsible: e.target.value }))}
          options={responsibleOptions}
          disabled={isLoadingAssignees}
          error={showValidation && !form.responsible.trim() ? REQUIRED_FIELD_ERROR : undefined}
        />

        {form.notifyAt && form.completed === 'false' && (
          <div className={`rounded-xl border px-4 py-3 text-sm ${selectedAssignee?.email ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
            {selectedAssignee?.email
              ? isDemoMode
                ? `В демо письма не отправляются. В продукте напоминание уйдёт на ${selectedAssignee.email}.`
                : `Письмо-напоминание уйдет на ${selectedAssignee.email}.`
              : 'У выбранного ответственного нет email. Уберите время напоминания или заполните email в пользователях.'}
          </div>
        )}

        <Select
          label="Выполнена"
          value={form.completed}
          onChange={e => setForm(current => ({ ...current, completed: e.target.value as 'true' | 'false' }))}
          options={[
            { value: 'false', label: 'Нет' },
            { value: 'true', label: 'Да' },
          ]}
        />

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4 border-t border-gray-100">
          <Button type="button" variant="secondary" onClick={onClose} className="w-full sm:w-auto">
            Отмена
          </Button>
          <Button
            type="submit"
            variant="success"
            loading={isSaving}
            className={submitButtonClass(canSubmit && !isLoadingAssignees, 'w-full sm:w-auto')}
            disabled={isSaving}
          >
            {task ? 'Сохранить' : 'Создать задачу'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
