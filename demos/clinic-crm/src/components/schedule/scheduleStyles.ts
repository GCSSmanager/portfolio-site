import type { ScheduleConflict } from "../../lib/conflicts";

export const scheduleZ = {
  grid: "z-[1]",
  suggestion: "z-[5]",
  diagnostic: "z-10",
  appointment: "z-20",
  appointmentHover: "z-30",
  /** Подсказки слотов / вставки — ниже sticky осей. */
  pasteTarget: "z-[35]",
  /** Левая ось ниже верхней, иначе при вертикальном скролле даты наползают на шапку часов. */
  stickyLeft: "z-[40]",
  stickyTop: "z-[50]",
  stickyCorner: "z-[60]",
  dragTarget: "z-[35]",
  dragLabel: "z-[36]",
};

export const scheduleStyles = {
  shell: "relative isolate bg-panel border border-line rounded-2xl shadow-card overflow-hidden select-none sm:rounded-3xl",
  /** Mobile: top bar + toolbar; desktop: toolbar only. Keep horizontal scroll for columns. */
  scroll: "overflow-auto scrollbar-thin max-h-[calc(100dvh-20rem)] sm:max-h-[calc(100dvh-17rem)] lg:max-h-[calc(100vh-15rem)]",
  grid: "grid min-w-max",
  headerCorner: `sticky top-0 left-0 ${scheduleZ.stickyCorner} bg-panel border-b border-r border-line h-14`,
  employeeHeader: `sticky top-0 ${scheduleZ.stickyTop} bg-panel border-b border-l border-line px-2 h-14 flex flex-col justify-center min-w-0`,
  timeColumn: `sticky left-0 ${scheduleZ.stickyLeft} relative bg-panel border-r border-line`,
  column: "relative border-l border-line",
  offShift: "absolute inset-0 bg-surface/70 pointer-events-none z-[1]",
  noShiftDrag: "absolute inset-x-3 top-4 z-[6] rounded-2xl border border-red-200 bg-red-50/80 px-3 py-2 text-center text-[11px] font-medium text-red-600 pointer-events-none",
  noSuggestions: "absolute inset-x-3 top-4 z-[3] rounded-2xl border border-line bg-panel/90 px-3 py-2 text-center text-[11px] text-ink-muted pointer-events-none",
  gridLine: "absolute left-0 right-0 pointer-events-none",
  lunch: "absolute left-1 right-1 rounded-lg z-[3] pointer-events-none flex items-center justify-center",
  diagnostic: `absolute left-1 right-1 rounded-lg z-[3] pointer-events-none flex items-center justify-center`,
  suggestion: `absolute left-1 right-1 ${scheduleZ.suggestion} rounded-lg border text-left transition-all focus:outline-none focus:ring-2 focus:ring-brand/30`,
  appointment: "absolute left-1 right-1 rounded-lg px-1.5 py-1 text-left overflow-hidden transition-shadow focus:outline-none",
};

export function gridLineClass(isHour: boolean) {
  return [scheduleStyles.gridLine, isHour ? "border-t border-line/80" : "border-t border-line/25"].join(" ");
}

export function suggestionClass(selected: boolean) {
  return [
    scheduleStyles.suggestion,
    selected
      ? "border-brand bg-brand/20 shadow-[0_8px_22px_rgba(82,148,77,0.18)]"
      : "border-brand/25 bg-brand/10 hover:border-brand/60 hover:bg-brand/20 hover:shadow-sm",
  ].join(" ");
}

export function appointmentClass(isDragging: boolean, isHover: boolean, locked = false) {
  return [
    scheduleStyles.appointment,
    isDragging ? "pointer-events-none" : "",
    isHover && !isDragging
      ? `${scheduleZ.appointmentHover} ring-2 ring-brand/50 shadow-lg`
      : `${scheduleZ.appointment} ${locked ? "cursor-pointer" : "cursor-grab"}`,
  ].join(" ");
}

export function moveTargetClass(active: boolean, ok: boolean, activeInvalid: boolean) {
  return [
    "absolute left-1 right-1 rounded-lg border pointer-events-none transition-all duration-75",
    active ? scheduleZ.dragTarget : "z-[6]",
    ok && !activeInvalid
      ? active
        ? "border-brand bg-brand-light shadow-[0_10px_24px_rgba(82,148,77,0.16)]"
        : "border-brand-soft bg-brand-light"
      : active
        ? "border-red-300 bg-red-50 shadow-[0_10px_24px_rgba(220,38,38,0.18)]"
        : "border-red-200 bg-red-50",
  ].join(" ");
}

export function moveTargetLabelClass(ok: boolean) {
  return [
    `absolute right-1.5 top-1 ${scheduleZ.dragLabel} rounded-full px-2 py-0.5 text-[10px] font-medium shadow-sm`,
    ok ? "bg-brand text-white" : "border-red-300 bg-red-50 text-red-700",
  ].join(" ");
}

export function moveTargetTimeClass(ok: boolean) {
  return [
    `absolute left-2 top-1 ${scheduleZ.dragLabel} rounded-full bg-panel/95 px-2 py-0.5 text-[10px] font-semibold tabular-nums shadow-sm`,
    ok ? "text-brand-dark" : "text-red-700",
  ].join(" ");
}

export function moveTargetLabel(
  activeInvalid: boolean,
  ok: boolean,
  conflict: ScheduleConflict | null,
  outOfBounds: boolean,
) {
  if (!activeInvalid && ok) return "доступно";
  if (outOfBounds) return "граница календаря";
  return conflict?.shortLabel ?? "недоступно";
}
