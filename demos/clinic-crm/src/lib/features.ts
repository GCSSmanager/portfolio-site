/**
 * Режим диагностики приходит с backend (`DIAGNOSTIC_BOOKING_MODE` → GET /api/settings/features).
 * - day — блокировать весь день участника комиссии (по умолчанию)
 * - windows — блокировать только окна диагностики
 * - parallel — обычные записи поверх окон (окно снимается)
 */
export type DiagnosticBookingMode = "windows" | "day" | "parallel";

const MODES = new Set<DiagnosticBookingMode>(["windows", "day", "parallel"]);

function parseDiagnosticBookingMode(value: unknown): DiagnosticBookingMode {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  if (MODES.has(normalized as DiagnosticBookingMode)) return normalized as DiagnosticBookingMode;
  return "day";
}

let diagnosticBookingMode: DiagnosticBookingMode = "day";

export function setDiagnosticBookingMode(value: unknown) {
  diagnosticBookingMode = parseDiagnosticBookingMode(value);
}

export const features = {
  get diagnosticBookingMode() {
    return diagnosticBookingMode;
  },
};
