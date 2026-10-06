import { useEffect, useState, type FormEvent, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { useDemoShellOptional } from "../demo-shell";
import { sendCrmLeadReady } from "../lib/crm-leads";
import { reachCrmFormGoal } from "../lib/metrika";
import { isPhoneRuComplete, phoneRuValidityMessage } from "../lib/phone-ru";
import { PhoneRuInput } from "./PhoneRuInput";
import { Button } from "./ui";
import { useBodyScrollLock } from "./ui/scroll-lock";

const STORAGE_KEY = "clinic-crm-demo.phone-unlocked";
const DELAY_MS = 2 * 60_000;

function readUnlocked() {
  try {
    return Boolean(localStorage.getItem(STORAGE_KEY));
  } catch {
    return false;
  }
}

function writeUnlocked(phone: string) {
  try {
    localStorage.setItem(STORAGE_KEY, phone);
  } catch {
    /* ignore */
  }
}

interface Props {
  /** Пока сверху открыто «Обсудить внедрение» — гейт не показываем. */
  paused?: boolean;
}

/** Через 2 мин просит телефон, чтобы продолжить демо. */
export function DemoPhoneGate({ paused = false }: Props) {
  const shell = useDemoShellOptional();
  const tipOpen = shell?.tipOpen ?? false;

  const [unlocked, setUnlocked] = useState(readUnlocked);
  const [due, setDue] = useState(false);
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (unlocked) return;
    const timer = window.setTimeout(() => setDue(true), DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [unlocked]);

  const open = due && !unlocked && !tipOpen && !paused;
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open]);

  if (!open) return null;

  const stop = (event: MouseEvent) => event.stopPropagation();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    if (!isPhoneRuComplete(phone)) {
      setError(phoneRuValidityMessage());
      return;
    }

    setLoading(true);
    try {
      await sendCrmLeadReady({
        name: "Демо CRM",
        phone,
        source: "demo-phone-gate",
      });
      reachCrmFormGoal();
      writeUnlocked(phone);
      setUnlocked(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отправить номер");
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[210] flex items-center justify-center overflow-y-auto overscroll-none p-4">
      <div className="absolute inset-0 bg-ink/55 backdrop-blur-md" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="demo-phone-gate-title"
        className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-line bg-panel shadow-card"
        onClick={stop}
      >
        <div className="px-5 py-5 sm:px-6 sm:py-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Демо CRM</p>
          <h2
            id="demo-phone-gate-title"
            className="mt-1 text-xl font-semibold tracking-tight text-ink"
          >
            Продолжить демо
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            Введите номер телефона, чтобы продолжить пользоваться демо-версией.
          </p>

          <form className="mt-5 space-y-3" onSubmit={submit}>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-ink-muted">Телефон</span>
              <PhoneRuInput value={phone} onChange={setPhone} autoFocus required />
            </label>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Отправляем…" : "Продолжить"}
            </Button>
          </form>
        </div>
      </div>
    </div>,
    document.body,
  );
}
