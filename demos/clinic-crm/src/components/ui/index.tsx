import type { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, MouseEvent } from "react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { isConfirmOpen } from "../../lib/overlay-stack";
import { useBodyScrollLock } from "./scroll-lock";

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 sm:mb-6">
      <h1 className="text-lg font-semibold tracking-tight text-ink sm:text-xl">{title}</h1>
      {action}
    </div>
  );
}

export function Button({ className = "", variant = "primary", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  const styles = {
    primary: "bg-brand hover:bg-brand-dark text-white shadow-float",
    ghost: "bg-panel border border-line text-ink-muted hover:text-ink hover:border-line2",
    danger: "bg-red-50 border border-red-200 text-red-600 hover:bg-red-100",
  };
  return (
    <button
      className={`inline-flex h-9 items-center justify-center rounded-xl px-4 text-sm font-medium transition-colors disabled:opacity-50 ${styles[variant]} ${className}`}
      {...props}
    />
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-ink-muted">{label}</span>
      {children}
    </label>
  );
}

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full h-9 px-3 bg-panel border border-line rounded-xl text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/30 ${className}`}
      {...props}
    />
  );
}

export function Select({ className = "", children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`w-full h-9 px-3 bg-panel border border-line rounded-xl text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/30 ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`bg-panel border border-line rounded-3xl shadow-card ${className}`}>{children}</div>;
}

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return (
    <th className={`border-b border-line px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted sm:px-4 sm:py-3 ${className}`}>
      {children}
    </th>
  );
}

export function Td({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return <td className={`border-b border-line/60 px-3 py-2.5 text-ink sm:px-4 sm:py-3 ${className}`}>{children}</td>;
}

export function Modal({
  open,
  title,
  onClose,
  children,
  panelClassName = "",
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  panelClassName?: string;
}) {
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isConfirmOpen()) return;
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  if (!open) return null;

  const stop = (e: MouseEvent) => e.stopPropagation();

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto overscroll-none p-4">
      <button
        type="button"
        className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
        aria-label="Закрыть"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={[
          "relative z-10 my-auto flex w-full max-h-[min(90dvh,40rem)] flex-col overflow-hidden rounded-3xl border border-line bg-panel shadow-card",
          panelClassName || "max-w-lg",
        ].join(" ")}
        onClick={stop}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 px-4 pt-4 sm:px-6 sm:pt-6">
          <h2 className="min-w-0 text-base font-semibold text-ink sm:text-lg">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xl leading-none text-ink-muted hover:bg-surface hover:text-ink"
          >
            ×
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:pb-6 sm:pt-5">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function ModalFooter({
  onCancel,
  onSubmit,
  submitText = "Сохранить",
  submitDisabled = false,
  onDelete,
  deleteText = "Удалить",
  deleteDisabled = false,
  cancelText = "Отмена",
}: {
  onCancel: () => void;
  onSubmit: () => void;
  submitText?: string;
  submitDisabled?: boolean;
  onDelete?: () => void;
  deleteText?: string;
  deleteDisabled?: boolean;
  cancelText?: string;
}) {
  return (
    <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-between">
      {onDelete ? (
        <Button variant="danger" onClick={onDelete} disabled={deleteDisabled} className="w-full whitespace-nowrap sm:w-auto">
          {deleteText}
        </Button>
      ) : (
        <span className="hidden sm:block" />
      )}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:w-auto">
        <Button type="button" variant="ghost" onClick={onCancel} className="min-w-0 whitespace-nowrap">
          {cancelText}
        </Button>
        <Button type="button" disabled={submitDisabled} onClick={onSubmit} className="min-w-0 whitespace-nowrap">
          {submitText}
        </Button>
      </div>
    </div>
  );
}

export { SearchSelect, Picker } from "./SearchSelect";
export type { SearchOption } from "./SearchSelect";
export { Checkbox } from "./Checkbox";
export { ChoiceGroup } from "./ChoiceGroup";
export { DatePicker } from "./DatePicker";
export { TimePicker } from "./TimePicker";

export function Empty({ text }: { text: string }) {
  return <p className="text-sm text-ink-muted text-center py-12">{text}</p>;
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-line/60 ${className}`} />;
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-14" />
      ))}
    </div>
  );
}
