interface Option<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: Option<T>[];
  disabled?: boolean;
}

export function ChoiceGroup<T extends string>({ value, onChange, options, disabled = false }: Props<T>) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={[
              "rounded-2xl border px-4 py-2 text-sm font-medium transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-brand/30",
              disabled ? "cursor-not-allowed opacity-50" : "",
              selected
                ? "border-brand bg-brand-light text-brand-dark shadow-sm"
                : "border-line bg-panel text-ink-muted hover:border-brand-soft hover:text-ink",
            ].join(" ")}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
