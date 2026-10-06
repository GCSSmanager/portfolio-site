import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mutationErrorMessage, useToast } from "./feedback";
import { Button, Card, Checkbox, TimePicker } from "./ui";
import { resources } from "../lib/resources";
import type { ClinicWorkDay } from "../lib/types";
import { WEEKDAYS, minToTime, timeToMin } from "../lib/format";

function validateClinicDay(day: ClinicWorkDay) {
  if (!day.isOpen) return "";
  if (day.endMin <= day.startMin) return "Конец должен быть позже начала";
  return "";
}

export function ClinicHoursCard({
  days,
  loading,
  saving,
  error,
  onSave,
}: {
  days: ClinicWorkDay[];
  loading: boolean;
  saving: boolean;
  error?: boolean;
  onSave: (days: ClinicWorkDay[]) => void;
}) {
  const [draft, setDraft] = useState<ClinicWorkDay[]>([]);

  useEffect(() => {
    if (!loading && days.length > 0) {
      setDraft(days.map((day) => ({ ...day })));
    }
  }, [days, loading]);

  const updateDay = (weekday: number, patch: Partial<ClinicWorkDay>) => {
    setDraft((prev) => prev.map((day) => (day.weekday === weekday ? { ...day, ...patch } : day)));
  };

  const errors = draft.map(validateClinicDay).filter(Boolean);

  return (
    <Card className="p-4 sm:p-6">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-ink">Время работы клиники</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Смены специалистов нельзя будет сохранить за пределами этих часов.
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-ink-muted">Загрузка графика…</div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Не удалось загрузить график клиники.
        </div>
      ) : draft.length === 0 ? (
        <div className="text-sm text-ink-muted">Нет данных графика.</div>
      ) : (
        <div className="space-y-2">
          {WEEKDAYS.map((weekday) => {
            const day = draft.find((item) => item.weekday === weekday.value);
            if (!day) return null;
            const dayError = validateClinicDay(day);

            return (
              <div
                key={weekday.value}
                className={[
                  "flex flex-col gap-3 rounded-2xl border p-3 sm:grid sm:grid-cols-[56px_minmax(0,110px)_1fr] sm:items-center sm:gap-3",
                  dayError ? "border-red-300 bg-red-50" : "border-line bg-surface/40",
                ].join(" ")}
              >
                <div className="flex items-center justify-between gap-3 sm:contents">
                  <div className="text-sm font-medium text-ink">{weekday.label}</div>
                  <Checkbox
                    checked={day.isOpen}
                    onChange={(checked) => updateDay(day.weekday, { isOpen: checked })}
                    label="открыто"
                  />
                </div>
                <div className="min-w-0 space-y-1.5">
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                    <div className="min-w-0 sm:w-40">
                      <TimePicker
                        value={minToTime(day.startMin)}
                        disabled={!day.isOpen}
                        invalid={!!dayError}
                        onChange={(next) => updateDay(day.weekday, { startMin: timeToMin(next) })}
                      />
                    </div>
                    <span className="hidden text-ink-muted sm:inline">—</span>
                    <div className="min-w-0 sm:w-40">
                      <TimePicker
                        value={minToTime(day.endMin)}
                        disabled={!day.isOpen}
                        invalid={!!dayError}
                        onChange={(next) => updateDay(day.weekday, { endMin: timeToMin(next) })}
                      />
                    </div>
                  </div>
                  {dayError && <span className="text-xs font-medium text-red-700">{dayError}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-5 flex justify-end">
        <Button
          className="w-full sm:w-auto"
          disabled={saving || loading || !!error || draft.length !== 7 || errors.length > 0}
          onClick={() => onSave(draft)}
        >
          {saving ? "Сохраняем…" : "Сохранить график клиники"}
        </Button>
      </div>
    </Card>
  );
}

export function ClinicHoursPanel() {
  const toast = useToast();
  const qc = useQueryClient();
  const clinicQ = useQuery({
    queryKey: ["clinic-work-days"],
    queryFn: () => resources.settings.clinicWorkDays() as Promise<ClinicWorkDay[]>,
  });
  const saveClinic = useMutation({
    mutationFn: (days: ClinicWorkDay[]) => resources.settings.saveClinicWorkDays(days),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clinic-work-days"] });
      toast({ tone: "success", title: "График клиники обновлен" });
    },
    onError: (e) => toast({ tone: "error", title: "Не удалось сохранить график клиники", message: mutationErrorMessage(e) }),
  });

  return (
    <ClinicHoursCard
      days={clinicQ.data ?? []}
      loading={clinicQ.isLoading}
      saving={saveClinic.isPending}
      error={clinicQ.isError}
      onSave={(days) => saveClinic.mutate(days)}
    />
  );
}
