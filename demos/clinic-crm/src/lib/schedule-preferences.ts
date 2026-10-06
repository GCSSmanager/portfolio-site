export const DEFAULT_COLUMN_WIDTH = 148;
export const DEFAULT_FOCUSED_COLUMN_WIDTH = 320;

export const COLUMN_WIDTH_MIN = 96;
export const COLUMN_WIDTH_MAX = 280;
export const FOCUSED_COLUMN_WIDTH_MIN = 200;
export const FOCUSED_COLUMN_WIDTH_MAX = 520;

export interface ScheduleDisplayPreferences {
  columnWidth: number;
  focusedColumnWidth: number;
}

const STORAGE_KEY = "clinic-demo-schedule-display";
export const SCHEDULE_PREFERENCES_EVENT = "schedule-preferences-changed";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function defaultSchedulePreferences(): ScheduleDisplayPreferences {
  return {
    columnWidth: DEFAULT_COLUMN_WIDTH,
    focusedColumnWidth: DEFAULT_FOCUSED_COLUMN_WIDTH,
  };
}

function normalizePreferences(raw: Partial<ScheduleDisplayPreferences>): ScheduleDisplayPreferences {
  const defaults = defaultSchedulePreferences();
  return {
    columnWidth: clamp(Number(raw.columnWidth ?? defaults.columnWidth), COLUMN_WIDTH_MIN, COLUMN_WIDTH_MAX),
    focusedColumnWidth: clamp(
      Number(raw.focusedColumnWidth ?? defaults.focusedColumnWidth),
      FOCUSED_COLUMN_WIDTH_MIN,
      FOCUSED_COLUMN_WIDTH_MAX,
    ),
  };
}

export function loadSchedulePreferences(): ScheduleDisplayPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultSchedulePreferences();
    return normalizePreferences(JSON.parse(stored) as Partial<ScheduleDisplayPreferences>);
  } catch {
    return defaultSchedulePreferences();
  }
}

export function saveSchedulePreferences(preferences: ScheduleDisplayPreferences): ScheduleDisplayPreferences {
  const normalized = normalizePreferences(preferences);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent(SCHEDULE_PREFERENCES_EVENT, { detail: normalized }));
  return normalized;
}
