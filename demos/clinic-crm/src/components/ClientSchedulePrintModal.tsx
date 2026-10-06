import { useEffect, useMemo, useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { api } from "../lib/api";
import {
  buildCompactPdfPageHtml,
  chunkDatesForPdfPages,
  groupEntriesByDate,
  sortedScheduleDates,
  type SchedulePrintPage,
} from "../lib/client-schedule-print";
import { buildPdfFromHtmlPages, closePdfPreviewWindow, openPdfBlob, openPdfPreviewWindow } from "../lib/schedule-pdf";
import type { Client, ClientScheduleEntry, ClientScheduleResponse } from "../lib/types";
import { CompactClientScheduleGrid } from "./CompactClientScheduleGrid";
import { Button, DatePicker, Field, Modal, SearchSelect } from "./ui";
import { mutationErrorMessage } from "./feedback";

interface Props {
  open: boolean;
  clients: Client[];
  initialDate: string;
  initialClientId?: string;
  initialStartDate?: string;
  initialEndDate?: string;
  lockClient?: boolean;
  onClose: () => void;
}

async function buildPdfBlob({
  title,
  subtitle,
  entries,
  showClientName,
}: {
  title: string;
  subtitle: string;
  entries: ClientScheduleEntry[];
  showClientName: boolean;
}) {
  const dates = sortedScheduleDates(entries);
  const byDate = groupEntriesByDate(entries);
  const pagePrintPages = chunkDatesForPdfPages(dates, byDate, showClientName);
  const htmlPages = pagePrintPages.map((printPage, index) =>
    buildCompactPdfPageHtml({
      title,
      subtitle: index === 0 ? subtitle : undefined,
      printPage,
      showClientName,
      page: index + 1,
      totalPages: pagePrintPages.length,
    }),
  );
  return buildPdfFromHtmlPages(htmlPages);
}

export function ClientSchedulePrintModal({
  open,
  clients,
  initialDate,
  initialClientId = "",
  initialStartDate,
  initialEndDate,
  lockClient = false,
  onClose,
}: Props) {
  const [clientId, setClientId] = useState(initialClientId);
  const [startDate, setStartDate] = useState(initialStartDate ?? initialDate);
  const [endDate, setEndDate] = useState(
    initialEndDate ?? format(addDays(parseISO(initialDate), 13), "yyyy-MM-dd"),
  );
  const [entries, setEntries] = useState<ClientScheduleEntry[]>([]);
  const [scheduleMeta, setScheduleMeta] = useState<ClientScheduleResponse | null>(null);
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);

  const selectedClient = clients.find((c) => c.id === clientId);

  const title = scheduleMeta?.isGroupSchedule && scheduleMeta.client.group
    ? scheduleMeta.client.group.name
    : selectedClient
      ? selectedClient.fullName
      : "Расписание клиента";
  const subtitle = scheduleMeta?.isGroupSchedule
    ? `${startDate} — ${endDate}`
    : `${startDate} — ${endDate}`;
  const showClientName = !!scheduleMeta?.isGroupSchedule;
  const printDates = sortedScheduleDates(entries);
  const pagePrintPages = useMemo(() => {
    if (!previewReady || !printDates.length) return [] as SchedulePrintPage[];
    return chunkDatesForPdfPages(printDates, groupEntriesByDate(entries), showClientName);
  }, [previewReady, printDates, entries, showClientName]);
  const dateError = startDate && endDate && endDate < startDate ? "Дата окончания раньше даты начала" : "";

  useEffect(() => {
    if (!open) return;
    setClientId(initialClientId);
    setStartDate(initialStartDate ?? initialDate);
    setEndDate(initialEndDate ?? format(addDays(parseISO(initialDate), 13), "yyyy-MM-dd"));
    setEntries([]);
    setScheduleMeta(null);
    setApiError("");
    setPreviewReady(false);
  }, [open, initialClientId, initialStartDate, initialEndDate, initialDate]);

  const loadPreview = async () => {
    if (!selectedClient || dateError) return;
    setLoading(true);
    setApiError("");
    try {
      const response = await api.get<ClientScheduleResponse>(`/api/clients/${selectedClient.id}/schedule`, {
        params: { startDate, endDate },
      });
      setScheduleMeta(response.data);
      setEntries(response.data.entries);
      setPreviewReady(true);
    } catch (error) {
      setEntries([]);
      setScheduleMeta(null);
      setPreviewReady(false);
      setApiError(mutationErrorMessage(error, "Не удалось сформировать расписание"));
    } finally {
      setLoading(false);
    }
  };

  const exportPdf = async () => {
    if (!entries.length) return;
    const previewWindow = openPdfPreviewWindow();
    setExporting(true);
    setApiError("");
    try {
      const blob = await buildPdfBlob({ title, subtitle, entries, showClientName });
      const safeName = (selectedClient?.fullName ?? "client").replace(/[^\p{L}\p{N}_-]+/gu, "_").slice(0, 40);
      await openPdfBlob(blob, `raspisanie-${safeName}.pdf`, previewWindow);
    } catch (error) {
      closePdfPreviewWindow(previewWindow);
      setApiError(mutationErrorMessage(error, "Не удалось экспортировать PDF"));
    } finally {
      setExporting(false);
    }
  };

  return (
    <Modal open={open} title="Расписание клиента" onClose={onClose} panelClassName="max-w-6xl w-full">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(220px,280px)_1fr]">
        <div className="min-w-0 space-y-4">
          <Field label="Клиент">
            {lockClient && selectedClient ? (
              <div className="flex h-9 items-center rounded-xl border border-line bg-surface px-3 text-sm text-ink">
                {selectedClient.fullName}
              </div>
            ) : (
              <SearchSelect
                value={clientId}
                onChange={(value) => {
                  setClientId(value);
                  setEntries([]);
                  setScheduleMeta(null);
                  setApiError("");
                  setPreviewReady(false);
                }}
                options={clients.map((c) => ({ value: c.id, label: c.fullName, hint: c.group?.name ?? undefined }))}
                placeholder="Выберите клиента…"
                searchPlaceholder="Введите имя…"
              />
            )}
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="С">
              <DatePicker
                value={startDate}
                onChange={(value) => {
                  setStartDate(value);
                  setScheduleMeta(null);
                  setApiError("");
                  setPreviewReady(false);
                }}
              />
            </Field>
            <Field label="По">
              <DatePicker
                value={endDate}
                onChange={(value) => {
                  setEndDate(value);
                  setScheduleMeta(null);
                  setApiError("");
                  setPreviewReady(false);
                }}
                invalid={!!dateError}
              />
            </Field>
          </div>
          {dateError && <p className="text-xs font-medium text-red-600">{dateError}</p>}
          {apiError && <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{apiError}</p>}


          <div className="flex gap-2 flex-wrap">
            <Button disabled={!clientId || !!dateError || loading} onClick={loadPreview}>
              {loading ? "Готовим…" : "Сформировать"}
            </Button>
            <Button variant="ghost" disabled={!clientId || !previewReady || exporting} onClick={exportPdf}>
              {exporting ? "Открываем…" : "Экспорт PDF"}
            </Button>
          </div>
        </div>

        <div className="min-h-[480px] overflow-auto">
          {!previewReady ? (
            <div className="flex h-full min-h-[480px] items-center justify-center rounded-2xl border border-dashed border-line bg-surface/30 p-8 text-center text-sm text-ink-muted">
              Выберите клиента и сформируйте превью.
            </div>
          ) : pagePrintPages.length === 0 ? (
            <div className="flex h-full min-h-[480px] items-center justify-center rounded-2xl border border-dashed border-line bg-surface/30 p-8 text-center text-sm text-ink-muted">
              Нет записей на выбранный период.
            </div>
          ) : (
            <div className="space-y-4">
              {pagePrintPages.map((printPage, index) => (
                <CompactClientScheduleGrid
                  key={`page-${index + 1}`}
                  title={title}
                  subtitle={index === 0 && scheduleMeta?.isGroupSchedule ? scheduleMeta.clients.map((c) => c.fullName).join(", ") : index === 0 ? subtitle : undefined}
                  printPage={printPage}
                  showClientName={showClientName}
                  pageLabel={`${index + 1} / ${pagePrintPages.length}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
