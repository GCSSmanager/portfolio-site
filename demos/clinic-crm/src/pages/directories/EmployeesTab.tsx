import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { resources } from "../../lib/resources";
import type { AbsenceType, ClinicWorkDay, Employee, Room, Specialty, WorkShift } from "../../lib/types";
import { ABSENCE_LABELS, WEEKDAYS, minToTime, timeToMin } from "../../lib/format";
import { Button, Card, Checkbox, Empty, Field, Input, ListSkeleton, Modal, ModalFooter, SearchSelect, Table, Td, Th, TimePicker } from "../../components/ui";
import { mutationErrorMessage, useConfirm, useToast } from "../../components/feedback";
import { AbsenceFields } from "../../components/AbsenceFields";

function sortEmployees(employees: Employee[]) {
  return [...employees].sort((a, b) => {
    const aActive = a.isActive !== false;
    const bActive = b.isActive !== false;
    if (aActive !== bActive) return aActive ? -1 : 1;
    return a.shortName.localeCompare(b.shortName, "ru");
  });
}

const DEFAULT_SHIFTS: WorkShift[] = [
  { weekday: 1, startMin: 540, endMin: 1080, lunchStartMin: 780, lunchEndMin: 825 },
  { weekday: 2, startMin: 540, endMin: 1080, lunchStartMin: 780, lunchEndMin: 825 },
  { weekday: 3, startMin: 540, endMin: 1080, lunchStartMin: 780, lunchEndMin: 825 },
  { weekday: 4, startMin: 540, endMin: 1080, lunchStartMin: 780, lunchEndMin: 825 },
  { weekday: 5, startMin: 540, endMin: 1005, lunchStartMin: 780, lunchEndMin: 825 },
];

function defaultShiftsFromClinic(days: ClinicWorkDay[]): WorkShift[] {
  const openDays = days.filter((day) => day.isOpen);
  if (openDays.length === 0) return DEFAULT_SHIFTS;
  return openDays.map((day) => ({
    weekday: day.weekday,
    startMin: day.startMin,
    endMin: day.endMin,
    lunchStartMin: day.startMin < 780 && day.endMin > 825 ? 780 : null,
    lunchEndMin: day.startMin < 780 && day.endMin > 825 ? 825 : null,
  }));
}

function clinicErrorForShift(shift: WorkShift, clinicDays: ClinicWorkDay[]) {
  const clinicDay = clinicDays.find((day) => day.weekday === shift.weekday);
  if (!clinicDay || !clinicDay.isOpen) return "Клиника закрыта";
  if (shift.startMin < clinicDay.startMin || shift.endMin > clinicDay.endMin) {
    return `За границами клиники (${minToTime(clinicDay.startMin)}–${minToTime(clinicDay.endMin)})`;
  }
  return "";
}

