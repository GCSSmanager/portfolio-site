export type GroupAgeRange = "AGE_1_3" | "AGE_4_7" | "AGE_8_11" | "AGE_12_15" | "AGE_16_18";

export const GROUP_AGE_RANGE_OPTIONS: Array<{ value: GroupAgeRange; label: string }> = [
  { value: "AGE_1_3", label: "1–3" },
  { value: "AGE_4_7", label: "4–7" },
  { value: "AGE_8_11", label: "8–11" },
  { value: "AGE_12_15", label: "12–15" },
  { value: "AGE_16_18", label: "16–18" },
];

const RANGE_BOUNDS: Record<GroupAgeRange, { min: number; max: number }> = {
  AGE_1_3: { min: 1, max: 3 },
  AGE_4_7: { min: 4, max: 7 },
  AGE_8_11: { min: 8, max: 11 },
  AGE_12_15: { min: 12, max: 15 },
  AGE_16_18: { min: 16, max: 18 },
};

function toYmd(value: string | Date): string {
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

export function ageYearsOnDate(birthDate: string | Date, onDate: string | Date): number {
  const birth = toYmd(birthDate);
  const on = toYmd(onDate);
  const [by, bm, bd] = birth.split("-").map(Number);
  const [oy, om, od] = on.split("-").map(Number);
  let age = oy - by!;
  if (om! < bm! || (om === bm && od! < bd!)) age -= 1;
  return age;
}

/** Диапазон по возрасту; null — вне детских полос или дата не указана. */
export function groupAgeRangeFromBirthDate(
  birthDate: string | Date | null | undefined,
  onDate: string | Date,
): GroupAgeRange | null {
  if (!birthDate) return null;
  const age = ageYearsOnDate(birthDate, onDate);
  for (const [range, bounds] of Object.entries(RANGE_BOUNDS) as Array<[GroupAgeRange, { min: number; max: number }]>) {
    if (age >= bounds.min && age <= bounds.max) return range;
  }
  return null;
}

/** Без даты рождения — подходит к любой группе; без диапазона — все подходят. */
export function clientFitsGroupAgeRange(
  birthDate: string | Date | null | undefined,
  range: GroupAgeRange | null | undefined,
  onDate: string | Date,
): boolean {
  if (!range) return true;
  if (!birthDate) return true;
  const age = ageYearsOnDate(birthDate, onDate);
  const bounds = RANGE_BOUNDS[range];
  return age >= bounds.min && age <= bounds.max;
}

export function groupAgeRangeLabel(range: GroupAgeRange | null | undefined): string {
  if (!range) return "";
  return GROUP_AGE_RANGE_OPTIONS.find((item) => item.value === range)?.label ?? range;
}

export function groupAgeRangeMismatchMessage(range: GroupAgeRange) {
  const { min, max } = RANGE_BOUNDS[range];
  return `Клиент не подходит по возрасту (нужен ${min}–${max} лет)`;
}
