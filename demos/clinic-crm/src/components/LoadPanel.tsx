interface LoadItem {
  employeeId: string;
  shortName: string;
  hours: number;
}

interface Props {
  items: LoadItem[];
}

export function LoadPanel({ items }: Props) {
  const max = Math.max(...items.map((i) => i.hours), 1);

  return (
    <div className="bg-panel border border-line rounded-3xl shadow-card p-4">
      <h3 className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">
        Загрузка за день
      </h3>
      <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin pr-1">
        {items
          .sort((a, b) => b.hours - a.hours)
          .map((item) => (
            <div key={item.employeeId} className="flex items-center gap-2">
              <span className="text-[11px] text-ink w-24 truncate shrink-0">{item.shortName}</span>
              <div className="flex-1 h-2 bg-surface rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand to-brand-glow rounded-full transition-all"
                  style={{ width: `${(item.hours / max) * 100}%` }}
                />
              </div>
              <span className="text-[11px] font-medium text-ink w-10 text-right">{item.hours}ч</span>
            </div>
          ))}
      </div>
    </div>
  );
}
