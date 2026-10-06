import { Link } from "react-router-dom";

interface Props {
  onPrintClient?: () => void;
  onPrintDay?: () => void;
}

export function ToolbarActions({ onPrintClient, onPrintDay }: Props) {
  const actionClass =
    "inline-flex h-10 items-center justify-center rounded-2xl border border-line bg-panel px-3 text-xs font-medium leading-none text-ink-muted transition-colors hover:border-brand-soft hover:text-brand-dark sm:px-4 sm:text-sm";

  return (
    <>
      {onPrintDay && (
        <button type="button" onClick={onPrintDay} className={actionClass}>
          <span className="sm:hidden">День</span>
          <span className="hidden sm:inline">Печать дня</span>
        </button>
      )}
      {onPrintClient && (
        <>
          <Link to="/client-schedule" className={actionClass}>
            <span className="sm:hidden">Клиент</span>
            <span className="hidden sm:inline">Расписание клиента</span>
          </Link>
          <button
            type="button"
            onClick={onPrintClient}
            className="inline-flex h-10 items-center justify-center rounded-2xl bg-brand px-3 text-xs font-medium leading-none text-white shadow-float transition-colors hover:bg-brand-dark sm:px-4 sm:text-sm"
          >
            <span className="sm:hidden">Печать</span>
            <span className="hidden sm:inline">Печать для клиента</span>
          </button>
        </>
      )}
    </>
  );
}
