import type { ClientAgeCategory, ClientCategory } from "../lib/clientCategories";
import {
  CLIENT_AGE_LABELS,
  CLIENT_CATEGORY_LABELS,
  CLIENT_CATEGORY_OPTIONS,
  DISABILITY_CATEGORIES,
  formatClientCategories,
} from "../lib/clientCategories";
import { Checkbox, ChoiceGroup } from "./ui";

export function ClientCategoryBadges({
  ageCategory,
  categories = [],
  compact = false,
}: {
  ageCategory?: ClientAgeCategory | null;
  categories?: ClientCategory[];
  compact?: boolean;
}) {
  const hasAge = !!ageCategory;
  const tags = categories ?? [];
  if (!hasAge && tags.length === 0) {
    return <span className="text-ink-muted">—</span>;
  }

  return (
    <div className={`flex flex-wrap gap-1 ${compact ? "" : "max-w-xs"}`}>
      {hasAge && (
        <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium text-ink-muted">
          {CLIENT_AGE_LABELS[ageCategory!]}
        </span>
      )}
      {tags.map((category) => (
        <span
          key={category}
          className="rounded-full bg-brand-light px-2 py-0.5 text-[11px] font-medium text-brand-dark"
        >
          {CLIENT_CATEGORY_LABELS[category]}
        </span>
      ))}
    </div>
  );
}

export function ClientCategoriesField({
  ageCategory,
  categories,
  onAgeCategoryChange,
  onCategoriesChange,
}: {
  ageCategory: ClientAgeCategory | "";
  categories: ClientCategory[];
  onAgeCategoryChange: (value: ClientAgeCategory | "") => void;
  onCategoriesChange: (value: ClientCategory[]) => void;
}) {
  const toggleCategory = (category: ClientCategory) => {
    if (categories.includes(category)) {
      onCategoriesChange(categories.filter((item) => item !== category));
      return;
    }
    if (DISABILITY_CATEGORIES.includes(category)) {
      onCategoriesChange([
        ...categories.filter((item) => !DISABILITY_CATEGORIES.includes(item)),
        category,
      ]);
      return;
    }
    onCategoriesChange([...categories, category]);
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 text-sm font-medium text-ink">Категория</div>
        <ChoiceGroup
          value={ageCategory}
          onChange={onAgeCategoryChange}
          options={(["ADULT", "CHILD"] as const).map((value) => ({
            value,
            label: CLIENT_AGE_LABELS[value],
          }))}
        />
      </div>

      <div>
        <div className="mb-2 text-sm font-medium text-ink">Отметки</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {CLIENT_CATEGORY_OPTIONS.map((option) => {
            const selected = categories.includes(option.value);
            return (
              <div
                key={option.value}
                className={[
                  "rounded-2xl border px-3 py-2 transition-colors",
                  selected ? "border-brand bg-brand-light/70" : "border-line bg-panel",
                ].join(" ")}
              >
                <Checkbox
                  checked={selected}
                  onChange={() => toggleCategory(option.value)}
                  label={<span className={selected ? "text-brand-dark font-medium" : "text-ink-muted"}>{option.label}</span>}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export { formatClientCategories };
