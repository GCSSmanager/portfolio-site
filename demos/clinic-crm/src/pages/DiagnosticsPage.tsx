import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { eachDayOfInterval, format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { api } from "../lib/api";
import { resources } from "../lib/resources";
import { minToTime } from "../lib/format";
import type {
  Appointment,
  Client,
  DiagnosticDaySlots,
  DiagnosticPeriod,
  DiagnosticPeriodParticipantStatus,
  DiagnosticSlot,
  Employee,
  Room,
} from "../lib/types";
import { Button, Card, DatePicker, Empty, Field, Input, ListSkeleton, Modal, ModalFooter, Picker, SearchSelect } from "../components/ui";
import { ConflictNotice } from "../components/ConflictNotice";
import { mutationErrorMessage, useConfirm, useToast } from "../components/feedback";
import { useSubmitShortcut } from "../hooks/useSubmitShortcut";
import { useClientConflictOptions } from "../hooks/useClientConflictOptions";
import type { ScheduleConflict } from "../lib/conflicts";

const DURATION_OPTIONS = [15, 30, 45, 60, 75, 90, 120, 150, 180].map((value) => ({
  value: String(value),
  label: `${value} мин`,
}));

function formatPeriodRange(startDate: string, endDate: string) {
  const start = format(parseISO(startDate.slice(0, 10)), "dd.MM.yyyy");
  const end = format(parseISO(endDate.slice(0, 10)), "dd.MM.yyyy");
  return start === end ? start : `${start} — ${end}`;
}

function participantStatusToConflict(status: DiagnosticPeriodParticipantStatus | undefined): ScheduleConflict | null {
  if (!status || status.available) return null;
  return {
    kind: "employee_busy",
    title: status.detail ?? status.shortLabel,
    shortLabel: status.shortLabel,
    hint: status.detail ?? "",
    tone: "danger",
  };
}

function participantButtonClass(selected: boolean, conflict: ScheduleConflict | null, available: boolean) {
  if (selected) return "border-brand-soft bg-brand-light text-brand-dark font-medium";
  if (conflict) return "border-red-200 bg-red-50 text-red-700";
  if (available) return "border-emerald-200 bg-emerald-50/60 text-ink hover:border-emerald-300 hover:bg-emerald-50";
  return "border-line bg-panel text-ink hover:border-brand-soft hover:bg-brand-light/40";
}

function periodDays(period: DiagnosticPeriod) {
  return eachDayOfInterval({
    start: parseISO(period.startDate.slice(0, 10)),
    end: parseISO(period.endDate.slice(0, 10)),
  }).map((day) => format(day, "yyyy-MM-dd"));
}

export function DiagnosticsPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<DiagnosticPeriod | null>(null);
  const [creating, setCreating] = useState(false);
  const [slotDay, setSlotDay] = useState<string>("");
  const [bookingSlot, setBookingSlot] = useState<DiagnosticSlot | null>(null);
  const [newStartMin, setNewStartMin] = useState("540");

  const periodsQ = useQuery({
    queryKey: ["diagnostic-periods"],
    queryFn: () => resources.diagnosticPeriods.list() as Promise<DiagnosticPeriod[]>,
  });
  const employeesQ = useQuery({ queryKey: ["employees"], queryFn: () => resources.employees.list(false) });
  const roomsQ = useQuery({ queryKey: ["rooms"], queryFn: () => resources.rooms.list(false) });
  const clientsQ = useQuery({ queryKey: ["clients"], queryFn: () => resources.clients.list() as Promise<Client[]> });

  const selected = useMemo(
    () => (periodsQ.data ?? []).find((period) => period.id === selectedId) ?? null,
    [periodsQ.data, selectedId],
  );

  useEffect(() => {
    if (!selected) {
      setSlotDay("");
      return;
    }
    const days = periodDays(selected);
    setSlotDay((current) => (current && days.includes(current) ? current : days[0] ?? ""));
  }, [selected]);

  const slotsQ = useQuery({
    queryKey: ["diagnostic-slots", selected?.id, slotDay],
    queryFn: () => resources.diagnosticPeriods.slots(selected!.id, slotDay) as Promise<DiagnosticDaySlots>,
    enabled: !!selected && !!slotDay,
  });

  const bookingDayAppointmentsQ = useQuery({
    queryKey: ["appointments", slotDay],
    queryFn: async () => (await api.get<Appointment[]>(`/api/appointments?date=${slotDay}`)).data,
    enabled: !!bookingSlot && !!slotDay,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["diagnostic-periods"] });
    qc.invalidateQueries({ queryKey: ["diagnostic-slots"] });
    qc.invalidateQueries({ queryKey: ["appointments"] });
  };

  const savePeriod = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      if (editing) {
        return resources.diagnosticPeriods.update(editing.id, payload) as Promise<DiagnosticPeriod>;
      }
      return resources.diagnosticPeriods.create(payload) as Promise<DiagnosticPeriod>;
    },
    onSuccess: (period) => {
      refresh();
      setCreating(false);
      setEditing(null);
      setSelectedId(period.id);
      toast({ tone: "success", title: editing ? "Период обновлён" : "Период создан" });
    },
    onError: (e) => toast({ tone: "error", title: "Ошибка сохранения", message: mutationErrorMessage(e) }),
  });

  const removePeriod = useMutation({
    mutationFn: (id: string) => resources.diagnosticPeriods.remove(id),
    onSuccess: () => {
      refresh();
      setSelectedId(null);
      toast({ tone: "success", title: "Период удалён" });
    },
    onError: (e) => toast({ tone: "error", title: "Не удалось удалить", message: mutationErrorMessage(e) }),
  });

  const addInterval = useMutation({
    mutationFn: async () => {
      if (!selected || !slotDay) throw new Error("Нет периода");
      return resources.diagnosticPeriods.addInterval(selected.id, {
        date: slotDay,
        startMin: Number(newStartMin),
      });
    },
    onSuccess: () => {
      refresh();
      toast({ tone: "success", title: "Интервал добавлен" });
    },
    onError: (e) => toast({ tone: "error", title: "Не удалось добавить", message: mutationErrorMessage(e) }),
  });

  const copyIntervals = useMutation({
    mutationFn: async () => {
      if (!selected || !slotDay) throw new Error("Нет периода");
      return resources.diagnosticPeriods.copyIntervals(selected.id, { date: slotDay }) as Promise<{
        daysUpdated: number;
        created: number;
        skipped: number;
      }>;
    },
    onSuccess: (result) => {
      refresh();
      toast({
        tone: "success",
        title: "Интервалы скопированы",
        message: `Дней: ${result.daysUpdated}, слотов: ${result.created}${
          result.skipped ? `, пропущено: ${result.skipped}` : ""
        }`,
      });
    },
    onError: (e) => toast({ tone: "error", title: "Не удалось скопировать", message: mutationErrorMessage(e) }),
  });

  const removeInterval = useMutation({
    mutationFn: async (slot: DiagnosticSlot) => {
      if (!selected || !slotDay) throw new Error("Нет периода");
      await resources.diagnosticPeriods.removeInterval(selected.id, {
        date: slotDay,
        startMin: slot.startMin,
      });
    },
    onSuccess: () => {
      refresh();
      toast({ tone: "success", title: "Интервал удалён" });
    },
    onError: (e) => toast({ tone: "error", title: "Не удалось удалить интервал", message: mutationErrorMessage(e) }),
  });

  const bookSlot = useMutation({
    mutationFn: async ({ clientId, note }: { clientId: string; note: string }) => {
      if (!selected || !slotDay || !bookingSlot) throw new Error("Нет слота");
      return resources.diagnosticPeriods.book(selected.id, {
        date: slotDay,
        startMin: bookingSlot.startMin,
        clientId,
        note: note || null,
      });
    },
    onSuccess: () => {
      refresh();
      setBookingSlot(null);
      toast({ tone: "success", title: "Клиент записан на диагностику" });
    },
    onError: (e) => toast({ tone: "error", title: "Не удалось записать", message: mutationErrorMessage(e) }),
  });

  const unbookSlot = useMutation({
    mutationFn: async (slot: DiagnosticSlot) => {
      if (!selected || !slotDay) throw new Error("Нет слота");
      await resources.diagnosticPeriods.unbook(selected.id, { date: slotDay, startMin: slot.startMin });
    },
    onSuccess: () => {
      refresh();
      toast({ tone: "success", title: "Запись снята" });
    },
    onError: (e) => toast({ tone: "error", title: "Не удалось снять запись", message: mutationErrorMessage(e) }),
  });

  const confirmRemovePeriod = async () => {
    if (!editing && !selected) return;
    const period = editing ?? selected!;
    const ok = await confirm({
      title: "Удалить период диагностики?",
      message: "Все интервалы и записи клиентов будут удалены. Специалисты снова станут доступны в расписании.",
      confirmText: "Удалить",
      danger: true,
    });
    if (ok) {
      removePeriod.mutate(period.id, {
        onSuccess: () => {
          setEditing(null);
          setCreating(false);
        },
      });
    }
  };

  const confirmUnbook = async (slot: DiagnosticSlot) => {
    const ok = await confirm({
      title: "Снять запись со слота?",
      message: slot.clientName
        ? `${slot.clientName} будет убран из окна ${minToTime(slot.startMin)}.`
        : "Клиент будет убран из выбранного окна.",
      confirmText: "Снять",
      danger: true,
    });
    if (ok) unbookSlot.mutate(slot);
  };

  const confirmRemoveInterval = async (slot: DiagnosticSlot) => {
    if (!slot.free) {
      await confirmUnbook(slot);
      return;
    }
    const ok = await confirm({
      title: "Удалить интервал?",
      message: `Окно ${minToTime(slot.startMin)}–${minToTime(slot.endMin)} будет убрано из этого дня.`,
      confirmText: "Удалить",
      danger: true,
    });
    if (ok) removeInterval.mutate(slot);
  };

  const confirmCopyIntervals = async () => {
    if (!slotDay) return;
    const count = slotsQ.data?.slots.length ?? 0;
    const ok = await confirm({
      title: "Скопировать интервалы?",
      message: `${count} слот(ов) с ${format(parseISO(slotDay), "d MMMM", { locale: ru })} будут добавлены на все пн–чт периода. Пт, сб и вс пропускаются. Уже занятые окна не дублируются.`,
      confirmText: "Скопировать",
    });
    if (ok) copyIntervals.mutate();
  };

  const startOptions = useMemo(() => {
    const options = slotsQ.data?.startOptions ?? [];
    return options.map((option) => ({
      value: String(option.startMin),
      label: minToTime(option.startMin),
      disabled: !option.available,
      hint: option.available ? undefined : option.shortLabel,
    }));
  }, [slotsQ.data?.startOptions]);

  const selectedStartAvailable = startOptions.some(
    (option) => option.value === newStartMin && !option.disabled,
  );

  useEffect(() => {
    if (!startOptions.length) return;
    if (selectedStartAvailable) return;
    const firstFree = startOptions.find((option) => !option.disabled);
    if (firstFree) setNewStartMin(firstFree.value);
  }, [selectedStartAvailable, startOptions]);

  return (
    <>
      <header className="sticky top-16 z-20 border-b border-line bg-surface/80 px-4 py-3 backdrop-blur-md lg:top-0 lg:px-6 lg:py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight text-ink sm:text-xl">Диагностика</h1>
            <p className="mt-0.5 text-sm text-ink-muted">
              Комиссия, кабинет и интервалы приёма
            </p>
          </div>
          <Button
            className="!h-10 w-full shrink-0 !rounded-2xl sm:w-auto"
            onClick={() => {
              setEditing(null);
              setCreating(true);
            }}
          >
            + Период
          </Button>
        </div>
      </header>

      <div className="p-4 sm:p-6">
        {periodsQ.isLoading ? (
          <Card className="p-4"><ListSkeleton rows={6} /></Card>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-5">
            <Card className="overflow-hidden h-fit">
              {(periodsQ.data ?? []).length === 0 ? (
                <Empty text="Периодов диагностики пока нет" />
              ) : (
                <div className="divide-y divide-line">
                  {(periodsQ.data ?? []).map((period) => {
                    const active = period.id === selectedId;
                    return (
                      <button
                        key={period.id}
                        type="button"
                        onClick={() => setSelectedId(period.id)}
                        className={[
                          "w-full px-4 py-3.5 text-left transition-colors",
                          active ? "bg-brand-light/70" : "hover:bg-surface/70",
                        ].join(" ")}
                      >
                        <div className="text-sm font-semibold text-ink tabular-nums">
                          {formatPeriodRange(period.startDate, period.endDate)}
                        </div>
                        <div className="text-sm font-semibold text-brand-dark mt-0.5">{period.title}</div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {period.participants.map((p) => (
                            <span
                              key={p.employeeId}
                              className="rounded-full bg-panel px-2 py-0.5 text-[10px] font-medium text-ink-muted border border-line"
                            >
                              {p.employee.shortName}
                            </span>
                          ))}
                        </div>
                        <div className="mt-2 text-[11px] text-ink-muted">
                          {[period.room?.name, `${period.durationMin} мин`]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>

            <Card className="p-5 min-h-[420px]">
              {!selected ? (
                <Empty text="Выберите период или создайте новый" />
              ) : (
                <div className="space-y-5">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <h2 className="text-lg font-semibold text-ink">{selected.title}</h2>
                      <p className="text-sm text-ink-muted mt-0.5">
                        {formatPeriodRange(selected.startDate, selected.endDate)}
                        {selected.room?.name ? ` · ${selected.room.name}` : ""}
                        {` · ${selected.durationMin} мин`}
                      </p>
                      {selected.note && <p className="text-xs text-ink-muted mt-2">{selected.note}</p>}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" className="!h-9" onClick={() => { setCreating(false); setEditing(selected); }}>
                        Настройки
                      </Button>
                      <Button variant="ghost" className="!h-9 text-red-600" onClick={() => void confirmRemovePeriod()}>
                        Удалить
                      </Button>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                      <p className="text-xs font-medium text-ink-muted">День</p>
                      <Button
                        variant="ghost"
                        className="!h-8 !text-xs"
                        disabled={
                          copyIntervals.isPending ||
                          slotsQ.isLoading ||
                          (slotsQ.data?.slots.length ?? 0) === 0
                        }
                        onClick={() => void confirmCopyIntervals()}
                      >
                        Скопировать на пн–чт
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {periodDays(selected).map((day) => {
                        const active = day === slotDay;
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => setSlotDay(day)}
                            className={[
                              "rounded-2xl border px-3 py-1.5 text-xs font-medium tabular-nums transition-colors",
                              active
                                ? "border-brand-soft bg-brand-light text-brand-dark"
                                : "border-line bg-panel text-ink-muted hover:border-brand-soft hover:text-ink",
                            ].join(" ")}
                          >
                            {format(parseISO(day), "d MMM, EE", { locale: ru })}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-line bg-surface/50 p-3">
                    <p className="mb-2 text-xs font-medium text-ink-muted">Добавить интервал</p>
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
                      <div className="min-w-0 w-full sm:w-40">
                        <Field label="Начало">
                          <Picker
                            value={newStartMin}
                            onChange={setNewStartMin}
                            options={startOptions}
                            placeholder="Время…"
                          />
                        </Field>
                      </div>
                      <div className="text-sm tabular-nums text-ink-muted sm:pb-0.5">
                        → {minToTime(Number(newStartMin) + selected.durationMin)}
                      </div>
                      <Button
                        className="!h-9 w-full sm:w-auto"
                        disabled={
                          addInterval.isPending ||
                          !startOptions.length ||
                          !selectedStartAvailable
                        }
                        onClick={() => addInterval.mutate()}
                      >
                        + Интервал
                      </Button>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="text-xs font-medium text-ink-muted">Интервалы дня</p>
                      {slotsQ.isFetching && <span className="text-[10px] text-ink-muted">Обновление…</span>}
                    </div>

                    {slotsQ.isLoading ? (
                      <ListSkeleton rows={4} />
                    ) : (slotsQ.data?.slots.length ?? 0) === 0 ? (
                      <div className="rounded-2xl border border-line bg-surface/60 px-4 py-6 text-sm text-ink-muted text-center">
                        Интервалов пока нет — добавьте окна приёма выше
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {slotsQ.data!.slots.map((slot) => {
                          const free = slot.free;
                          return (
                            <div
                              key={slot.startMin}
                              className={[
                                "rounded-2xl border px-3 py-3 text-left",
                                free
                                  ? "border-emerald-200 bg-emerald-50/70"
                                  : "border-brand-soft bg-brand-light/80",
                              ].join(" ")}
                            >
                              <div className="text-sm font-semibold tabular-nums text-ink">
                                {minToTime(slot.startMin)}–{minToTime(slot.endMin)}
                              </div>
                              <div className={["text-[11px] mt-1 truncate", free ? "text-emerald-700" : "text-brand-dark"].join(" ")}>
                                {free ? "Свободно" : slot.clientName ?? "Занято"}
                              </div>
                              <div className="mt-2 flex flex-wrap gap-1">
                                {free ? (
                                  <Button
                                    type="button"
                                    className="!h-7 !px-2 !text-[11px]"
                                    onClick={() => setBookingSlot(slot)}
                                  >
                                    Записать
                                  </Button>
                                ) : (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    className="!h-7 !px-2 !text-[11px] text-red-600"
                                    disabled={unbookSlot.isPending}
                                    onClick={() => void confirmUnbook(slot)}
                                  >
                                    Снять
                                  </Button>
                                )}
                                {free && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    className="!h-7 !px-2 !text-[11px] text-ink-muted"
                                    disabled={removeInterval.isPending}
                                    onClick={() => void confirmRemoveInterval(slot)}
                                  >
                                    Убрать
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>

      <DiagnosticPeriodForm
        open={creating || !!editing}
        period={editing}
        employees={employeesQ.data ?? []}
        rooms={roomsQ.data ?? []}
        onClose={() => { setCreating(false); setEditing(null); }}
        onDelete={editing ? () => void confirmRemovePeriod() : undefined}
        onSave={(data) => savePeriod.mutate(data)}
        loading={savePeriod.isPending || removePeriod.isPending}
      />

      <BookDiagnosticSlotModal
        open={!!bookingSlot}
        slot={bookingSlot}
        clients={clientsQ.data ?? []}
        appointments={bookingDayAppointmentsQ.data ?? []}
        loading={bookSlot.isPending}
        onClose={() => setBookingSlot(null)}
        onSave={(data) => bookSlot.mutate(data)}
      />
    </>
  );
}

function BookDiagnosticSlotModal({
  open,
  slot,
  clients,
  appointments,
  loading,
  onClose,
  onSave,
}: {
  open: boolean;
  slot: DiagnosticSlot | null;
  clients: Client[];
  appointments: Appointment[];
  loading: boolean;
  onClose: () => void;
  onSave: (data: { clientId: string; note: string }) => void;
}) {
  const [clientId, setClientId] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    setClientId("");
    setNote("");
  }, [open, slot?.startMin]);

  const interval = useMemo(
    () =>
      slot
        ? { startMin: slot.startMin, endMin: slot.endMin }
        : { startMin: 0, endMin: 0 },
    [slot],
  );

  const { options: clientOptions, conflicts } = useClientConflictOptions({
    clients,
    interval,
    appointments: appointments.filter((item) => item.status !== "CANCELLED"),
  });

  const selectedConflict = clientId ? conflicts.get(clientId) ?? null : null;

  const submit = useCallback(() => {
    if (!clientId || loading || selectedConflict) return;
    onSave({ clientId, note });
  }, [clientId, loading, note, onSave, selectedConflict]);
  useSubmitShortcut({ enabled: open, onSubmit: submit });

  if (!slot) return null;

  return (
    <Modal
      open={open}
      title={`Запись · ${minToTime(slot.startMin)}–${minToTime(slot.endMin)}`}
      onClose={onClose}
    >
      <div className="space-y-4">
        <Field label="Клиент">
          <SearchSelect
            value={clientId}
            onChange={setClientId}
            options={clientOptions}
            placeholder="Найти клиента…"
            searchPlaceholder="Введите имя…"
          />
        </Field>
        {selectedConflict && <ConflictNotice conflict={selectedConflict} />}
        <Field label="Заметка">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Необязательно" />
        </Field>
        <ModalFooter
          onCancel={onClose}
          onSubmit={submit}
          submitText="Записать"
          submitDisabled={loading || !clientId || !!selectedConflict}
        />
      </div>
    </Modal>
  );
}

function DiagnosticPeriodForm({
  open,
  period,
  employees,
  rooms,
  onClose,
  onDelete,
  onSave,
  loading,
}: {
  open: boolean;
  period: DiagnosticPeriod | null;
  employees: Employee[];
  rooms: Room[];
  onClose: () => void;
  onDelete?: () => void;
  onSave: (data: Record<string, unknown>) => void;
  loading: boolean;
}) {
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [roomId, setRoomId] = useState("");
  const [durationMin, setDurationMin] = useState("45");
  const [note, setNote] = useState("");
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    if (!open) return;
    setApiError("");
    setTitle(period?.title ?? "");
    setStartDate(period?.startDate.slice(0, 10) ?? format(new Date(), "yyyy-MM-dd"));
    setEndDate(period?.endDate.slice(0, 10) ?? format(new Date(), "yyyy-MM-dd"));
    setParticipantIds(period?.participants.map((p) => p.employeeId) ?? []);
    setRoomId(period?.roomId ?? period?.room?.id ?? "");
    setDurationMin(String(period?.durationMin ?? 45));
    setNote(period?.note ?? "");
  }, [open, period]);

  const rangeError = endDate < startDate ? "Дата окончания не может быть раньше начала" : "";
  const rangeValid = !rangeError;

  const statusQ = useQuery({
    queryKey: ["diagnostic-period-participant-status", startDate, endDate, period?.id],
    queryFn: () =>
      resources.diagnosticPeriods.participantStatus({
        startDate,
        endDate,
        excludePeriodId: period?.id,
      }) as Promise<DiagnosticPeriodParticipantStatus[]>,
    enabled: open && rangeValid,
  });

  const statusByEmployee = useMemo(
    () => new Map((statusQ.data ?? []).map((status) => [status.employeeId, status])),
    [statusQ.data],
  );

  const employeeConflicts = useMemo(
    () =>
      new Map(
        employees.map((employee) => [
          employee.id,
          participantStatusToConflict(statusByEmployee.get(employee.id)),
        ]),
      ),
    [employees, statusByEmployee],
  );

  const selectedEmployeeConflict = participantIds.map((id) => employeeConflicts.get(id)).find(Boolean);
  const conflictError =
    rangeError ||
    selectedEmployeeConflict?.title ||
    (!roomId ? "Выберите кабинет" : "") ||
    (!durationMin ? "Укажите длительность" : "") ||
    apiError;

  const submit = useCallback(() => {
    if (loading || conflictError || !title || participantIds.length === 0 || !roomId || !durationMin) return;
    onSave({
      title,
      startDate,
      endDate,
      participantIds,
      roomId,
      durationMin: Number(durationMin),
      note: note || null,
    });
  }, [conflictError, durationMin, endDate, loading, note, onSave, participantIds, roomId, startDate, title]);
  useSubmitShortcut({ enabled: open, onSubmit: submit });

  const toggleParticipant = (id: string) => {
    if (employeeConflicts.get(id) && !participantIds.includes(id)) return;
    setParticipantIds((prev) => (
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    ));
    setApiError("");
  };

  return (
    <Modal open={open} title={period ? "Настройки периода" : "Новый период диагностики"} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Название">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например: Комплексная диагностика" />
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="С">
            <DatePicker value={startDate} onChange={setStartDate} />
          </Field>
          <Field label="По">
            <DatePicker value={endDate} onChange={setEndDate} />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Кабинет">
            <Picker
              value={roomId}
              onChange={setRoomId}
              options={rooms.map((room) => ({ value: room.id, label: room.name }))}
              placeholder="Выберите кабинет…"
            />
          </Field>
          <Field label="Длительность интервала">
            <Picker
              value={durationMin}
              onChange={setDurationMin}
              options={DURATION_OPTIONS}
              placeholder="Минуты…"
            />
          </Field>
        </div>

        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-xs font-medium text-ink-muted">Комиссия</p>
            {rangeValid && statusQ.isFetching && (
              <span className="text-[10px] text-ink-muted">Проверка…</span>
            )}
          </div>
          <p className="mb-2 text-[11px] text-ink-muted">
            Занятость записями не мешает — пересечения смотрите при добавлении слотов.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {employees.map((employee) => {
              const selected = participantIds.includes(employee.id);
              const status = statusByEmployee.get(employee.id);
              const conflict = employeeConflicts.get(employee.id);
              const disabled = !!conflict && !selected;
              const available = rangeValid && !!status?.available;
              const checking = rangeValid && statusQ.isFetching && !status;
              return (
                <button
                  key={employee.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleParticipant(employee.id)}
                  className={[
                    "rounded-2xl border px-3 py-2 text-left text-sm transition-all disabled:cursor-not-allowed",
                    participantButtonClass(selected, conflict ?? null, available),
                  ].join(" ")}
                >
                  <div className="truncate">{employee.shortName}</div>
                  {checking && <div className="text-[10px] text-ink-muted/60">проверка…</div>}
                  {!checking && conflict && (
                    <div className="text-[10px] text-red-600 truncate" title={status?.detail ?? conflict.title}>
                      {conflict.shortLabel}
                      {status?.detail ? ` · ${status.detail.split(" — ")[0]}` : ""}
                    </div>
                  )}
                  {!checking && !conflict && available && !selected && (
                    <div className="text-[10px] text-emerald-600">свободен</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <Field label="Заметка"><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Необязательно" /></Field>

        <ConflictNotice conflict={selectedEmployeeConflict ?? null} message={rangeError || apiError} />

        <ModalFooter
          onCancel={onClose}
          onSubmit={submit}
          submitDisabled={
            loading ||
            statusQ.isFetching ||
            !title ||
            participantIds.length === 0 ||
            !roomId ||
            !durationMin ||
            !!conflictError
          }
          onDelete={onDelete}
          deleteDisabled={loading}
        />
      </div>
    </Modal>
  );
}
