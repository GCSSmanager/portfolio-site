import type { ReactNode } from "react";

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode;
  disabled?: boolean;
  className?: string;
}

export function Checkbox({ checked, onChange, label, disabled = false, className = "" }: Props) {
  const toggle = () => {
    if (!disabled) onChange(!checked);
  };

  return (
    <div
      className={[
        "inline-flex items-center gap-2.5",
        disabled ? "opacity-50" : "",
        className,
      ].join(" ")}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        disabled={disabled}
        onClick={toggle}
        className={[
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all",
          checked
            ? "border-brand bg-brand text-white shadow-sm"
            : "border-line bg-panel hover:border-brand/50",
          disabled ? "cursor-not-allowed" : "cursor-pointer",
          "focus:outline-none focus:ring-2 focus:ring-brand/30",
        ].join(" ")}
      >
        {checked && (
          <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" aria-hidden>
            <path d="M2.5 6.2 4.8 8.5 9.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      {label != null && label !== false && (
        <button
          type="button"
          disabled={disabled}
          onClick={toggle}
          className={[
            "text-sm text-ink-muted select-none text-left",
            disabled ? "cursor-not-allowed" : "cursor-pointer",
          ].join(" ")}
        >
          {label}
        </button>
      )}
    </div>
  );
}
