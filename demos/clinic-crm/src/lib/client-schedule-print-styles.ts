/** A4 landscape @ 96dpi. */
export const SCHEDULE_PRINT_PAGE_WIDTH = 1123;
export const SCHEDULE_PRINT_PAGE_HEIGHT = 794;

export const SCHEDULE_PRINT_COLS = 8;
export const SCHEDULE_PRINT_GRID_ROWS = 2;
export const SCHEDULE_PRINT_SLOTS_PER_PAGE = SCHEDULE_PRINT_COLS * SCHEDULE_PRINT_GRID_ROWS;
export const SCHEDULE_PRINT_CELL_WIDTH = 134;
export const SCHEDULE_PRINT_CELL_GAP = 1;
export const SCHEDULE_PRINT_PAGE_PAD = 8;

/** Ширина ровно 8 колонок. */
export const SCHEDULE_PRINT_GRID_WIDTH =
  SCHEDULE_PRINT_COLS * SCHEDULE_PRINT_CELL_WIDTH + (SCHEDULE_PRINT_COLS - 1) * SCHEDULE_PRINT_CELL_GAP;

export const SCHEDULE_PRINT_SHEET_WIDTH = SCHEDULE_PRINT_GRID_WIDTH + SCHEDULE_PRINT_PAGE_PAD * 2;

const PAGE_PAD_Y = 14;
/** Нижний отступ страницы ≈ позиция футера + высота строки футера. */
const PAGE_PAD_BOTTOM = 42;
const FOOTER_SPACE = 18;
const TITLE_BLOCK = 54;
const ROW_GAP = 4;

/** Отступ «МГЦР» / номера страницы от нижнего края страницы. */
export const SCHEDULE_PRINT_FOOTER_BOTTOM = 26;
export const SCHEDULE_PRINT_PAGE_PAD_BOTTOM = PAGE_PAD_BOTTOM;

export const SCHEDULE_PRINT_GRID_AREA_HEIGHT =
  SCHEDULE_PRINT_PAGE_HEIGHT - PAGE_PAD_Y - PAGE_PAD_BOTTOM - FOOTER_SPACE - TITLE_BLOCK - SCHEDULE_PRINT_PAGE_PAD * 2;

export const SCHEDULE_PRINT_ROW_HEIGHT = Math.floor(
  (SCHEDULE_PRINT_GRID_AREA_HEIGHT - ROW_GAP * (SCHEDULE_PRINT_GRID_ROWS - 1)) / SCHEDULE_PRINT_GRID_ROWS,
);

export const SCHEDULE_PRINT_CELL_DATE_HEIGHT = 24;
export const SCHEDULE_PRINT_CELL_BODY_HEIGHT =
  SCHEDULE_PRINT_ROW_HEIGHT - SCHEDULE_PRINT_CELL_DATE_HEIGHT - SCHEDULE_PRINT_CELL_GAP;

export const SCHEDULE_PRINT_COL_WIDTH = SCHEDULE_PRINT_CELL_WIDTH;

/** Высота одной записи (с учётом переносов title/meta). */
export const SCHEDULE_PRINT_APPOINTMENT_HEIGHT = 36;
/** Запас снизу ячейки, чтобы в печати ничего не обрезалось. */
export const SCHEDULE_PRINT_CELL_SAFETY_PX = 16;

export const schedulePrintTheme = {
  border: "#c5dcc2",
  headBg: "#eef7ed",
  headText: "#315c2f",
  ink: "#1f2a1f",
  muted: "#647064",
  cellDivider: "#e6ebe5",
  sheetBg: "#ffffff",
  pageBg: "#ffffff",
  footer: "#8a948a",
  gridBg: "#f3f6f2",
} as const;

/** Как в сетке расписания: белый фон + лёгкая серая штриховка. */
const absenceFill = `
  background-color: ${schedulePrintTheme.sheetBg};
  background-image: repeating-linear-gradient(
    -45deg,
    transparent,
    transparent 4px,
    rgba(0,0,0,0.03) 4px,
    rgba(0,0,0,0.03) 8px
  );
`;

export const schedulePrintFontFamily =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif";

