export const DEFAULT_CLIENT_SLOT_WIDTH = 50;

export const CLIENT_SLOT_WIDTH_MIN = 24;
export const CLIENT_SLOT_WIDTH_MAX = 80;

export interface ClientScheduleDisplayPreferences {
  slotWidth: number;
}

const STORAGE_KEY = "clinic-demo-client-schedule-display-v2";
export const CLIENT_SCHEDULE_PREFERENCES_EVENT = "client-schedule-preferences-changed";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function defaultClientSchedulePreferences(): ClientScheduleDisplayPreferences {
  return { slotWidth: DEFAULT_CLIENT_SLOT_WIDTH };
}

function normalizePreferences(raw: Partial<ClientScheduleDisplayPreferences>): ClientScheduleDisplayPreferences {
  const defaults = defaultClientSchedulePreferences();
  return {
    slotWidth: clamp(Number(raw.slotWidth ?? defaults.slotWidth), CLIENT_SLOT_WIDTH_MIN, CLIENT_SLOT_WIDTH_MAX),
  };
}

export function loadClientSchedulePreferences(): ClientScheduleDisplayPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultClientSchedulePreferences();
    return normalizePreferences(JSON.parse(stored) as Partial<ClientScheduleDisplayPreferences>);
  } catch {
    return defaultClientSchedulePreferences();
  }
}

export function saveClientSchedulePreferences(
  preferences: ClientScheduleDisplayPreferences,
): ClientScheduleDisplayPreferences {
  const normalized = normalizePreferences(preferences);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent(CLIENT_SCHEDULE_PREFERENCES_EVENT, { detail: normalized }));
  return normalized;
}
