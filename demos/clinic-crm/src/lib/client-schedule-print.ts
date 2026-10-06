import { format, parseISO } from "date-fns";
import {
  schedulePrintFontFamily,
  schedulePrintPdfCss,
  schedulePrintTheme,
  SCHEDULE_PRINT_APPOINTMENT_HEIGHT,
  SCHEDULE_PRINT_CELL_BODY_HEIGHT,
  SCHEDULE_PRINT_CELL_SAFETY_PX,
  SCHEDULE_PRINT_COLS,
  SCHEDULE_PRINT_FOOTER_BOTTOM,
  SCHEDULE_PRINT_GRID_ROWS,
  SCHEDULE_PRINT_PAGE_HEIGHT,
  SCHEDULE_PRINT_PAGE_PAD_BOTTOM,
  SCHEDULE_PRINT_PAGE_WIDTH,
  SCHEDULE_PRINT_SHEET_WIDTH,
  SCHEDULE_PRINT_SLOTS_PER_PAGE,
} from "./client-schedule-print-styles";
import type { ClientScheduleEntry } from "./types";
import { minToTime } from "./format";

export const COMPACT_DAYS_PER_ROW = SCHEDULE_PRINT_COLS;
export {
  SCHEDULE_PRINT_CELL_BODY_HEIGHT,
  SCHEDULE_PRINT_CELL_DATE_HEIGHT,
  SCHEDULE_PRINT_CELL_WIDTH,
  SCHEDULE_PRINT_COL_WIDTH,
  SCHEDULE_PRINT_COLS,
  SCHEDULE_PRINT_GRID_ROWS,
  SCHEDULE_PRINT_GRID_AREA_HEIGHT,
  SCHEDULE_PRINT_ROW_HEIGHT,
} from "./client-schedule-print-styles";
export const SCHEDULE_PRINT_FOOTER = "CRM";
export { SCHEDULE_PRINT_PAGE_WIDTH, SCHEDULE_PRINT_PAGE_HEIGHT };
export const SCHEDULE_PRINT_PDF_WIDTH = 841.89;
export const SCHEDULE_PRINT_PDF_HEIGHT = 595.28;

export interface SchedulePrintColumn {
  /** Ключ для объединения соседних колонок (дата или id специалиста). */
  date: string;
  appointments: ClientScheduleEntry[];
  /** Подпись шапки; если нет — форматируется date как dd.MM.yyyy. */
  label?: string;
  /** Весь день отсутствует — серый столбец с подписью по центру. */
  fullDayAbsenceLabel?: string;
  /** День диагностики — как отсутствие (штриховка); записи (брони) остаются в колонке. */
  fullDayDiagnosticLabel?: string;
}

export interface SchedulePrintRow {
  columns: SchedulePrintColumn[];
}

export interface SchedulePrintPage {
  rows: SchedulePrintRow[];
}

export function shortDisplayDate(date: string) {
  return format(parseISO(date.slice(0, 10)), "dd.MM.yyyy");
}

export function groupEntriesByDate(entries: ClientScheduleEntry[]) {
  const map = new Map<string, ClientScheduleEntry[]>();
  for (const entry of entries) {
    const list = map.get(entry.date) ?? [];
    list.push(entry);
    map.set(entry.date, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.startMin - b.startMin);
  }
  return map;
}

