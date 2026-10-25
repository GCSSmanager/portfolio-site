
import React, { useState, useEffect, useMemo } from 'react';
import Modal from '@/components/UI/Modal';
import Button from '@/components/UI/Button';
import Input from '@/components/UI/Input';
import Select from '@/components/UI/Select';
import { api, User } from '@/lib/api';
import type { WorkHourInterval } from '@/types';
import { CRM_PROJECTS, CrmProjectId } from '@/lib/projects';
import PayHistory from '@/components/UI/PayHistory';
import type { PayEntry } from '@/types';
import { REQUIRED_FIELD_ERROR, submitButtonClass } from '@/lib/formSubmitStyle';
import PhoneRuField from '@/components/UI/PhoneRuField';
import { formatPhoneRu, normalizePhone } from '@/lib/phone';
import { isPhoneRuComplete } from '@/lib/phone-ru';
import { PhoneRuInput } from '@/components/demo/PhoneRuInput';

const digitsOnly = (value: string): string => value.replace(/\D/g, '');

/** 11 цифр с 7/8 → последние 10; иначе как есть */
const phoneCore = (digits: string): string => {
  if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
    return digits.slice(1);
  }
  if (digits.length === 10) return digits;
  return digits;
};

const phoneMatchesQuery = (phone: string | null | undefined, query: string): boolean => {
  const qDigits = digitsOnly(query);
  if (!qDigits) return false;
  const pDigits = digitsOnly(phone || '');
  if (!pDigits) return false;

  const qCore = phoneCore(qDigits);
  const pCore = phoneCore(pDigits);

  return (
    pDigits.includes(qDigits)
    || qDigits.includes(pDigits)
    || pCore.includes(qCore)
    || qCore.includes(pCore)
  );
};

const userMatchesSearch = (user: User, rawQuery: string): boolean => {
  const query = rawQuery.trim();
  if (!query) return true;

  const qLower = query.toLowerCase();
  if (user.name?.toLowerCase().includes(qLower)) return true;
  if (user.login?.toLowerCase().includes(qLower)) return true;

  if (digitsOnly(query).length > 0) {
    return phoneMatchesQuery(user.phone, query);
  }

  return false;
};

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

const ROLE_LABELS: Record<string, string> = {
    admin: '👑 Админ',
    operator: '📞 Оператор',
    master: '🔧 Мастер',
};

const ROLE_OPTIONS = [
    { value: 'operator', label: '📞 Оператор' },
    { value: 'master', label: '🔧 Мастер' },
    { value: 'admin', label: '👑 Админ' },
];

const MONTH_NAMES = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

const WEEKDAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export default function UsersModal({ isOpen, onClose }: Props) {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showInactive, setShowInactive] = useState(false);
    const [filterRole, setFilterRole] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');

    // Create form
    const [showCreate, setShowCreate] = useState(false);
    const [createShowValidation, setCreateShowValidation] = useState(false);
    const [createForm, setCreateForm] = useState({
        login: '', password: '', role: 'operator', name: '', email: '', phone: '', region: '', notes: '', novofonEmployeeIds: '',
        crmProjects: ['pest-control'] as CrmProjectId[],
        canViewOwnOrderHistory: false,
    });

    // Edit
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editShowValidation, setEditShowValidation] = useState(false);
    const [editForm, setEditForm] = useState({
        name: '', email: '', phone: '', region: '', notes: '', novofonEmployeeIds: '', password: '',
        crmProjects: ['pest-control'] as CrmProjectId[],
        canViewOwnOrderHistory: false,
    });

    // Calendar
    const [calendarUserId, setCalendarUserId] = useState<string | null>(null);
    const [calDate, setCalDate] = useState(new Date());
    const [workDays, setWorkDays] = useState<Set<string>>(new Set());
    const [calLoading, setCalLoading] = useState(false);
    const [togglingDay, setTogglingDay] = useState<string | null>(null);
    const [weekdaySalaryInput, setWeekdaySalaryInput] = useState('');
    const [weekendSalaryInput, setWeekendSalaryInput] = useState('');
    const [paidAmountInput, setPaidAmountInput] = useState('');
    const [payEntries, setPayEntries] = useState<PayEntry[]>([]);
    const [paidTotal, setPaidTotal] = useState(0);
    const [savingSalary, setSavingSalary] = useState(false);
    const [savingPaid, setSavingPaid] = useState(false);
    const [workHoursDraft, setWorkHoursDraft] = useState<WorkHourInterval[]>([]);
    const [savingWorkHours, setSavingWorkHours] = useState(false);

    const loadUsers = async () => {
        setIsLoading(true);
        try {
            const data = await api.getUsers({
                role: filterRole || undefined,
                includeInactive: showInactive,
            });
            setUsers(data);
            setError(null);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) loadUsers();
        else setSearchQuery('');
    }, [isOpen, showInactive, filterRole]);

    const filteredUsers = useMemo(
        () => (searchQuery.trim() ? users.filter((u) => userMatchesSearch(u, searchQuery)) : users),
        [users, searchQuery],
    );

    const calYear = calDate.getFullYear();
    const calMonth = calDate.getMonth() + 1;

    const loadWorkDays = async (id: string) => {
        setCalLoading(true);
        try {
            setWorkDays(new Set(await api.getUserWorkDays(id, calYear, calMonth)));
        } catch {
            /* ignore */
        } finally {
            setCalLoading(false);
        }
    };

    const applyMonthPay = (data: { paidAmount: number; payments?: PayEntry[] }) => {
        setPaidTotal(data.paidAmount ?? 0);
        setPayEntries(data.payments ?? []);
        setPaidAmountInput('');
    };

    const loadMonthPay = async (id: string) => {
        try {
            applyMonthPay(await api.getUserMonthPay(id, calYear, calMonth));
        } catch {
            applyMonthPay({ paidAmount: 0, payments: [] });
        }
    };

    useEffect(() => {
        if (calendarUserId) {
            void loadWorkDays(calendarUserId);
            void loadMonthPay(calendarUserId);
        } else {
            setPaidAmountInput('');
            setPayEntries([]);
            setPaidTotal(0);
        }
    }, [calendarUserId, calYear, calMonth]);

    useEffect(() => {
        if (!calendarUserId) {
            setWeekdaySalaryInput('');
            setWeekendSalaryInput('');
            setWorkHoursDraft([]);
            return;
        }
        const user = users.find((u) => u.id === calendarUserId);
        setWeekdaySalaryInput(String(user?.weekdaySalary ?? 0));
        setWeekendSalaryInput(String(user?.weekendSalary ?? 0));
        setWorkHoursDraft(
            Array.isArray(user?.workHours) && user.workHours.length
                ? user.workHours.map((i) => ({ start: i.start, end: i.end }))
                : [],
        );
    }, [calendarUserId, users]);

    const handleWorkHourChange = (index: number, field: 'start' | 'end', value: string) => {
        setWorkHoursDraft((prev) => prev.map((item, i) => (
            i === index ? { ...item, [field]: value } : item
        )));
    };

    const handleAddWorkHour = () => {
        setWorkHoursDraft((prev) => [...prev, { start: '09:00', end: '18:00' }]);
    };

    const handleRemoveWorkHour = (index: number) => {
        setWorkHoursDraft((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSaveWorkHours = async () => {
        if (!calendarUserId || savingWorkHours) return;
        setSavingWorkHours(true);
        setError(null);
        try {
            const updated = await api.updateUser(calendarUserId, { workHours: workHoursDraft });
            setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)));
            setWorkHoursDraft(
                Array.isArray(updated.workHours)
                    ? updated.workHours.map((i) => ({ start: i.start, end: i.end }))
                    : [],
            );
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setSavingWorkHours(false);
        }
    };

    const isWeekendDate = (dateStr: string): boolean => {
        const [y, m, d] = dateStr.split('-').map(Number);
        const day = new Date(y, m - 1, d).getDay();
        return day === 0 || day === 6;
    };

    const scheduleStats = useMemo(() => {
        let weekdayCount = 0;
        let weekendCount = 0;
        workDays.forEach((dateStr) => {
            if (isWeekendDate(dateStr)) weekendCount += 1;
            else weekdayCount += 1;
        });
        const weekdayRate = Number(weekdaySalaryInput) || 0;
        const weekendRate = Number(weekendSalaryInput) || 0;
        const totalDays = weekdayCount + weekendCount;
        const totalPay = weekdayCount * weekdayRate + weekendCount * weekendRate;
        const remainingPay = Math.max(0, totalPay - paidTotal);
        return {
            weekdayCount,
            weekendCount,
            totalDays,
            totalPay,
            weekdayRate,
            weekendRate,
            paidAmount: paidTotal,
            remainingPay,
        };
    }, [workDays, weekdaySalaryInput, weekendSalaryInput, paidTotal]);

    const handleSaveSalaries = async () => {
        if (!calendarUserId || savingSalary) return;
        const weekdaySalary = Number(weekdaySalaryInput);
        const weekendSalary = Number(weekendSalaryInput);
        if (!Number.isFinite(weekdaySalary) || weekdaySalary < 0 || !Number.isFinite(weekendSalary) || weekendSalary < 0) {
            setError('Зарплата должна быть числом ≥ 0');
            return;
        }
        setSavingSalary(true);
        setError(null);
        try {
            const updated = await api.updateUser(calendarUserId, { weekdaySalary, weekendSalary });
            setUsers((prev) => prev.map((u) => (u.id === calendarUserId ? { ...u, ...updated } : u)));
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setSavingSalary(false);
        }
    };

    const handleAddPaidAmount = async () => {
        if (!calendarUserId || savingPaid) return;
        const paidAmount = Number(String(paidAmountInput).replace(/\s/g, '').replace(',', '.'));
        if (!Number.isFinite(paidAmount) || paidAmount <= 0) {
            setError('Введите сумму выплаты больше 0');
            return;
        }
        setSavingPaid(true);
        setError(null);
        try {
            applyMonthPay(await api.addUserMonthPayEntry(calendarUserId, calYear, calMonth, paidAmount));
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setSavingPaid(false);
        }
    };

    const handleDeletePaidAmount = async (entryId: string) => {
        if (!calendarUserId || savingPaid) return;
        if (!confirm('Удалить эту выплату?')) return;
        setSavingPaid(true);
        setError(null);
        try {
            applyMonthPay(await api.deleteUserMonthPayEntry(calendarUserId, entryId));
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setSavingPaid(false);
        }
    };

    const formatMoney = (n: number) =>
        `${Math.round(n).toLocaleString('ru-RU')} ₽`;

    const handleToggleDay = async (dateStr: string) => {
        if (!calendarUserId || togglingDay) return;
        setTogglingDay(dateStr);
        setError(null);
        try {
            const r = await api.toggleUserWorkDay(calendarUserId, dateStr);
            setWorkDays(prev => {
                const n = new Set(prev);
                r.working ? n.add(dateStr) : n.delete(dateStr);
                return n;
            });
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setTogglingDay(null);
        }
    };

    const canCreateUser =
        createForm.login.trim().length > 0
        && createForm.password.trim().length > 0
        && createForm.name.trim().length > 0
        && (createForm.role !== 'operator' || createForm.crmProjects.length > 0);

    const handleCreate = async () => {
        setCreateShowValidation(true);
        if (!createForm.login.trim() || !createForm.password.trim() || !createForm.name.trim()) {
            setError('Заполните логин, пароль и ФИО');
            return;
        }
        if (createForm.role === 'operator' && createForm.crmProjects.length === 0) {
            setError('Выберите оператору хотя бы один проект');
            return;
        }
        setError(null);
        setIsLoading(true);
        try {
            const phoneNorm = normalizePhone(createForm.phone);
            await api.createUser({
                ...createForm,
                phone: phoneNorm ? formatPhoneRu(phoneNorm) : createForm.phone.trim(),
            });
            setCreateForm({
                login: '', password: '', role: 'operator', name: '', email: '', phone: '', region: '', notes: '', novofonEmployeeIds: '',
                crmProjects: ['pest-control'],
                canViewOwnOrderHistory: false,
            });
            setCreateShowValidation(false);
            setShowCreate(false);
            await loadUsers();
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsLoading(false);
        }
    };

    const editPhoneValid =
        !editForm.phone.trim()
        || isPhoneRuComplete(editForm.phone)
        || normalizePhone(editForm.phone).length >= 11;

    const canUpdateUser =
        editForm.name.trim().length > 0
        && editPhoneValid
        && (users.find(user => user.id === editingId)?.role !== 'operator' || editForm.crmProjects.length > 0);

    const handleUpdate = async (id: string) => {
        setEditShowValidation(true);
        const editedUser = users.find(user => user.id === id);
        if (!editForm.name.trim()) {
            setError('Укажите ФИО');
            return;
        }
        if (!editPhoneValid) {
            setError('Введите телефон полностью или очистите поле');
            return;
        }
        if (editedUser?.role === 'operator' && editForm.crmProjects.length === 0) {
            setError('Выберите оператору хотя бы один проект');
            return;
        }
        setError(null);
        setIsLoading(true);
        try {
            const data: any = {
                name: editForm.name,
                email: editForm.email,
                phone: (() => {
                    const n = normalizePhone(editForm.phone);
                    return n ? formatPhoneRu(n) : editForm.phone.trim();
                })(),
                region: editForm.region,
                notes: editForm.notes,
                novofonEmployeeIds: editForm.novofonEmployeeIds,
            };
            if (editedUser?.role === 'operator') data.crmProjects = editForm.crmProjects;
            if (editedUser?.role === 'master') {
                data.canViewOwnOrderHistory = editForm.canViewOwnOrderHistory;
            }
            if (editForm.password) data.password = editForm.password;
            await api.updateUser(id, data);
            setEditingId(null);
            setEditShowValidation(false);
            await loadUsers();
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleActive = async (u: User) => {
        try {
            await api.updateUser(u.id, { isActive: !u.isActive });
            await loadUsers();
        } catch (err) {
            setError((err as Error).message);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Удалить пользователя навсегда?')) return;
        try {
            await api.deleteUser(id, true);
            await loadUsers();
        } catch (err) {
            setError((err as Error).message);
        }
    };

    const generateCalendarDays = () => {
        const firstDay = new Date(calYear, calMonth - 1, 1);
        let startDow = firstDay.getDay();
        startDow = startDow === 0 ? 6 : startDow - 1;
        const daysInMonth = new Date(calYear, calMonth, 0).getDate();
        const cells: (string | null)[] = [];
        for (let i = 0; i < startDow; i++) cells.push(null);
        for (let d = 1; d <= daysInMonth; d++) {
            cells.push(
                `${calYear}-${String(calMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
            );
        }
        return cells;
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Управление пользователями" size="lg">
            <div className="space-y-4">
                {error && (
                    <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm">
                        {error}
                    </div>
                )}

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-[180px]">
                        {searchQuery.replace(/\D/g, '').length >= 2 || searchQuery.trim().startsWith('+') ? (
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-gray-700">Поиск по телефону</label>
                                <PhoneRuInput
                                    value={searchQuery}
                                    onChange={setSearchQuery}
                                    className="py-2.5 text-sm"
                                />
                            </div>
                        ) : (
                            <Input
                                label="Поиск: имя или телефон"
                                placeholder="Имя или начните +7…"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                type="search"
                                autoComplete="off"
                            />
                        )}
                    </div>
                    <div className="relative">
                        <select
                            value={filterRole}
                            onChange={e => setFilterRole(e.target.value)}
                            className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm appearance-none cursor-pointer pr-8"
                        >
                            <option value="">Все роли</option>
                            {ROLE_OPTIONS.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={showInactive}
                            onChange={e => setShowInactive(e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                        Неактивные
                    </label>
                    <Button
                        onClick={() => {
                            setShowCreate(!showCreate);
                            if (showCreate) setCreateShowValidation(false);
                        }}
                        variant={showCreate ? 'secondary' : 'success'}
                        size="sm"
                    >
                        {showCreate ? 'Отмена' : '+ Добавить'}
                    </Button>
                </div>
                {searchQuery.trim() && (
                    <p className="text-xs text-gray-500">
                        Найдено: {filteredUsers.length} из {users.length}
                    </p>
                )}

                {/* Create Form */}
                {showCreate && (
                    <div className="bg-green-50 rounded-xl p-4 space-y-3 animate-fade-in">
                        <h4 className="font-medium text-green-900 text-sm">Новый пользователь</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <Input
                                label="Логин *"
                                placeholder="Логин"
                                value={createForm.login}
                                onChange={e => setCreateForm({ ...createForm, login: e.target.value })}
                                error={createShowValidation && !createForm.login.trim() ? REQUIRED_FIELD_ERROR : undefined}
                            />
                            <Input
                                label="Пароль *"
                                placeholder="Пароль"
                                type="password"
                                value={createForm.password}
                                onChange={e => setCreateForm({ ...createForm, password: e.target.value })}
                                error={createShowValidation && !createForm.password.trim() ? REQUIRED_FIELD_ERROR : undefined}
                            />
                            <Select
                                value={createForm.role}
                                onChange={e => setCreateForm({ ...createForm, role: e.target.value })}
                                options={ROLE_OPTIONS}
                            />
                        </div>
                        {createForm.role === 'operator' && (
                            <fieldset
                              className={`rounded-xl border bg-white p-3 ${
                                createShowValidation && createForm.crmProjects.length === 0
                                  ? 'border-red-400 ring-1 ring-red-200'
                                  : 'border-green-200'
                              }`}
                            >
                                <legend
                                  className={`px-1 text-xs font-medium ${
                                    createShowValidation && createForm.crmProjects.length === 0
                                      ? 'text-red-600'
                                      : 'text-gray-600'
                                  }`}
                                >
                                  Доступ к проектам *
                                </legend>
                                <div className="flex flex-wrap gap-4">
                                    {CRM_PROJECTS.map(project => (
                                        <label key={project.id} className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                                            <input
                                                type="checkbox"
                                                checked={createForm.crmProjects.includes(project.id)}
                                                onChange={event => setCreateForm({
                                                    ...createForm,
                                                    crmProjects: event.target.checked
                                                        ? [...createForm.crmProjects, project.id]
                                                        : createForm.crmProjects.filter(id => id !== project.id),
                                                })}
                                                className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                                            />
                                            <span>{project.icon} {project.shortName}</span>
                                        </label>
                                    ))}
                                </div>
                            </fieldset>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <Input
                                label="ФИО *"
                                placeholder="ФИО"
                                value={createForm.name}
                                onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                                error={createShowValidation && !createForm.name.trim() ? REQUIRED_FIELD_ERROR : undefined}
                            />
                            <Input
                                placeholder="Email"
                                type="email"
                                value={createForm.email}
                                onChange={e => setCreateForm({ ...createForm, email: e.target.value })}
                            />
                            <PhoneRuField
                                label="Телефон"
                                value={createForm.phone ? formatPhoneRu(createForm.phone) || createForm.phone : createForm.phone}
                                onChange={value => setCreateForm({ ...createForm, phone: value })}
                            />
                            {(createForm.role === 'operator' || createForm.role === 'admin') && (
                                <Input
                                    placeholder="Новофон ID"
                                    value={createForm.novofonEmployeeIds}
                                    onChange={e => setCreateForm({ ...createForm, novofonEmployeeIds: e.target.value })}
                                />
                            )}
                        </div>
                        {createForm.role === 'master' && (
                            <>
                                <Input
                                    placeholder="Район работы"
                                    value={createForm.region}
                                    onChange={e => setCreateForm({ ...createForm, region: e.target.value })}
                                />
                                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-700">
                                    <input
                                        type="checkbox"
                                        checked={createForm.canViewOwnOrderHistory}
                                        onChange={event => setCreateForm({
                                            ...createForm,
                                            canViewOwnOrderHistory: event.target.checked,
                                        })}
                                        className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                                    />
                                    Просмотр своих прошлых заявок
                                </label>
                            </>
                        )}
                        <Input
                            placeholder="Заметки"
                            value={createForm.notes}
                            onChange={e => setCreateForm({ ...createForm, notes: e.target.value })}
                        />
                        <Button
                            onClick={handleCreate}
                            variant="success"
                            disabled={isLoading}
                            className={submitButtonClass(canCreateUser)}
                        >
                            Создать
                        </Button>
                    </div>
                )}

                {/* User List */}
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                    {users.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            {isLoading ? 'Загрузка...' : 'Нет пользователей'}
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            Никого не найдено
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto touch-scroll">
                            {filteredUsers.map(u => (
                                <li key={u.id} className={!u.isActive ? 'opacity-50 bg-gray-50' : ''}>
                                    {editingId === u.id ? (
                                        /* ─── Edit mode ─── */
                                        <div className="p-3 space-y-2">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                <Input
                                                    label="ФИО *"
                                                    placeholder="ФИО"
                                                    value={editForm.name}
                                                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                                    error={editShowValidation && !editForm.name.trim() ? REQUIRED_FIELD_ERROR : undefined}
                                                    autoFocus
                                                />
                                                <Input
                                                    placeholder="Email"
                                                    type="email"
                                                    value={editForm.email}
                                                    onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                                                />
                                            </div>
                                            {u.role === 'operator' && (
                                                <fieldset className="rounded-xl border border-gray-200 p-3">
                                                    <legend className="px-1 text-xs font-medium text-gray-600">Доступ к проектам</legend>
                                                    <div className="flex flex-wrap gap-4">
                                                        {CRM_PROJECTS.map(project => (
                                                            <label key={project.id} className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={editForm.crmProjects.includes(project.id)}
                                                                    onChange={event => setEditForm({
                                                                        ...editForm,
                                                                        crmProjects: event.target.checked
                                                                            ? [...editForm.crmProjects, project.id]
                                                                            : editForm.crmProjects.filter(id => id !== project.id),
                                                                    })}
                                                                    className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                                                                />
                                                                <span>{project.icon} {project.shortName}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </fieldset>
                                            )}
                                            {u.role === 'master' && (
                                                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 p-3 text-sm text-gray-700">
                                                    <input
                                                        type="checkbox"
                                                        checked={editForm.canViewOwnOrderHistory}
                                                        onChange={event => setEditForm({
                                                            ...editForm,
                                                            canViewOwnOrderHistory: event.target.checked,
                                                        })}
                                                        className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                                                    />
                                                    Просмотр своих прошлых заявок
                                                </label>
                                            )}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                <PhoneRuField
                                                    label="Телефон"
                                                    value={editForm.phone ? formatPhoneRu(editForm.phone) || editForm.phone : editForm.phone}
                                                    onChange={value => setEditForm({ ...editForm, phone: value })}
                                                    error={
                                                        editShowValidation && editForm.phone.trim() && !editPhoneValid
                                                            ? REQUIRED_FIELD_ERROR
                                                            : undefined
                                                    }
                                                />
                                                {(u.role === 'operator' || u.role === 'admin') && (
                                                    <Input
                                                        placeholder="Новофон ID"
                                                        value={editForm.novofonEmployeeIds}
                                                        onChange={e => setEditForm({ ...editForm, novofonEmployeeIds: e.target.value })}
                                                    />
                                                )}
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                <Input
                                                    placeholder="Район"
                                                    value={editForm.region}
                                                    onChange={e => setEditForm({ ...editForm, region: e.target.value })}
                                                />
                                                <Input
                                                    placeholder="Новый пароль (необяз.)"
                                                    type="password"
                                                    value={editForm.password}
                                                    onChange={e => setEditForm({ ...editForm, password: e.target.value })}
                                                />
                                            </div>
                                            <Input
                                                placeholder="Заметки"
                                                value={editForm.notes}
                                                onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                                            />
                                            <div className="flex gap-2">
                                                <Button
                                                    onClick={() => handleUpdate(u.id)}
                                                    variant="success"
                                                    size="sm"
                                                    className={submitButtonClass(canUpdateUser)}
                                                    disabled={isLoading}
                                                >
                                                    Сохранить
                                                </Button>
                                                <Button
                                                    onClick={() => { setEditingId(null); setEditShowValidation(false); }}
                                                    variant="secondary"
                                                    size="sm"
                                                >
                                                    Отмена
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        /* ─── View mode ─── */
                                        <div className="p-3">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className={`w-2 h-2 rounded-full ${u.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                                                        <span className="font-medium text-gray-900">{u.name}</span>
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                                            {ROLE_LABELS[u.role]}
                                                        </span>
                                                        <span className="text-xs text-gray-400">@{u.login}</span>
                                                    </div>
                                                    <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-3">
                                                        {u.email && <span>✉️ {u.email}</span>}
                                                        {u.phone && <span>📱 {u.phone}</span>}
                                                        {u.region && <span>📍 {u.region}</span>}
                                                        {u.notes && <span>📝 {u.notes}</span>}
                                                        {u.role === 'operator' && CRM_PROJECTS
                                                            .filter(project => (u.crmProjects || ['pest-control']).includes(project.id))
                                                            .map(project => <span key={project.id}>{project.icon} {project.shortName}</span>)}
                                                        {u.role === 'master' && u.canViewOwnOrderHistory && (
                                                            <span>История заявок разрешена</span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                    {/* Calendar button (for masters and operators) */}
                                                    {(u.role === 'master' || u.role === 'operator') && (
                                                        <button
                                                            onClick={() => {
                                                                setCalendarUserId(calendarUserId === u.id ? null : u.id);
                                                                setCalDate(new Date());
                                                            }}
                                                            className={`p-2 rounded-lg transition-colors ${calendarUserId === u.id
                                                                    ? 'bg-blue-100 text-blue-600'
                                                                    : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                                                                }`}
                                                            title="Календарь"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                            </svg>
                                                        </button>
                                                    )}

                                                    {/* Edit */}
                                                    <button
                                                        onClick={() => {
                                                            setEditShowValidation(false);
                                                            setEditingId(u.id);
                                                            setEditForm({
                                                                name: u.name, email: u.email || '', phone: u.phone,
                                                                region: u.region, notes: u.notes, novofonEmployeeIds: u.novofonEmployeeIds || '', password: '',
                                                                crmProjects: u.crmProjects || ['pest-control'],
                                                                canViewOwnOrderHistory: u.canViewOwnOrderHistory || false,
                                                            });
                                                        }}
                                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                                        title="Редактировать"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    </button>

                                                    {/* Toggle active */}
                                                    <button
                                                        onClick={() => handleToggleActive(u)}
                                                        className={`p-2 rounded-lg transition-colors ${u.isActive
                                                                ? 'text-gray-400 hover:text-amber-600 hover:bg-amber-50'
                                                                : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                                                            }`}
                                                        title={u.isActive ? 'Деактивировать' : 'Активировать'}
                                                    >
                                                        {u.isActive ? (
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                                            </svg>
                                                        ) : (
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                        )}
                                                    </button>

                                                    {/* Delete (only inactive) */}
                                                    {!u.isActive && (
                                                        <button
                                                            onClick={() => handleDelete(u.id)}
                                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                                            title="Удалить навсегда"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Work Calendar (inline) */}
                                            {calendarUserId === u.id && (
                                                <div className="mt-3 bg-blue-50 rounded-xl p-4 animate-fade-in">
                                                    {u.role === 'operator' && (
                                                        <div className="mb-4 bg-white/80 border border-blue-100 rounded-xl p-3 space-y-2">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <div>
                                                                    <p className="text-sm font-semibold text-gray-900">Рабочие часы</p>
                                                                    <p className="text-xs text-gray-500">
                                                                        Для автодозвона в отмеченные дни календаря
                                                                    </p>
                                                                </div>
                                                                <Button
                                                                    type="button"
                                                                    variant="secondary"
                                                                    onClick={handleAddWorkHour}
                                                                    disabled={savingWorkHours}
                                                                >
                                                                    + Интервал
                                                                </Button>
                                                            </div>
                                                            {workHoursDraft.length === 0 ? (
                                                                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5">
                                                                    Интервалы не заданы — автодозвон на этого оператора не пойдёт
                                                                </p>
                                                            ) : (
                                                                workHoursDraft.map((interval, index) => (
                                                                    <div key={index} className="flex flex-wrap items-end gap-2">
                                                                        <div className="flex-1 min-w-[100px]">
                                                                            <label className="block text-xs font-medium text-gray-600 mb-1">С</label>
                                                                            <input
                                                                                type="time"
                                                                                value={interval.start}
                                                                                onChange={(e) => handleWorkHourChange(index, 'start', e.target.value)}
                                                                                className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-sm"
                                                                            />
                                                                        </div>
                                                                        <div className="flex-1 min-w-[100px]">
                                                                            <label className="block text-xs font-medium text-gray-600 mb-1">До</label>
                                                                            <input
                                                                                type="time"
                                                                                value={interval.end}
                                                                                onChange={(e) => handleWorkHourChange(index, 'end', e.target.value)}
                                                                                className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-sm"
                                                                            />
                                                                        </div>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleRemoveWorkHour(index)}
                                                                            className="px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg"
                                                                            title="Удалить интервал"
                                                                        >
                                                                            Удалить
                                                                        </button>
                                                                    </div>
                                                                ))
                                                            )}
                                                            <div className="flex justify-end pt-1">
                                                                <Button
                                                                    type="button"
                                                                    onClick={() => void handleSaveWorkHours()}
                                                                    disabled={savingWorkHours}
                                                                >
                                                                    {savingWorkHours ? 'Сохранение…' : 'Сохранить часы'}
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="flex items-center justify-between mb-3">
                                                        <button
                                                            onClick={() => setCalDate(new Date(calYear, calMonth - 2, 1))}
                                                            className="p-1.5 rounded-lg text-gray-500 hover:bg-white"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                                            </svg>
                                                        </button>
                                                        <span className="font-medium text-sm text-gray-900">
                                                            {MONTH_NAMES[calMonth - 1]} {calYear}
                                                        </span>
                                                        <button
                                                            onClick={() => setCalDate(new Date(calYear, calMonth, 1))}
                                                            className="p-1.5 rounded-lg text-gray-500 hover:bg-white"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                    <div className="grid grid-cols-7 gap-1 text-center">
                                                        {WEEKDAYS_SHORT.map(d => (
                                                            <div key={d} className="text-xs font-medium text-gray-500 py-1">{d}</div>
                                                        ))}
                                                        {generateCalendarDays().map((dateStr, i) => (
                                                            <div key={i}>
                                                                {dateStr ? (
                                                                    <button
                                                                        onClick={() => handleToggleDay(dateStr)}
                                                                        disabled={calLoading || Boolean(togglingDay)}
                                                                        className={`w-full aspect-square rounded-lg text-xs font-medium transition-all disabled:opacity-50
                                      ${workDays.has(dateStr)
                                                                                ? 'bg-green-500 text-white shadow-sm hover:bg-green-600'
                                                                                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'}
                                      ${dateStr === new Date().toISOString().split('T')[0] ? 'ring-2 ring-blue-400' : ''}`}
                                                                    >
                                                                        {parseInt(dateStr.split('-')[2])}
                                                                    </button>
                                                                ) : (
                                                                    <div />
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        <Input
                                                            label="Зарплата будний день"
                                                            type="number"
                                                            min={0}
                                                            step={100}
                                                            value={weekdaySalaryInput}
                                                            onChange={(e) => setWeekdaySalaryInput(e.target.value)}
                                                            onBlur={() => void handleSaveSalaries()}
                                                        />
                                                        <Input
                                                            label="Зарплата выходной день"
                                                            type="number"
                                                            min={0}
                                                            step={100}
                                                            value={weekendSalaryInput}
                                                            onChange={(e) => setWeekendSalaryInput(e.target.value)}
                                                            onBlur={() => void handleSaveSalaries()}
                                                        />
                                                    </div>

                                                    <div className="mt-3 bg-white/80 border border-blue-100 rounded-xl p-3 text-xs text-gray-700 space-y-1.5">
                                                        <div className="flex justify-between gap-2">
                                                            <span>Будни (пн–пт)</span>
                                                            <span className="font-medium">{scheduleStats.weekdayCount} дн. · {formatMoney(scheduleStats.weekdayCount * scheduleStats.weekdayRate)}</span>
                                                        </div>
                                                        <div className="flex justify-between gap-2">
                                                            <span>Выходные (сб–вс)</span>
                                                            <span className="font-medium">{scheduleStats.weekendCount} дн. · {formatMoney(scheduleStats.weekendCount * scheduleStats.weekendRate)}</span>
                                                        </div>
                                                        <div className="flex justify-between gap-2 pt-1.5 border-t border-blue-100">
                                                            <span className="font-semibold text-gray-900">Итого за месяц</span>
                                                            <span className="font-semibold text-gray-900">{scheduleStats.totalDays} дн. · {formatMoney(scheduleStats.totalPay)}</span>
                                                        </div>
                                                        <div className="pt-2">
                                                            <PayHistory
                                                                amount={paidAmountInput}
                                                                onAmountChange={setPaidAmountInput}
                                                                onAdd={() => void handleAddPaidAmount()}
                                                                onDelete={(id) => void handleDeletePaidAmount(id)}
                                                                payments={payEntries}
                                                                saving={savingPaid}
                                                                formatMoney={formatMoney}
                                                            />
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                    Выплачено
                                                                </label>
                                                                <div className="px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold text-gray-900">
                                                                    {formatMoney(scheduleStats.paidAmount)}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                    Осталось оплатить
                                                                </label>
                                                                <div className="px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold text-gray-900">
                                                                    {formatMoney(scheduleStats.remainingPay)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {(savingSalary || savingPaid) && (
                                                            <p className="text-blue-600">
                                                                {savingSalary ? 'Сохранение ставок…' : 'Сохранение оплаты…'}
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                                        <span className="flex items-center gap-1">
                                                            <span className="w-3 h-3 bg-green-500 rounded" /> Рабочий день
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-100">
                    <Button variant="secondary" onClick={onClose}>Закрыть</Button>
                </div>
            </div>
        </Modal>
    );
}
