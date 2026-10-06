import { useEffect, useState, type FormEvent, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { sendCrmLeadReady } from "../lib/crm-leads";
import { reachCrmFormGoal } from "../lib/metrika";
import { isPhoneRuComplete, phoneRuValidityMessage } from "../lib/phone-ru";
import { PhoneRuInput } from "./PhoneRuInput";
import { Button, Input } from "./ui";
import { useBodyScrollLock } from "./ui/scroll-lock";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Заявка «Обсудить внедрение» со скидкой −10%. */
export function DemoDiscussModal({ open, onOpenChange }: Props) {
  useBodyScrollLock(open);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName("");
    setPhone("");
    setError("");
    setLoading(false);
    setDone(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onOpenChange(false);
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open, onOpenChange]);

  if (!open) return null;

  const stop = (event: MouseEvent) => event.stopPropagation();
  const close = () => onOpenChange(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    const trimmed = name.trim();
    if (!trimmed) {
      setError("Укажите имя");
      return;
    }
    if (!isPhoneRuComplete(phone)) {
      setError(phoneRuValidityMessage());
      return;
    }

    setLoading(true);
    try {
      await sendCrmLeadReady({
        name: trimmed,
        phone,
        source: "demo-discuss",
        message: "Обсудить внедрение (−10% с демо)",
      });
      reachCrmFormGoal();
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отправить заявку");
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[220] flex items-center justify-center overflow-y-auto overscroll-none p-4">
      <button
        type="button"
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
        aria-label="Закрыть"
        onClick={close}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="demo-discuss-title"
        className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-line bg-panel shadow-card"
        onClick={stop}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <h2 id="demo-discuss-title" className="text-lg font-semibold tracking-tight text-ink">
            Обсудить внедрение
          </h2>
          <button
            type="button"
            className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-surface hover:text-ink"
            aria-label="Закрыть"
            onClick={close}
          >
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-5">
          {done ? (
            <p className="text-sm leading-relaxed text-ink">
              Спасибо! Мы свяжемся с вами в течение часа. Скидку −10% зафиксируем в заявке.
            </p>
          ) : (
            <>
              <div className="mb-4 flex items-start gap-3 rounded-xl border border-brand-soft bg-brand-light/50 px-3.5 py-3">
                <span className="shrink-0 rounded-lg bg-brand px-2 py-1 text-xs font-semibold text-white">
                  −10%
                </span>
                <p className="text-sm leading-snug text-ink">
                  Скидка при заказе с демо — зафиксируем в заявке
                </p>
              </div>

              <form className="space-y-3" noValidate onSubmit={submit}>
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-ink-muted">Имя</span>
                  <Input
                    name="name"
                    autoComplete="name"
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value);
                      if (error) setError("");
                    }}
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-ink-muted">Телефон</span>
                  <PhoneRuInput
                    value={phone}
                    onChange={(value) => {
                      setPhone(value);
                      if (error) setError("");
                    }}
                  />
                </label>
                {error ? (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                    {error}
                  </p>
                ) : null}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Отправляем…" : "Отправить"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
