import { useEffect } from "react";
import { useBodyScrollLock } from "../ui/scroll-lock";
import { NavPanel } from "./NavPanel";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function MobileNavDrawer({ open, onClose }: Props) {
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] lg:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-ink/35 backdrop-blur-sm"
        aria-label="Закрыть меню"
        onClick={onClose}
      />
      <aside className="relative flex h-full w-[min(18rem,88vw)] flex-col bg-panel shadow-card">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-xl text-xl leading-none text-ink-muted hover:bg-surface hover:text-ink"
          aria-label="Закрыть"
        >
          ×
        </button>
        <NavPanel onNavigate={onClose} />
      </aside>
    </div>
  );
}
