import { useEffect, useRef, useState } from "react";
import { useDemoShellOptional } from "../../demo-shell";
import { notifyAuthSessionInvalid } from "@/lib/api";
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
    setOpen(false);
    resetDb();
    notifyAuthSessionInvalid();
  };

  return (
    <div
      ref={rootRef}
      className="fixed bottom-4 right-4 z-[100] flex flex-col items-end gap-2.5 sm:bottom-5 sm:right-5"
    >
      {open && (
        <div className="w-64 overflow-hidden rounded-2xl border border-gray-200 bg-white/95 shadow-lg backdrop-blur-md">
          {onDiscuss && (
            <>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50"
                onClick={() => {
                  setOpen(false);
                  onDiscuss();
                }}
              >
                <span>Обсудить внедрение</span>
                <span className="shrink-0 rounded-md bg-emerald-600 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                  −10%
                </span>
              </button>
              <div className="border-t border-gray-200" />
            </>
          )}
          {shell && !shell.config.tipsDisabled && (
            <>
              {shell.hasPageTip && (
                <>
                  <button
                    type="button"
                    className="block w-full px-4 py-3 text-left text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50"
                    onClick={() => {
                      setOpen(false);
                      shell.openCurrentTip();
                    }}
                  >
                    Подсказка страницы
                  </button>
                  <div className="border-t border-gray-200" />
                </>
              )}
              <button
                type="button"
                className="block w-full px-4 py-3 text-left text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50"
                onClick={() => shell.setTipsMuted(!shell.tipsMuted)}
              >
                {shell.tipsMuted ? "Включить подсказки" : "Выключить подсказки"}
              </button>
              <div className="border-t border-gray-200" />
            </>
          )}
          <button
            type="button"
            className="block w-full px-4 py-3 text-left text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50"
            onClick={resetDemo}
          >
            Сбросить демо
          </button>
          <div className="border-t border-line" />
          <button
            type="button"
            className="block w-full px-4 py-3 text-left text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50"
            onClick={exitDemo}
          >
            Выйти из демо
          </button>
        </div>
      )}

      {onDiscuss && ctaVisible && !open && (
        <button
          type="button"
          className="flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-2xl border border-emerald-200 bg-white/95 px-3.5 py-2.5 text-sm font-medium text-gray-900 shadow-lg backdrop-blur-md transition-colors hover:border-emerald-400 hover:bg-emerald-50/80"
          onClick={onDiscuss}
        >
          <span>Обсудить внедрение</span>
          <span className="shrink-0 rounded-md bg-emerald-600 px-1.5 py-0.5 text-[11px] font-semibold text-white">
            −10%
          </span>
        </button>
      )}

      <button
        type="button"
        className={`flex size-16 shrink-0 items-center justify-center rounded-2xl border bg-white/95 p-2.5 shadow-lg backdrop-blur-md transition-colors sm:size-[4.5rem] sm:p-3 ${
          open ? "border-emerald-300 bg-emerald-50/60" : "border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50"
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
          className="size-full max-h-11 max-w-11 object-contain object-center sm:max-h-12 sm:max-w-12"
          decoding="async"
        />
      </button>
    </div>
  );
}
