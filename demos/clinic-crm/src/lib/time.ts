export const SLOT_MIN = 15;
export const DAY_START = 9 * 60; // 09:00
export const DAY_END = 18 * 60; // 18:00 (Пт — 16:45, задаётся справочником)
export const LUNCH_START = 13 * 60;
export const LUNCH_END = 13 * 60 + 45;

// Список слотов сетки [DAY_START, DAY_END) с шагом SLOT_MIN.
export function buildSlots(start = DAY_START, end = DAY_END): number[] {
  const slots: number[] = [];
  for (let m = start; m < end; m += SLOT_MIN) slots.push(m);
  return slots;
}

export function isLunch(min: number): boolean {
  return min >= LUNCH_START && min < LUNCH_END;
}
