import { useEffect, useRef, useState } from "react";
import { useDemoShellOptional } from "../../demo-shell";
import { resetDb } from "../../demo/store";
import { siteBackHref } from "../../demo/site";

const CTA_DELAY_MS = 10_000;

interface Props {
  onDiscuss?: () => void;
}

/** Плашка с логотипом справа снизу — меню демо + кнопка «Обсудить внедрение». */
export function SiteBackBadge({ onDiscuss }: Props) {
  const [open, setOpen] = useState(false);
  const [ctaVisible, setCtaVisible] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const shell = useDemoShellOptional();

  useEffect(() => {
    if (!onDiscuss) return;
    const timer = window.setTimeout(() => setCtaVisible(true), CTA_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [onDiscuss]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const exitDemo = () => {
    window.location.href = siteBackHref();
  };

  const resetDemo = () => {
    if (!window.confirm("Сбросить демо к исходным данным?")) return;
    resetDb();
    window.location.reload();
  };

  return (
    <div
      ref={rootRef}
      className="fixed bottom-4 right-4 z-[100] flex flex-col items-end gap-2.5 sm:bottom-5 sm:right-5"
    >
      {open && (
        <div className="w-64 overflow-hidden rounded-2xl border border-line bg-panel shadow-card backdrop-blur-md">
          {onDiscuss && (
            <>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-ink transition-colors hover:bg-surface"
                onClick={() => {
                  setOpen(false);
                  onDiscuss();
                }}
              >
                <span>Обсудить внедрение</span>
                <span className="shrink-0 rounded-md bg-brand px-1.5 py-0.5 text-[11px] font-semibold text-white">
                  −10%
                </span>
              </button>
              <div className="border-t border-line" />
            </>
          )}
          {shell && (
            <>
              {shell.hasPageTip && (
                <>
                  <button
                    type="button"
                    className="block w-full px-4 py-3 text-left text-sm font-medium text-ink transition-colors hover:bg-surface"
                    onClick={() => {
                      setOpen(false);
                      shell.openCurrentTip();
                    }}
                  >
                    Подсказка страницы
                  </button>
                  <div className="border-t border-line" />
                </>
              )}
              <button
                type="button"
                className="block w-full px-4 py-3 text-left text-sm font-medium text-ink transition-colors hover:bg-surface"
                onClick={() => shell.setTipsMuted(!shell.tipsMuted)}
              >
                {shell.tipsMuted ? "Включить подсказки" : "Выключить подсказки"}
              </button>
              <div className="border-t border-line" />
            </>
          )}
          <button
            type="button"
            className="block w-full px-4 py-3 text-left text-sm font-medium text-ink transition-colors hover:bg-surface"
            onClick={resetDemo}
          >
            Сбросить демо
          </button>
          <div className="border-t border-line" />
          <button
            type="button"
            className="block w-full px-4 py-3 text-left text-sm font-medium text-ink transition-colors hover:bg-surface"
            onClick={exitDemo}
          >
            Выйти из демо
          </button>
        </div>
      )}

      {onDiscuss && ctaVisible && !open && (
        <button
          type="button"
          className="flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-2xl border border-brand-soft bg-panel/95 px-3.5 py-2.5 text-sm font-medium text-ink shadow-card backdrop-blur-md transition-colors hover:border-brand hover:bg-brand-light/50"
          onClick={onDiscuss}
        >
          <span>Обсудить внедрение</span>
          <span className="shrink-0 rounded-md bg-brand px-1.5 py-0.5 text-[11px] font-semibold text-white">
            −10%
          </span>
        </button>
      )}

      <button
        type="button"
        className={`flex h-16 w-16 items-center justify-center rounded-2xl border bg-panel/95 shadow-card backdrop-blur-md transition-colors sm:h-[4.5rem] sm:w-[4.5rem] ${
          open ? "border-brand-soft bg-brand-light/40" : "border-line hover:border-brand-soft hover:bg-brand-light/40"
        }`}
        aria-label="Меню демо"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <img
          src={`${import.meta.env.BASE_URL}gcss-logo.webp`}
          alt=""
          width={48}
          height={48}
          className="h-11 w-11 rounded-xl object-contain sm:h-12 sm:w-12"
          decoding="async"
        />
      </button>
    </div>
  );
}