export const schedulePrintPdfCss = `
  .print-schedule {
    --sp-cell-width: ${SCHEDULE_PRINT_CELL_WIDTH}px;
    --sp-row-height: ${SCHEDULE_PRINT_ROW_HEIGHT}px;
    --sp-grid-width: ${SCHEDULE_PRINT_GRID_WIDTH}px;
    --sp-sheet-width: ${SCHEDULE_PRINT_SHEET_WIDTH}px;
    --sp-page-pad: ${SCHEDULE_PRINT_PAGE_PAD}px;
    --sp-cell-body: ${SCHEDULE_PRINT_CELL_BODY_HEIGHT}px;
    font-family: ${schedulePrintFontFamily};
  }
  .print-schedule *, .print-schedule *::before, .print-schedule *::after {
    box-sizing: border-box;
  }
  .print-schedule .sheet {
    width: var(--sp-sheet-width);
    border: 1px solid ${schedulePrintTheme.border};
    border-radius: 8px;
    overflow: hidden;
    background: ${schedulePrintTheme.sheetBg};
    display: flex;
    flex-direction: column;
  }
  .print-schedule .title-row {
    padding: 8px 10px;
    font-size: 13px;
    font-weight: 700;
    text-align: center;
    color: ${schedulePrintTheme.headText};
    background: ${schedulePrintTheme.headBg};
    border-bottom: 1px solid ${schedulePrintTheme.border};
  }
  .print-schedule .subtitle-row {
    padding: 4px 10px;
    font-size: 9px;
    color: ${schedulePrintTheme.muted};
    text-align: center;
    background: #f8fbf8;
    border-bottom: 1px solid ${schedulePrintTheme.border};
  }
  .print-schedule .schedule-page {
    display: flex;
    flex-direction: column;
    gap: ${ROW_GAP}px;
    padding: var(--sp-page-pad);
    background: ${schedulePrintTheme.gridBg};
  }
  .print-schedule .schedule-row {
    width: var(--sp-grid-width);
    height: var(--sp-row-height);
    border: 1px solid ${schedulePrintTheme.border};
    border-radius: 6px;
    overflow: hidden;
    background: ${schedulePrintTheme.sheetBg};
    display: grid;
    grid-template-rows: ${SCHEDULE_PRINT_CELL_DATE_HEIGHT}px var(--sp-cell-body);
  }
  .print-schedule .schedule-row-head,
  .print-schedule .schedule-row-body {
    display: grid;
    grid-template-columns: repeat(${SCHEDULE_PRINT_COLS}, var(--sp-cell-width));
    gap: ${SCHEDULE_PRINT_CELL_GAP}px;
    background: ${schedulePrintTheme.border};
  }
  .print-schedule .day-head {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2px 3px;
    font-size: 9px;
    font-weight: 700;
    line-height: 1.15;
    text-align: center;
    color: ${schedulePrintTheme.headText};
    background: ${schedulePrintTheme.headBg};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .print-schedule .day-head.is-empty {
    background: ${schedulePrintTheme.sheetBg};
    color: transparent;
  }
  .print-schedule .day-col {
    width: var(--sp-cell-width);
    height: var(--sp-cell-body);
    background: ${schedulePrintTheme.sheetBg};
    overflow: hidden;
  }
  .print-schedule .day-col.is-absent {
    ${absenceFill}
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6px 4px;
  }
  .print-schedule .day-col.is-diagnostic {
    ${absenceFill}
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: flex-start;
    padding: 0;
  }
  .print-schedule .day-col.is-diagnostic-empty {
    align-items: center;
    justify-content: center;
    padding: 6px 4px;
  }
  .print-schedule .day-col.is-diagnostic .cell {
    background: transparent;
  }
  .print-schedule .day-absent-label {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    text-align: center;
    color: ${schedulePrintTheme.muted};
    line-height: 1.25;
    max-width: 100%;
    white-space: normal;
    overflow-wrap: anywhere;
    word-break: break-word;
  }
  .print-schedule .day-absent-label.is-note {
    letter-spacing: normal;
    text-transform: none;
    font-size: 8px;
    font-weight: 600;
  }
  /* Превью: ничего не прячем — если не влезло, видно сразу. */
  .print-schedule.is-preview .schedule-row {
    height: auto;
    min-height: var(--sp-row-height);
    overflow: visible;
    grid-template-rows: ${SCHEDULE_PRINT_CELL_DATE_HEIGHT}px minmax(var(--sp-cell-body), auto);
  }
  .print-schedule.is-preview .day-col {
    height: auto;
    min-height: var(--sp-cell-body);
    overflow: visible;
  }
  .print-schedule.is-preview .day-head {
    white-space: normal;
    overflow: visible;
    text-overflow: unset;
    word-break: break-word;
  }
  .print-schedule .cell {
    border-bottom: 1px solid ${schedulePrintTheme.cellDivider};
    padding: 2px 4px 3px;
    background: ${schedulePrintTheme.sheetBg};
  }
  .print-schedule .cell.is-absence {
    ${absenceFill}
  }
  .print-schedule .cell:last-child { border-bottom: none; }
  .print-schedule .time {
    font-size: 9px;
    font-weight: 700;
    line-height: 1.1;
    color: ${schedulePrintTheme.headText};
    font-variant-numeric: tabular-nums;
  }
  .print-schedule .title {
    margin-top: 1px;
    font-size: 8px;
    font-weight: 600;
    line-height: 1.2;
    color: ${schedulePrintTheme.ink};
    overflow-wrap: anywhere;
    word-break: break-word;
  }
  .print-schedule .meta {
    margin-top: 1px;
    font-size: 7px;
    color: ${schedulePrintTheme.muted};
    line-height: 1.15;
    overflow-wrap: anywhere;
    word-break: break-word;
  }
  .print-schedule .empty {
    margin: 16px;
    border: 1px dashed ${schedulePrintTheme.border};
    border-radius: 8px;
    padding: 20px;
    text-align: center;
    color: ${schedulePrintTheme.muted};
    font-size: 11px;
  }
`;
