import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { parseISO } from "date-fns";
import { api } from "../lib/api";
import { resources } from "../lib/resources";
import { CompactClientScheduleGrid } from "./CompactClientScheduleGrid";
import {
  buildDayPrintPages,
  buildDaySchedulePdfPageHtml,
  dayScheduleSubtitle,
  dayScheduleTitle,
} from "../lib/day-schedule-print";
import { buildPdfFromHtmlPages, closePdfPreviewWindow, openPdfBlob, openPdfPreviewWindow } from "../lib/schedule-pdf";
import type { Absence, Appointment, DiagnosticPeriod, Employee } from "../lib/types";
import { Button, DatePicker, Field, Modal } from "./ui";
import { mutationErrorMessage } from "./feedback";

interface Props {
  open: boolean;
  initialDate: string;
  employees: Employee[];
  onClose: () => void;
}

export function DaySchedulePrintModal({ open, initialDate, employees, onClose }: Props) {
  const [printDate, setPrintDate] = useState(initialDate);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setPrintDate(initialDate);
    setError("");
  }, [open, initialDate]);

  const appointmentsQ = useQuery({
    queryKey: ["appointments", printDate],
    queryFn: async () => (await api.get<Appointment[]>(`/api/appointments?date=${printDate}`)).data,
    enabled: open && !!printDate,
  });

  const absencesQ = useQuery({
    queryKey: ["absences"],
    queryFn: () => resources.absences.list() as Promise<Absence[]>,
    enabled: open,
  });

  const diagnosticPeriodsQ = useQuery({
    queryKey: ["diagnostic-periods", printDate],
    queryFn: () => resources.diagnosticPeriods.list({ date: printDate }) as Promise<DiagnosticPeriod[]>,
    enabled: open && !!printDate,
  });

  const activeAppointments = useMemo(
    () => (appointmentsQ.data ?? []).filter((item) => item.status !== "CANCELLED"),
    [appointmentsQ.data],
  );

  const absencesForDay = useMemo(() => {
    if (!printDate) return [];
    const day = parseISO(printDate);
    return (absencesQ.data ?? []).filter((absence) => {
      const start = parseISO(absence.startDate.slice(0, 10));
      const end = parseISO(absence.endDate.slice(0, 10));
      return day >= start && day <= end;
    });
  }, [absencesQ.data, printDate]);

  const pages = useMemo(
    () =>
      buildDayPrintPages(
        employees,
        activeAppointments,
        printDate,
        absencesForDay,
        diagnosticPeriodsQ.data ?? [],
      ),
    [employees, activeAppointments, printDate, absencesForDay, diagnosticPeriodsQ.data],
  );

  const title = dayScheduleTitle(printDate);
  const subtitle = dayScheduleSubtitle(printDate, employees.length, activeAppointments.length);
  const loading =
    appointmentsQ.isLoading ||
    appointmentsQ.isFetching ||
    absencesQ.isLoading ||
    absencesQ.isFetching ||
    diagnosticPeriodsQ.isLoading ||
    diagnosticPeriodsQ.isFetching;

  const exportPdf = async () => {
    const previewWindow = openPdfPreviewWindow();
    setExporting(true);
    setError("");
    try {
      const htmlPages = pages.map((page, index) =>
        buildDaySchedulePdfPageHtml({
          title,
          subtitle: index === 0 ? subtitle : undefined,
          page,
          pageNumber: index + 1,
          totalPages: pages.length,
        }),
      );
      const blob = await buildPdfFromHtmlPages(htmlPages);
      await openPdfBlob(blob, `raspisanie-${printDate}.pdf`, previewWindow);
    } catch (err) {
      closePdfPreviewWindow(previewWindow);
      setError(mutationErrorMessage(err, "Не удалось экспортировать PDF"));
    } finally {
      setExporting(false);
    }
  };

  return (
    <Modal open={open} title="Печать дня" onClose={onClose} panelClassName="max-w-6xl">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div className="flex min-w-0 w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-end">
            <Field label="Дата">
              <div className="w-full sm:w-48">
                <DatePicker value={printDate} onChange={setPrintDate} />
              </div>
            </Field>
            <div className="min-w-0 sm:pb-0.5">
              <p className="truncate text-sm font-medium text-ink">{title}</p>
              <p className="mt-0.5 text-xs text-ink-muted">
                {loading ? "Загрузка…" : subtitle}
              </p>
            </div>
          </div>
          <Button className="w-full sm:w-auto" disabled={!employees.length || loading || exporting} onClick={exportPdf}>
            {exporting ? "Открываем…" : "Экспорт PDF"}
          </Button>
        </div>

        {error && (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
            {error}
          </p>
        )}

        {appointmentsQ.isError && (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
            Не удалось загрузить записи на выбранную дату.
          </p>
        )}

        {!employees.length ? (
          <div className="rounded-2xl border border-dashed border-line bg-surface/40 px-6 py-12 text-center text-sm text-ink-muted">
            Нет специалистов для печати.
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-sm text-ink-muted">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand border-t-transparent" />
            Готовим превью…
          </div>
        ) : (
          <div className="space-y-4">
            {pages.map((page, index) => (
              <CompactClientScheduleGrid
                key={`day-print-${printDate}-${index}`}
                title={title}
                subtitle={index === 0 ? subtitle : undefined}
                printPage={page}
                showClientName={false}
                pageLabel={`${index + 1} / ${pages.length}`}
              />
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
