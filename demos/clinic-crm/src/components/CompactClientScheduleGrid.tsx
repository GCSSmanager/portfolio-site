import { buildCompactScheduleGridHtml, type SchedulePrintPage } from "../lib/client-schedule-print";
import { schedulePrintPdfCss } from "../lib/client-schedule-print-styles";

interface Props {
  title: string;
  subtitle?: string;
  printPage: SchedulePrintPage;
  showClientName?: boolean;
  pageLabel?: string;
  emptyText?: string;
}

export function CompactClientScheduleGrid({
  title,
  subtitle,
  printPage,
  showClientName = false,
  pageLabel,
  emptyText = "Нет записей на выбранный период.",
}: Props) {
  const sheetHtml = buildCompactScheduleGridHtml({
    title,
    subtitle,
    printPage,
    showClientName,
    emptyText,
    preview: true,
  });

  return (
    <div className="rounded-2xl border border-line bg-panel shadow-card">
      <style>{schedulePrintPdfCss}</style>
      {pageLabel && (
        <div className="border-b border-line bg-surface/60 px-3 py-1 text-right text-[9px] font-medium text-ink-muted">
          {pageLabel}
        </div>
      )}
      <div className="overflow-x-auto p-2 sm:p-3">
        <div className="mx-auto w-max max-w-none" dangerouslySetInnerHTML={{ __html: sheetHtml }} />
      </div>
    </div>
  );
}
