export function minToTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function timeToMin(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + (m ?? 0);
}

export const WEEKDAYS = [
  { value: 1, label: "Пн" },
  { value: 2, label: "Вт" },
  { value: 3, label: "Ср" },
  { value: 4, label: "Чт" },
  { value: 5, label: "Пт" },
  { value: 6, label: "Сб" },
  { value: 7, label: "Вс" },
] as const;

export const ABSENCE_LABELS: Record<string, string> = {
  SICK: "Больничный",
  BUSINESS_TRIP: "Командировка",
  VACATION: "Отпуск",
  DAY_OFF: "Отгул",
  OTHER: "Другое",
};

/** Для типа «Другое» в календаре/печати показываем заметку. */
export function absenceDisplayLabel(
  absence: { type: string; note?: string | null },
  fallback = ABSENCE_LABELS.OTHER,
) {
  if (absence.type === "OTHER") {
    const note = absence.note?.trim();
    if (note) return note;
  }
  return ABSENCE_LABELS[absence.type] ?? fallback;
}