function todayStr() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function EmployeesTab() {
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const { data = [], isLoading } = useQuery({
    queryKey: ["employees", "all"],
    queryFn: () => resources.employees.list(true) as Promise<Employee[]>,
  });
  const { data: clinicDays = [] } = useQuery({
    queryKey: ["clinic-work-days"],
    queryFn: () => resources.settings.clinicWorkDays() as Promise<ClinicWorkDay[]>,
  });
  const { data: rooms = [] } = useQuery({
    queryKey: ["rooms"],
    queryFn: () => resources.rooms.list(false) as Promise<Room[]>,
  });
  const { data: specialties = [] } = useQuery({
    queryKey: ["specialties"],
    queryFn: () => resources.specialties.list() as Promise<Specialty[]>,
  });
  const [editing, setEditing] = useState<Employee | null>(null);
  const [absenceFor, setAbsenceFor] = useState<Employee | null>(null);
  const [creating, setCreating] = useState(false);
  const rows = useMemo(() => sortEmployees(data), [data]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["employees"] });
    qc.invalidateQueries({ queryKey: ["absences"] });
    qc.invalidateQueries({ queryKey: ["appointments"] });
  };

  const save = useMutation({
    mutationFn: async (payload: { id?: string; data: Partial<Employee>; shifts?: WorkShift[] }) => {
      if (payload.id) {
        await resources.employees.update(payload.id, payload.data);
        if (payload.shifts) await resources.employees.saveShifts(payload.id, payload.shifts);
      } else {
        const created = await resources.employees.create(payload.data);
        await resources.employees.saveShifts(created.id, payload.shifts ?? DEFAULT_SHIFTS);
      }
    },
    onSuccess: (_, vars) => {
      invalidate();
      setEditing(null);
      setCreating(false);
      toast({ tone: "success", title: vars.id ? "Специалист обновлён" : "Специалист создан" });
    },
    onError: (e) => toast({ tone: "error", title: "Ошибка сохранения", message: mutationErrorMessage(e) }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => resources.employees.remove(id),
    onSuccess: () => { invalidate(); toast({ tone: "success", title: "Специалист удалён" }); },
    onError: (e) => toast({ tone: "error", title: "Не удалось удалить", message: mutationErrorMessage(e) }),
  });

  const restore = useMutation({
    mutationFn: (id: string) => resources.employees.update(id, { isActive: true }),
    onSuccess: () => { invalidate(); toast({ tone: "success", title: "Специалист восстановлен" }); },
    onError: (e) => toast({ tone: "error", title: "Не удалось восстановить", message: mutationErrorMessage(e) }),
  });

  const saveAbsence = useMutation({
    mutationFn: (data: Record<string, unknown>) => resources.absences.create(data),
    onSuccess: () => { invalidate(); setAbsenceFor(null); toast({ tone: "success", title: "Отсутствие добавлено" }); },
    onError: (e) => toast({ tone: "error", title: "Ошибка сохранения", message: mutationErrorMessage(e) }),
  });

  const toggleCalendar = useMutation({
    mutationFn: ({ id, showInCalendar }: { id: string; showInCalendar: boolean }) =>
      resources.employees.update(id, { showInCalendar }),
    onSuccess: () => {
      invalidate();
    },
    onError: (e) => toast({ tone: "error", title: "Не удалось обновить", message: mutationErrorMessage(e) }),
  });

  const confirmRemove = async (employee: Employee) => {
    const ok = await confirm({
      title: "Удалить специалиста?",
      message: `${employee.shortName} будет удалён из системы. Старые записи сохранятся, назначить его на новые нельзя. Можно будет восстановить.`,
      confirmText: "Удалить",
      danger: true,
    });
    if (ok) remove.mutate(employee.id);
  };

  if (isLoading) return <Card className="p-4"><ListSkeleton rows={8} /></Card>;

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button className="w-full sm:w-auto" onClick={() => setCreating(true)}>
          + Специалист
        </Button>
      </div>
      <Card>
        {rows.length === 0 ? (
          <Empty text="Нет специалистов" />
        ) : (
          <>
            <div className="space-y-3 p-3 md:hidden">
              {rows.map((e: Employee) => {
                const deleted = e.isActive === false;
                const schedule = e.workShifts?.length
                  ? e.workShifts.map((s) => WEEKDAYS.find((d) => d.value === s.weekday)?.label).filter(Boolean).join(", ")
                  : "—";
                return (
                  <div
                    key={e.id}
                    className={[
                      "rounded-2xl border p-3",
                      deleted ? "border-line bg-surface/20 opacity-70" : "border-line bg-surface/40",
                    ].join(" ")}
                  >
                    <div className="flex items-start gap-2">
                      <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: e.color }} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="truncate text-sm font-semibold text-ink">{e.fullName}</div>
                          {deleted && (
                            <span className="rounded-full border border-line bg-panel px-2 py-0.5 text-[10px] font-semibold text-ink-muted">
                              удалён
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 text-xs text-ink-muted">
                          {e.shortName}
                          {e.specialty?.name || e.position ? ` · ${e.specialty?.name || e.position}` : ""}
                        </div>
                        <div className="mt-1 text-xs text-ink-muted">
                          {e.defaultRoom?.name ?? "Без кабинета"} · {schedule}
                        </div>
                      </div>
                    </div>
                    {!deleted && (
                      <div className="mt-3">
                        <Checkbox
                          checked={e.showInCalendar !== false}
                          onChange={(checked) => toggleCalendar.mutate({ id: e.id, showInCalendar: checked })}
                          label="В календаре"
                          disabled={toggleCalendar.isPending}
                        />
                      </div>
                    )}
                    <div className="mt-3 flex flex-col gap-2">
                      {deleted ? (
                        <Button
                          variant="ghost"
                          className="!h-10 w-full !text-sm"
                          disabled={restore.isPending}
                          onClick={() => restore.mutate(e.id)}
                        >
                          Восстановить
                        </Button>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 gap-2">
                            <Button variant="ghost" className="!h-10 min-w-0 !text-sm" onClick={() => setAbsenceFor(e)}>
                              Отсутствие
                            </Button>
                            <Button variant="ghost" className="!h-10 min-w-0 !text-sm" onClick={() => setEditing(e)}>
                              Изменить
                            </Button>
                          </div>
                          <Button variant="danger" className="!h-10 w-full !text-sm" onClick={() => confirmRemove(e)}>
                            Удалить
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="hidden md:block">
              <Table>
                <thead>
                  <tr>
                    <Th>Имя</Th>
                    <Th>Кратко</Th>
                    <Th>Специальность</Th>
                    <Th>Кабинет</Th>
                    <Th>График</Th>
                    <Th>В календаре</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((e: Employee) => {
                    const deleted = e.isActive === false;
                    return (
                      <tr key={e.id} className={deleted ? "bg-surface/40 text-ink-muted" : "hover:bg-surface/60"}>
                        <Td>
                          <span className="inline-flex items-center gap-2">
                            {e.fullName}
                            {deleted && (
                              <span className="rounded-full border border-line bg-panel px-2 py-0.5 text-[10px] font-semibold text-ink-muted">
                                удалён
                              </span>
                            )}
                          </span>
                        </Td>
                        <Td>
                          <span className="inline-flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full" style={{ background: e.color }} />
                            {e.shortName}
                          </span>
                        </Td>
                        <Td className="text-ink-muted">{e.specialty?.name || e.position || "—"}</Td>
                        <Td className="text-ink-muted">{e.defaultRoom?.name ?? "—"}</Td>
                        <Td className="text-xs text-ink-muted">
                          {e.workShifts?.length
                            ? e.workShifts.map((s) => WEEKDAYS.find((d) => d.value === s.weekday)?.label).filter(Boolean).join(", ")
                            : "—"}
                        </Td>
                        <Td>
                          {!deleted && (
                            <Checkbox
                              checked={e.showInCalendar !== false}
                              onChange={(checked) => toggleCalendar.mutate({ id: e.id, showInCalendar: checked })}
                              disabled={toggleCalendar.isPending}
                            />
                          )}
                        </Td>
                        <Td className="space-x-2 whitespace-nowrap text-right">
                          {deleted ? (
                            <Button
                              variant="ghost"
                              className="!h-8 !px-3"
                              disabled={restore.isPending}
                              onClick={() => restore.mutate(e.id)}
                            >
                              Восстановить
                            </Button>
                          ) : (
                            <>
                              <Button variant="ghost" className="!h-8 !px-3" onClick={() => setAbsenceFor(e)}>
                                Отсутствие
                              </Button>
                              <Button variant="ghost" className="!h-8 !px-3" onClick={() => setEditing(e)}>
                                Изменить
                              </Button>
                              <Button variant="danger" className="!h-8 !px-3" onClick={() => confirmRemove(e)}>
                                Удалить
                              </Button>
                            </>
                          )}
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          </>
        )}
      </Card>

      <EmployeeForm
        open={creating || !!editing}
        employee={editing}
        clinicDays={clinicDays}
        rooms={rooms}
        specialties={specialties}
        onClose={() => { setCreating(false); setEditing(null); }}
        onSave={(data, shifts) => save.mutate({ id: editing?.id, data, shifts })}
        loading={save.isPending}
      />

      <QuickAbsenceForm
        employee={absenceFor}
        onClose={() => setAbsenceFor(null)}
        onSave={(data) => saveAbsence.mutate(data)}
        loading={saveAbsence.isPending}
      />
    </>
  );
}

function EmployeeForm({
  open, employee, clinicDays, rooms, specialties, onClose, onSave, loading,
}: {
  open: boolean;
  employee: Employee | null;
  clinicDays: ClinicWorkDay[];
  rooms: Room[];
  specialties: Specialty[];
  onClose: () => void;
  onSave: (data: Partial<Employee>, shifts: WorkShift[]) => void;
  loading: boolean;
}) {
  const [fullName, setFullName] = useState("");
  const [shortName, setShortName] = useState("");
  const [specialtyId, setSpecialtyId] = useState("");
  const [color, setColor] = useState("#52944d");
  const [defaultRoomId, setDefaultRoomId] = useState("");
  const [shifts, setShifts] = useState<WorkShift[]>(DEFAULT_SHIFTS);

  useEffect(() => {
    if (!open) return;
    setFullName(employee?.fullName ?? "");
    setShortName(employee?.shortName ?? "");
    setSpecialtyId(employee?.specialtyId ?? "");
    setColor(employee?.color ?? "#52944d");
    setDefaultRoomId(employee?.defaultRoomId ?? "");
    setShifts(employee?.workShifts?.length ? employee.workShifts : defaultShiftsFromClinic(clinicDays));
  }, [open, employee, clinicDays]);

  const updateShift = (weekday: number, field: "startMin" | "endMin", time: string) => {
    setShifts((prev) => {
      const existing = prev.find((s) => s.weekday === weekday);
      if (existing) {
        return prev.map((s) => (s.weekday === weekday ? { ...s, [field]: timeToMin(time) } : s));
      }
      return [...prev, { weekday, startMin: field === "startMin" ? timeToMin(time) : 540, endMin: field === "endMin" ? timeToMin(time) : 1080 }];
    });
  };

  const updateLunch = (weekday: number, enabled: boolean, field?: "lunchStartMin" | "lunchEndMin", time?: string) => {
    setShifts((prev) =>
      prev.map((s) => {
        if (s.weekday !== weekday) return s;
        if (!enabled) return { ...s, lunchStartMin: null, lunchEndMin: null };
        if (field && time) return { ...s, [field]: timeToMin(time) };
        return {
          ...s,
          lunchStartMin: s.lunchStartMin ?? 780,
          lunchEndMin: s.lunchEndMin ?? 825,
        };
      }),
    );
  };

  const toggleDay = (weekday: number, on: boolean) => {
    if (on) {
      const clinicDay = clinicDays.find((day) => day.weekday === weekday && day.isOpen);
      setShifts((prev) => (
        prev.some((s) => s.weekday === weekday)
          ? prev
          : [
              ...prev,
              {
                weekday,
                startMin: clinicDay?.startMin ?? 540,
                endMin: clinicDay?.endMin ?? (weekday === 5 ? 1005 : 1080),
                lunchStartMin: clinicDay && clinicDay.startMin < 780 && clinicDay.endMin > 825 ? 780 : null,
                lunchEndMin: clinicDay && clinicDay.startMin < 780 && clinicDay.endMin > 825 ? 825 : null,
              },
            ]
      ));
    } else {
      setShifts((prev) => prev.filter((s) => s.weekday !== weekday));
    }
  };

  const shiftErrors = shifts
    .map((shift) => clinicErrorForShift(shift, clinicDays))
    .filter(Boolean);

  return (
    <Modal open={open} title={employee ? "Редактировать специалиста" : "Новый специалист"} onClose={onClose}>
      <div className="space-y-4">
        <Field label="ФИО"><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Краткое имя"><Input value={shortName} onChange={(e) => setShortName(e.target.value)} placeholder="Иванов И." /></Field>
          <Field label="Цвет"><Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="!h-9 !p-1" /></Field>
        </div>
        <Field label="Специальность">
          <SearchSelect
            value={specialtyId}
            onChange={setSpecialtyId}
            placeholder="Без специальности"
            searchPlaceholder="Специальность…"
            options={[
              { value: "", label: "Без специальности" },
              ...specialties
                .filter((item) => item.isActive !== false || item.id === specialtyId)
                .map((item) => ({ value: item.id, label: item.name })),
            ]}
          />
        </Field>
        <Field label="Кабинет по умолчанию">
          <SearchSelect
            value={defaultRoomId}
            onChange={setDefaultRoomId}
            placeholder="Не указан"
            searchPlaceholder="Кабинет…"
            options={[
              { value: "", label: "Не указан" },
              ...rooms.map((room) => ({ value: room.id, label: room.name })),
            ]}
          />
        </Field>

        <div>
          <p className="text-xs font-medium text-ink-muted mb-2">График работы</p>
          <div className="space-y-2">
            {WEEKDAYS.map((d) => {
              const shift = shifts.find((s) => s.weekday === d.value);
              const clinicError = shift ? clinicErrorForShift(shift, clinicDays) : "";
              return (
                <div
                  key={d.value}
                  className={[
                    "flex flex-col gap-2 rounded-2xl border p-2 sm:grid sm:grid-cols-[48px_1fr] sm:gap-2",
                    clinicError ? "border-red-300 bg-red-50" : "border-line bg-surface/40",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-2 text-sm">
                    <Checkbox checked={!!shift} onChange={(checked) => toggleDay(d.value, checked)} label={d.label} />
                  </div>
                  {shift && (
                    <div className="min-w-0 space-y-2">
                      <div className="space-y-1.5">
                        <span className="text-[11px] text-ink-muted">Работа</span>
                        <div className="grid grid-cols-2 gap-2">
                          <TimePicker
                            value={minToTime(shift.startMin)}
                            invalid={!!clinicError}
                            onChange={(next) => updateShift(d.value, "startMin", next)}
                          />
                          <TimePicker
                            value={minToTime(shift.endMin)}
                            invalid={!!clinicError}
                            onChange={(next) => updateShift(d.value, "endMin", next)}
                          />
                        </div>
                        {clinicError && <p className="text-[11px] font-medium text-red-700">{clinicError}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <Checkbox
                          checked={shift.lunchStartMin != null && shift.lunchEndMin != null}
                          onChange={(checked) => updateLunch(d.value, checked)}
                          label={<span className="text-[11px] text-ink-muted">Обед</span>}
                        />
                        {shift.lunchStartMin != null && shift.lunchEndMin != null && (
                          <div className="grid grid-cols-2 gap-2">
                            <TimePicker
                              value={minToTime(shift.lunchStartMin)}
                              onChange={(next) => updateLunch(d.value, true, "lunchStartMin", next)}
                            />
                            <TimePicker
                              value={minToTime(shift.lunchEndMin)}
                              onChange={(next) => updateLunch(d.value, true, "lunchEndMin", next)}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <ModalFooter
          onCancel={onClose}
          onSubmit={() => onSave({
            fullName,
            shortName,
            specialtyId: specialtyId || null,
            color,
            defaultRoomId: defaultRoomId || null,
          }, shifts)}
          submitDisabled={loading || !fullName || !shortName || shiftErrors.length > 0}
        />
      </div>
    </Modal>
  );
}

function QuickAbsenceForm({
  employee,
  onClose,
  onSave,
  loading,
}: {
  employee: Employee | null;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => void;
  loading: boolean;
}) {
  const [type, setType] = useState<AbsenceType>("SICK");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [allDay, setAllDay] = useState(true);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [note, setNote] = useState("");
  const today = todayStr();
  const dateError =
    startDate && startDate < today
      ? "Нельзя указать прошедшую дату"
      : endDate && endDate < today
        ? "Нельзя указать прошедшую дату"
        : startDate && endDate && endDate < startDate
          ? "Дата окончания раньше даты начала"
          : "";

  useEffect(() => {
    if (!employee) return;
    const currentDate = todayStr();
    setType("SICK");
    setStartDate(currentDate);
    setEndDate(currentDate);
    setAllDay(true);
    setStartTime("09:00");
    setEndTime("18:00");
    setNote("");
  }, [employee]);

  return (
    <Modal open={!!employee} title={employee ? `Отсутствие · ${employee.shortName}` : "Отсутствие"} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Тип">
          <SearchSelect
            value={type}
            onChange={(value) => setType(value as AbsenceType)}
            options={[
              { value: "SICK", label: ABSENCE_LABELS.SICK },
              { value: "VACATION", label: ABSENCE_LABELS.VACATION },
              { value: "DAY_OFF", label: ABSENCE_LABELS.DAY_OFF },
              { value: "BUSINESS_TRIP", label: ABSENCE_LABELS.BUSINESS_TRIP },
              { value: "OTHER", label: ABSENCE_LABELS.OTHER },
            ]}
          />
        </Field>
        <AbsenceFields
          today={today}
          dateError={dateError}
          startDate={startDate}
          endDate={endDate}
          allDay={allDay}
          startTime={startTime}
          endTime={endTime}
          note={note}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onAllDayChange={setAllDay}
          onStartTimeChange={setStartTime}
          onEndTimeChange={setEndTime}
          onNoteChange={setNote}
        />
        <ModalFooter
          onCancel={onClose}
          onSubmit={() => employee && onSave({
            employeeId: employee.id,
            type,
            startDate,
            endDate,
            startMin: allDay ? null : timeToMin(startTime),
            endMin: allDay ? null : timeToMin(endTime),
            note: note || null,
          })}
          submitDisabled={loading || !employee || !startDate || !endDate || !!dateError}
        />
      </div>
    </Modal>
  );
}
