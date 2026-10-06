import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { setConfirmOpen } from "../lib/overlay-stack";
import { Button } from "./ui";
import { useBodyScrollLock } from "./ui/scroll-lock";

type ToastTone = "success" | "error" | "info";

interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  message?: string;
}

interface ConfirmState {
  title: string;
  message?: string;
  confirmText?: string;
  danger?: boolean;
  resolve: (value: boolean) => void;
}

const ToastContext = createContext<((toast: Omit<Toast, "id">) => void) | null>(null);
const ConfirmContext = createContext<((state: Omit<ConfirmState, "resolve">) => Promise<boolean>) | null>(null);

const TOAST_STYLES: Record<ToastTone, string> = {
  success: "border-brand-soft bg-brand-light text-brand-dark",
  error: "border-red-200 bg-red-50 text-red-700",
  info: "border-line bg-panel text-ink",
};

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  const pushToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { ...toast, id }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 3600);
  }, []);

  const askConfirm = useCallback((state: Omit<ConfirmState, "resolve">) => {
    return new Promise<boolean>((resolve) => setConfirm({ ...state, resolve }));
  }, []);

  const closeConfirm = (value: boolean) => {
    confirm?.resolve(value);
    setConfirm(null);
  };

  useBodyScrollLock(!!confirm);

  useEffect(() => {
    setConfirmOpen(!!confirm);
    return () => setConfirmOpen(false);
  }, [confirm]);

  useEffect(() => {
    if (!confirm) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      closeConfirm(false);
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [confirm]);

  const confirmValue = useMemo(() => askConfirm, [askConfirm]);

  return (
    <ToastContext.Provider value={pushToast}>
      <ConfirmContext.Provider value={confirmValue}>
        {children}

        <div className="fixed inset-x-3 top-20 z-[300] w-auto max-w-sm space-y-2 sm:inset-x-auto sm:right-6 sm:top-[104px] sm:w-[340px]">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={["rounded-2xl border px-4 py-3 shadow-card backdrop-blur", TOAST_STYLES[toast.tone]].join(" ")}
            >
              <div className="text-sm font-semibold">{toast.title}</div>
              {toast.message && <div className="mt-0.5 text-xs opacity-80">{toast.message}</div>}
            </div>
          ))}
        </div>

        {confirm &&
          createPortal(
            <div className="fixed inset-0 z-[250] flex items-center justify-center overflow-y-auto overscroll-none p-4">
              <button
                type="button"
                className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
                aria-label="Отмена"
                onClick={() => closeConfirm(false)}
              />
              <div
                role="dialog"
                aria-modal="true"
                className="relative z-10 w-full max-w-md rounded-3xl border border-line bg-panel p-5 shadow-card sm:p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-lg font-semibold text-ink">{confirm.title}</h2>
                {confirm.message && <p className="mt-2 text-sm leading-relaxed text-ink-muted">{confirm.message}</p>}
                <div className="mt-6 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
                  <Button variant="ghost" className="min-w-0" onClick={() => closeConfirm(false)}>
                    Отмена
                  </Button>
                  <Button
                    variant={confirm.danger ? "danger" : "primary"}
                    className="min-w-0"
                    onClick={() => closeConfirm(true)}
                  >
                    {confirm.confirmText ?? "Подтвердить"}
                  </Button>
                </div>
              </div>
            </div>,
            document.body,
          )}
      </ConfirmContext.Provider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const pushToast = useContext(ToastContext);
  if (!pushToast) throw new Error("useToast must be used inside FeedbackProvider");
  return pushToast;
}

export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("useConfirm must be used inside FeedbackProvider");
  return confirm;
}

function collectValidationMessages(value: unknown) {
  if (!value || typeof value !== "object") return [];

  const result: string[] = [];
  const formErrors = (value as { formErrors?: unknown }).formErrors;
  if (Array.isArray(formErrors)) result.push(...formErrors.filter((item): item is string => typeof item === "string"));

  const fieldErrors = (value as { fieldErrors?: unknown }).fieldErrors;
  if (fieldErrors && typeof fieldErrors === "object") {
    for (const [field, messages] of Object.entries(fieldErrors)) {
      if (!Array.isArray(messages)) continue;
      for (const message of messages) {
        if (typeof message === "string") result.push(`${field}: ${message}`);
      }
    }
  }

  return result;
}

function apiErrorMessage(payload: unknown) {
  if (typeof payload === "string") return payload;
  if (!payload || typeof payload !== "object") return "";

  const details = (payload as { details?: unknown }).details;
  const detailMessages = collectValidationMessages(details);
  if (detailMessages.length > 0) return detailMessages.join("; ");

  const ownMessages = collectValidationMessages(payload);
  if (ownMessages.length > 0) return ownMessages.join("; ");

  const message = (payload as { message?: unknown }).message;
  if (typeof message === "string") return message;

  return "";
}

export function mutationErrorMessage(error: unknown, fallback = "Не удалось выполнить действие") {
  const response = (error as { response?: { status?: number; data?: { error?: unknown } } })?.response;
  const message = apiErrorMessage(response?.data?.error);
  if (message) return message;

  if (!response && (error as { request?: unknown })?.request) {
    return "API недоступен. Проверьте, что backend запущен.";
  }

  if (response?.status === 401) return "Нужно войти заново";
  if (response?.status === 403) return "Недостаточно прав";
  if (response?.status === 404) return "Запись не найдена";
  if (response?.status === 409) return "Конфликт данных. Обновите страницу и повторите действие.";

  const errorMessage = (error as { message?: unknown })?.message;
  if (typeof errorMessage === "string" && errorMessage && errorMessage !== "Network Error") return errorMessage;

  return fallback;
}
