import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface SearchOption {
  value: string;
  label: string;
  hint?: string;
  disabled?: boolean;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: SearchOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  compact?: boolean;
  searchable?: boolean;
  dropdownMinWidth?: number;
}

export function SearchSelect({
  value,
  onChange,
  options,
  placeholder = "Выберите…",
  searchPlaceholder = "Поиск…",
  emptyText = "Ничего не найдено",
  compact = false,
  searchable = true,
  dropdownMinWidth = 220,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.hint?.toLowerCase().includes(q),
    );
  }, [options, query]);

  const reposition = () => {
    if (!rootRef.current) return;
    const rect = rootRef.current.getBoundingClientRect();
    const width = Math.min(Math.max(rect.width, dropdownMinWidth), window.innerWidth - 16);
    let left = rect.left;
    if (left + width > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - width - 8);
    }
    if (left < 8) left = 8;

    const estimatedHeight = Math.min(280, window.innerHeight * 0.45);
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const top =
      spaceBelow < estimatedHeight && spaceAbove > spaceBelow
        ? Math.max(8, rect.top - estimatedHeight - 6)
        : rect.bottom + 6;

    setPos({ top, left, width });
  };

  useLayoutEffect(() => {
    if (!open) return;
    reposition();
  }, [open, filtered.length]);

  useEffect(() => {
    if (!open || !searchable) return;
    const t = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 0);
    return () => clearTimeout(t);
  }, [open, searchable]);

  useEffect(() => {
    if (!open) return;

    const onDoc = (e: Event) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || dropdownRef.current?.contains(t)) return;
      setOpen(false);
      setQuery("");
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
        setQuery("");
      }
    };

    const onReflow = (e: Event) => {
      if (dropdownRef.current?.contains(e.target as Node)) return;
      reposition();
    };

    document.addEventListener("pointerdown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onReflow);
    window.addEventListener("scroll", onReflow, true);

    return () => {
      document.removeEventListener("pointerdown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow, true);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  const pick = (next: string) => {
    const option = options.find((o) => o.value === next);
    if (option?.disabled) return;
    onChange(next);
    close();
  };

  const dropdown = open
    ? createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[200] bg-panel border border-line rounded-2xl shadow-card overflow-hidden"
          style={{ top: pos.top, left: pos.left, width: pos.width }}
        >
          {searchable && (
            <div className="p-2 border-b border-line">
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full h-8 px-2.5 bg-surface border border-line rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
            </div>
          )}
          <ul className={["max-h-52 overflow-y-auto scrollbar-thin py-1", searchable ? "" : "pt-1"].join(" ")}>
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-xs text-ink-muted">{emptyText}</li>
            ) : (
              filtered.map((o) => (
                <li key={o.value}>
                  <button
                    type="button"
                    disabled={o.disabled}
                    className={[
                      "w-full text-left px-3 py-2 text-sm transition-colors disabled:cursor-not-allowed",
                      o.disabled
                        ? "text-ink-muted/45 bg-surface/50"
                        : "hover:bg-brand-light/60",
                      !o.disabled && o.value === value ? "bg-brand-light text-brand-dark font-medium" : "",
                      !o.disabled && o.value !== value ? "text-ink" : "",
                    ].join(" ")}
                    onPointerDown={(e) => {
                      // preventDefault без блокировки touch-клика на iOS
                      if (e.pointerType === "mouse") e.preventDefault();
                    }}
                    onClick={() => {
                      if (!o.disabled) pick(o.value);
                    }}
                  >
                    <div className="leading-snug">{o.label}</div>
                    {o.hint && (
                      <div
                        className={[
                          "text-[10px] leading-snug",
                          o.disabled ? "text-ink-muted/70" : "text-ink-muted",
                        ].join(" ")}
                      >
                        {o.hint}
                      </div>
                    )}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>,
        document.body,
      )
    : null;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
        className={[
          "w-full flex items-center justify-between gap-2 bg-panel border border-line rounded-xl text-left transition-colors hover:border-line2 focus:outline-none focus:ring-2 focus:ring-brand/30",
          compact ? "h-8 px-2.5 text-xs" : "h-9 px-3 text-sm",
          open ? "ring-2 ring-brand/30 border-brand-soft" : "",
        ].join(" ")}
      >
        <span className={selected ? "text-ink truncate" : "text-ink-muted truncate"}>
          {selected?.label ?? placeholder}
        </span>
        <span className="text-ink-muted text-[10px] shrink-0">{open ? "▲" : "▼"}</span>
      </button>
      {dropdown}
    </div>
  );
}

/** Короткий список без поиска — тот же стиль, что SearchSelect. */
export function Picker({
  value,
  onChange,
  options,
  placeholder,
  compact,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SearchOption[];
  placeholder?: string;
  compact?: boolean;
}) {
  return (
    <SearchSelect
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      searchable={false}
      compact={compact}
    />
  );
}
