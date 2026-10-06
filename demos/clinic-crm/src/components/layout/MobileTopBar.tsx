interface Props {
  onOpenMenu: () => void;
}

export function MobileTopBar({ onOpenMenu }: Props) {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-panel/95 px-4 py-3 backdrop-blur-md lg:hidden">
      <button
        type="button"
        onClick={onOpenMenu}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface text-ink hover:border-brand-soft"
        aria-label="Открыть меню"
      >
        <span className="flex flex-col gap-1.5" aria-hidden>
          <span className="block h-0.5 w-4 rounded-full bg-ink" />
          <span className="block h-0.5 w-4 rounded-full bg-ink" />
          <span className="block h-0.5 w-4 rounded-full bg-ink" />
        </span>
      </button>
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">
          К
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-ink">Клиника</div>
          <div className="text-[11px] text-ink-muted">Демо-расписание</div>
        </div>
      </div>
    </header>
  );
}
