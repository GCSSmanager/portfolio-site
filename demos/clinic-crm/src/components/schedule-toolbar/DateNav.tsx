import { addDays, format, parseISO } from "date-fns";
import { DatePicker } from "../ui";

interface Props {
  date: string;
  onChange: (date: string) => void;
}

export function DateNav({ date, onChange }: Props) {
  const d = parseISO(date);
  const shift = (delta: number) => onChange(format(addDays(d, delta), "yyyy-MM-dd"));
  const today = format(new Date(), "yyyy-MM-dd");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center rounded-2xl border border-line bg-panel p-1 shadow-card">
        <button
          onClick={() => shift(-1)}
          className="flex h-8 w-8 items-center justify-center rounded-xl text-ink-muted transition-colors hover:bg-brand-light hover:text-brand-dark"
          aria-label="Предыдущий день"
        >
          ‹
        </button>
        <button
          onClick={() => onChange(today)}
          className={[
            "h-8 rounded-xl px-3 text-xs font-medium transition-colors",
            date === today ? "bg-brand text-white" : "text-ink-muted hover:bg-brand-light",
          ].join(" ")}
        >
          Сегодня
        </button>
        <button
          onClick={() => shift(1)}
          className="flex h-8 w-8 items-center justify-center rounded-xl text-ink-muted transition-colors hover:bg-brand-light hover:text-brand-dark"
          aria-label="Следующий день"
        >
          ›
        </button>
      </div>

      <div className="w-36 sm:w-40">
        <DatePicker value={date} onChange={onChange} className="!h-10 !rounded-2xl shadow-card" />
      </div>
    </div>
  );
}