export function sortedScheduleDates(entries: ClientScheduleEntry[]) {
  return [...new Set(entries.map((entry) => entry.date))].sort();
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderAppointmentMeta(entry: ClientScheduleEntry, showClientName: boolean) {
  const parts: string[] = [];
  if (entry.kind === "absence") {
    if (entry.specialist) parts.push(entry.specialist);
  } else {
    parts.push(entry.specialist);
    if (entry.room) parts.push(entry.room);
    if (showClientName) parts.push(entry.clientName);
  }
  return parts.map((part) => escapeHtml(part)).join(" · ");
}

function renderAppointmentCellHtml(entry: ClientScheduleEntry, showClientName: boolean) {
  const timeLabel =
    entry.kind === "absence"
      ? `${minToTime(entry.startMin)}–${minToTime(entry.endMin)}`
      : minToTime(entry.startMin);
  const meta = renderAppointmentMeta(entry, showClientName);
  const cellClass = entry.kind === "absence" ? "cell is-absence" : "cell";
  return `
    <div class="${cellClass}">
      <div class="time">${timeLabel}</div>
      <div class="title">${escapeHtml(entry.title)}</div>
      ${meta ? `<div class="meta">${meta}</div>` : ""}
    </div>
  `;
}

/** Сколько записей влезает в одну ячейку — с запасом, чтобы в печати не обрезало. */
export function appointmentsPerColumn() {
  const usable = SCHEDULE_PRINT_CELL_BODY_HEIGHT - SCHEDULE_PRINT_CELL_SAFETY_PX;
  return Math.max(1, Math.floor(usable / SCHEDULE_PRINT_APPOINTMENT_HEIGHT));
}

export function splitDayIntoColumns(items: ClientScheduleEntry[]) {
  const perCol = appointmentsPerColumn();
  if (!items.length) return [[]] as ClientScheduleEntry[][];
  const chunks: ClientScheduleEntry[][] = [];
  for (let i = 0; i < items.length; i += perCol) {
    chunks.push(items.slice(i, i + perCol));
  }
  return chunks;
}

export function packColumnsIntoPages(columns: SchedulePrintColumn[]) {
  const pages: SchedulePrintPage[] = [];
  let slot = 0;
  let page: SchedulePrintPage = {
    rows: Array.from({ length: SCHEDULE_PRINT_GRID_ROWS }, () => ({ columns: [] })),
  };

  const flush = () => {
    if (page.rows.some((row) => row.columns.length > 0)) pages.push(page);
    page = {
      rows: Array.from({ length: SCHEDULE_PRINT_GRID_ROWS }, () => ({ columns: [] })),
    };
    slot = 0;
  };

  for (const column of columns) {
    if (slot >= SCHEDULE_PRINT_SLOTS_PER_PAGE) flush();
    const rowIndex = Math.floor(slot / SCHEDULE_PRINT_COLS);
    page.rows[rowIndex]!.columns.push(column);
    slot += 1;
  }

  if (page.rows.some((row) => row.columns.length > 0)) pages.push(page);
  return pages;
}

export function packDatesIntoPrintPages(
  dates: string[],
  byDate: Map<string, ClientScheduleEntry[]>,
  _showClientName = false,
) {
  const columns: SchedulePrintColumn[] = [];

  for (const date of dates) {
    const items = byDate.get(date);
    if (!items?.length) continue;
    for (const chunk of splitDayIntoColumns(items)) {
      columns.push({ date, appointments: chunk });
    }
  }

  return packColumnsIntoPages(columns);
}

export function chunkDatesForPdfPages(
  dates: string[],
  byDate: Map<string, ClientScheduleEntry[]>,
  showClientName = false,
) {
  return packDatesIntoPrintPages(dates, byDate, showClientName);
}

function renderRowHeaderCells(row: SchedulePrintRow) {
  const parts: string[] = [];
  let index = 0;

  while (index < SCHEDULE_PRINT_COLS) {
    const col = row.columns[index];
    if (!col) {
      parts.push(`<div class="day-head is-empty"> </div>`);
      index += 1;
      continue;
    }

    const date = col.date;
    let span = 1;
    while (index + span < row.columns.length && row.columns[index + span]?.date === date) {
      span += 1;
    }
    const headLabel = col.label ?? shortDisplayDate(date);
    parts.push(
      `<div class="day-head" style="grid-column: span ${span}">${escapeHtml(headLabel)}</div>`,
    );
    index += span;
  }

  return parts.join("");
}

function renderPrintRowHtml(row: SchedulePrintRow, showClientName: boolean) {
  const headers = renderRowHeaderCells(row);
  const columns = Array.from({ length: SCHEDULE_PRINT_COLS }, (_, index) => {
    const col = row.columns[index];
    if (!col) return `<div class="day-col"></div>`;
    if (col.fullDayAbsenceLabel) {
      const compact =
        col.fullDayAbsenceLabel.length <= 14 && !/\s/.test(col.fullDayAbsenceLabel.trim());
      return `
        <div class="day-col is-absent">
          <div class="day-absent-label${compact ? "" : " is-note"}">${escapeHtml(col.fullDayAbsenceLabel)}</div>
        </div>
      `;
    }
    const cells = col.appointments.map((item) => renderAppointmentCellHtml(item, showClientName)).join("");
    if (col.fullDayDiagnosticLabel) {
      if (!cells) {
        const compact =
          col.fullDayDiagnosticLabel.length <= 14 && !/\s/.test(col.fullDayDiagnosticLabel.trim());
        return `
          <div class="day-col is-diagnostic is-diagnostic-empty">
            <div class="day-absent-label${compact ? "" : " is-note"}">${escapeHtml(col.fullDayDiagnosticLabel)}</div>
          </div>
        `;
      }
      return `<div class="day-col is-diagnostic">${cells}</div>`;
    }
    return `<div class="day-col">${cells}</div>`;
  }).join("");

  return `
    <div class="schedule-row">
      <div class="schedule-row-head">${headers}</div>
      <div class="schedule-row-body">${columns}</div>
    </div>
  `;
}

function renderPrintPageHtml(page: SchedulePrintPage, showClientName: boolean) {
  return page.rows
    .filter((row) => row.columns.length > 0)
    .map((row) => renderPrintRowHtml(row, showClientName))
    .join("");
}

export function buildCompactScheduleGridHtml({
  title,
  subtitle,
  printPage,
  showClientName,
  emptyText = "Нет записей",
  preview = false,
}: {
  title: string;
  subtitle?: string;
  printPage: SchedulePrintPage;
  showClientName: boolean;
  emptyText?: string;
  preview?: boolean;
}) {
  const rowsHtml = renderPrintPageHtml(printPage, showClientName);
  if (!rowsHtml) {
    return `<div class="print-schedule${preview ? " is-preview" : ""}"><div class="empty">${escapeHtml(emptyText)}</div></div>`;
  }

  return `
    <div class="print-schedule${preview ? " is-preview" : ""}">
      <div class="sheet">
        <div class="title-row">${escapeHtml(title)}</div>
        ${subtitle ? `<div class="subtitle-row">${escapeHtml(subtitle)}</div>` : ""}
        <div class="schedule-page">${rowsHtml}</div>
      </div>
    </div>
  `;
}

export function buildCompactPdfPageHtml({
  title,
  subtitle,
  printPage,
  showClientName,
  page,
  totalPages,
}: {
  title: string;
  subtitle?: string;
  printPage: SchedulePrintPage;
  showClientName: boolean;
  page: number;
  totalPages: number;
}) {
  const sidePad = Math.max(
    0,
    Math.floor((SCHEDULE_PRINT_PAGE_WIDTH - SCHEDULE_PRINT_SHEET_WIDTH) / 2),
  );

  return `
    <div xmlns="http://www.w3.org/1999/xhtml" class="page">
      <style>
        ${schedulePrintPdfCss}
        .page {
          width: ${SCHEDULE_PRINT_PAGE_WIDTH}px;
          height: ${SCHEDULE_PRINT_PAGE_HEIGHT}px;
          padding: 14px ${sidePad}px ${SCHEDULE_PRINT_PAGE_PAD_BOTTOM}px;
          background: ${schedulePrintTheme.pageBg};
          color: ${schedulePrintTheme.ink};
          font-family: ${schedulePrintFontFamily};
          position: relative;
          overflow: hidden;
          box-sizing: border-box;
        }
        footer {
          position: absolute;
          left: ${sidePad}px;
          right: ${sidePad}px;
          bottom: ${SCHEDULE_PRINT_FOOTER_BOTTOM}px;
          color: ${schedulePrintTheme.footer};
          font-size: 8px;
          display: flex;
          justify-content: space-between;
        }
      </style>
      ${buildCompactScheduleGridHtml({
        title,
        subtitle,
        printPage,
        showClientName,
        emptyText: "Нет записей на выбранный период",
      })}
      <footer>
        <span>${SCHEDULE_PRINT_FOOTER}</span>
        <span>${page} / ${totalPages}</span>
      </footer>
    </div>
  `;
}
