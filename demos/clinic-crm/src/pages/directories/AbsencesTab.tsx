import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { resources } from "../../lib/resources";
import type { Absence, AbsenceType, Employee } from "../../lib/types";
import { ABSENCE_LABELS, minToTime, timeToMin } from "../../lib/format";
import { Button, Card, Empty, Field, ListSkeleton, Modal, ModalFooter, Picker, SearchSelect, Table, Td, Th } from "../../components/ui";
import { mutationErrorMessage, useConfirm, useToast } from "../../components/feedback";
import { AbsenceFields } from "../../components/AbsenceFields";

function todayStr() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function periodLabel(a: Absence) {
  return `${format(parseISO(a.startDate.slice(0, 10)), "dd.MM.yyyy")} — ${format(parseISO(a.endDate.slice(0, 10)), "dd.MM.yyyy")}`;
}

function timeLabel(a: Absence) {
  return a.startMin != null && a.endMin != null ? `${minToTime(a.startMin)}–${minToTime(a.endMin)}` : "весь день";
}

export function AbsencesTab() {
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const { data = [], isLoading } = useQuery({ queryKey: ["absences"], queryFn: resources.absences.list });
  const { data: employees = [] } = useQuery({ queryKey: ["employees", "all"], queryFn: () => resources.employees.list() });
  const [editing, setEditing] = useState<Absence | null>(null);
  const [creating, setCreating] = useState(false);
  const [filterEmployeeId, setFilterEmployeeId] = useState("");
  const [filterType, setFilterType] = useState<AbsenceType | "">("");

  const rows = useMemo(() => {
    return [...data]
      .filter((absence) => !filterEmployeeId || absence.employeeId === filterEmployeeId)
      .filter((absence) => !filterType || absence.type === filterType)
      .sort((a, b) => {
        const byStart = b.startDate.slice(0, 10).localeCompare(a.startDate.slice(0, 10));
        if (byStart !== 0) return byStart;
        return b.endDate.slice(0, 10).localeCompare(a.endDate.slice(0, 10));
      });
  }, [data, filterEmployeeId, filterType]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["absences"] });

  const save = useMutation({
    mutationFn: (p: { id?: string; data: Record<string, unknown> }) =>
      p.id ? resources.absences.update(p.id, p.data) : resources.absences.create(p.data),
    onSuccess: (_, vars) => {
      invalidate();
      setEditing(null);
      setCreating(false);
      toast({ tone: "success", title: vars.id ? "Отсутствие обновлено" : "Отсутствие создано" });
    },
    onError: (e) => toast({ tone: "error", title: "Ошибка сохранения", message: mutationErrorMessage(e) }),
  });

  const remove = useMutation({
    mutationFn: resources.absences.remove,
    onSuccess: () => {
      invalidate();
      toast({ tone: "success", title: "Отсутствие удалено" });
    },
    onError: (e) => toast({ tone: "error", title: "Не удалось удалить", message: mutationErrorMessage(e) }),
  });

  const confirmRemove = async (absence: Absence) => {
    const ok = await confirm({
      title: "Удалить отсутствие?",
      message: absence.employee?.shortName ?? "Специалист",
      confirmText: "Удалить",
      danger: true,
    });
    if (ok) remove.mutate(absence.id);
  };

  if (isLoading) return <Card className="p-4"><ListSkeleton rows={6} /></Card>;

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:max-w-xl sm:flex-1">
          <Field label="Специалист">
            <SearchSelect
              value={filterEmployeeId}
              onChange={setFilterEmployeeId}
              options={[
                { value: "", label: "Все специалисты" },
                ...employees.map((employee: Employee) => ({ value: employee.id, label: employee.shortName })),
              ]}
              placeholder="Все специалисты"
              searchable={employees.length > 6}
            />
          </Field>
          <Field label="Тип">
            <Picker
              value={filterType}
              onChange={(value) => setFilterType(value as AbsenceType | "")}
              options={[
                { value: "", label: "Все типы" },
                ...Object.entries(ABSENCE_LABELS).map(([value, label]) => ({ value, label })),
              ]}
              placeholder="Все типы"
            />
          </Field>
        </div>
        <Button className="w-full sm:w-auto shrink-0" onClick={() => setCreating(true)}>
          + Отсутствие
        </Button>
      </div>
      <Card>
        {data.length === 0 ? (
          <Empty text="Нет отсутствий" />
        ) : rows.length === 0 ? (
          <Empty text="Нет отсутствий по выбранным фильтрам" />
        ) : (
          <>
            <div className="space-y-3 p-3 md:hidden">
              {rows.map((a: Absence) => (
                <div key={a.id} className="rounded-2xl border border-line bg-surface/40 p-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-ink">{a.employee?.shortName ?? "—"}</div>
                    <div className="mt-0.5 text-xs text-ink-muted">{ABSENCE_LABELS[a.type]}</div>
                    <div className="mt-1 text-xs text-ink-muted">
                      {periodLabel(a)} · {timeLabel(a)}
                    </div>
                    {a.note && <div className="mt-1 truncate text-xs text-ink-muted">{a.note}</div>}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button variant="ghost" className="!h-10 min-w-0 !text-sm" onClick={() => setEditing(a)}>
                      Изменить
                    </Button>
                    <Button variant="danger" className="!h-10 min-w-0 !text-sm" onClick={() => confirmRemove(a)}>
                      Удалить
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden md:block">
              <Table>
                <thead>
                  <tr>
                    <Th>Специалист</Th>
                    <Th>Тип</Th>
                    <Th>Период</Th>
                    <Th>Время</Th>
                    <Th>Заметка</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((a: Absence) => (
                    <tr key={a.id} className="hover:bg-surface/60">
                      <Td>{a.employee?.shortName ?? "—"}</Td>
                      <Td>{ABSENCE_LABELS[a.type]}</Td>
                      <Td className="whitespace-nowrap text-xs text-ink-muted">{periodLabel(a)}</Td>
                      <Td className="text-xs text-ink-muted">{timeLabel(a)}</Td>
                      <Td className="text-xs text-ink-muted">{a.note ?? "—"}</Td>
                      <Td className="space-x-2 text-right">
                        <Button variant="ghost" className="!h-8 !px-3" onClick={() => setEditing(a)}>
                          Изменить
                        </Button>
                        <Button variant="danger" className="!h-8 !px-3" onClick={() => confirmRemove(a)}>
                          Удалить
                        </Button>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </>
        )}
      </Card>
      <AbsenceForm
        open={creating || !!editing}
        item={editing}
        employees={employees}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSave={(data) => save.mutate({ id: editing?.id, data })}
        loading={save.isPending}
      />
    </>
  );
}

function AbsenceForm({
  open,
  item,
  employees,
  onClose,
  onSave,
  loading,
}: {
  open: boolean;
  item: Absence | null;
  employees: Employee[];
  onClose: () => void;
  onSave: (d: Record<string, unknown>) => void;
  loading: boolean;
}) {
  const [employeeId, setEmployeeId] = useState("");
  const [type, setType] = useState<AbsenceType>("SICK");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [allDay, setAllDay] = useState(true);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [note, setNote] = useState("");
  const [prevOpen, setPrevOpen] = useState(false);
  const today = todayStr();
  const dateError =
    startDate && startDate < today
      ? "Нельзя указать прошедшую дату"
      : endDate && endDate < today
        ? "Нельзя указать прошедшую дату"
        : startDate && endDate && endDate < startDate
          ? "Дата окончания раньше даты начала"
          : "";

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setEmployeeId(item?.employeeId ?? employees[0]?.id ?? "");
      setType(item?.type ?? "SICK");
      const currentDate = todayStr();
      setStartDate(item?.startDate?.slice(0, 10) ?? currentDate);
      setEndDate(item?.endDate?.slice(0, 10) ?? currentDate);
      const hasTime = item?.startMin != null && item?.endMin != null;
      setAllDay(!hasTime);
      setStartTime(hasTime ? minToTime(item!.startMin!) : "09:00");
      setEndTime(hasTime ? minToTime(item!.endMin!) : "18:00");
      setNote(item?.note ?? "");
    }
  }

  return (
    <Modal open={open} title={item ? "Редактировать отсутствие" : "Новое отсутствие"} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Специалист">
          <SearchSelect
            value={employeeId}
            onChange={setEmployeeId}
            options={employees.map((e) => ({ value: e.id, label: e.shortName }))}
            placeholder="Выберите специалиста"
          />
        </Field>
        <Field label="Тип">
          <Picker
            value={type}
            onChange={(v) => setType(v as AbsenceType)}
            options={Object.entries(ABSENCE_LABELS).map(([value, label]) => ({ value, label }))}
            placeholder="Выберите тип"
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
          onSubmit={() =>
            onSave({
              employeeId,
              type,
              startDate,
              endDate,
              startMin: allDay ? null : timeToMin(startTime),
              endMin: allDay ? null : timeToMin(endTime),
              note: note || null,
            })
          }
          submitDisabled={loading || !employeeId || !startDate || !endDate || !!dateError}
        />
      </div>
    </Modal>
  );
}
