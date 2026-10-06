export type ClientAgeCategory = "ADULT" | "CHILD";

export type ClientCategory = "DISABILITY_1" | "DISABILITY_2" | "DISABILITY_3" | "CHILD_DISABILITY" | "OJD" | "OVZ";

export const CLIENT_AGE_OPTIONS: Array<{ value: ClientAgeCategory; label: string }> = [
  { value: "ADULT", label: "Взрослый" },
  { value: "CHILD", label: "Ребёнок" },
];

export const CLIENT_CATEGORY_OPTIONS: Array<{ value: ClientCategory; label: string }> = [
  { value: "DISABILITY_1", label: "Инвалид · 1 группа" },
  { value: "DISABILITY_2", label: "Инвалид · 2 группа" },
  { value: "DISABILITY_3", label: "Инвалид · 3 группа" },
  { value: "CHILD_DISABILITY", label: "Ребёнок - инвалид" },
  { value: "OJD", label: "ОЖД" },
  { value: "OVZ", label: "ОВЗ" },
];

export const DISABILITY_CATEGORIES: ClientCategory[] = [
  "DISABILITY_1",
  "DISABILITY_2",
  "DISABILITY_3",
  "CHILD_DISABILITY",
];

export const CLIENT_AGE_LABELS: Record<ClientAgeCategory, string> = {
  ADULT: "Взрослый",
  CHILD: "Ребёнок",
};

export const CLIENT_CATEGORY_LABELS: Record<ClientCategory, string> = {
  DISABILITY_1: "1 гр.",
  DISABILITY_2: "2 гр.",
  DISABILITY_3: "3 гр.",
  CHILD_DISABILITY: "Реб. инв.",
  OJD: "ОЖД",
  OVZ: "ОВЗ",
};

export function toggleClientCategory(current: ClientCategory[], next: ClientCategory): ClientCategory[] {
  if (current.includes(next)) return current.filter((item) => item !== next);
  if (DISABILITY_CATEGORIES.includes(next)) {
    return [...current.filter((item) => !DISABILITY_CATEGORIES.includes(item)), next];
  }
  return [...current, next];
}

export function formatClientCategories(
  ageCategory?: ClientAgeCategory | null,
  categories: ClientCategory[] = [],
): string {
  const parts: string[] = [];
  if (ageCategory) parts.push(CLIENT_AGE_LABELS[ageCategory]);
  for (const category of CLIENT_CATEGORY_OPTIONS) {
    if (categories.includes(category.value)) parts.push(CLIENT_CATEGORY_LABELS[category.value]);
  }
  return parts.length > 0 ? parts.join(" · ") : "—";
}
