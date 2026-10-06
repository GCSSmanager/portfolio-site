const ENDPOINT = "https://gcss-tg-leads.diatsht.workers.dev/";

const ERRORS: Record<string, string> = {
  rate_limited: "Вы слишком часто отправляете заявки. Подождите минуту и попробуйте снова.",
  too_fast: "Подождите несколько секунд и отправьте ещё раз.",
  telegram_network:
    "Сейчас не удаётся отправить заявку. Позвоните +7 (996) 346-30-49.",
  telegram_failed:
    "Сейчас не удаётся отправить заявку. Позвоните +7 (996) 346-30-49.",
  validation: "Проверьте имя и телефон и попробуйте снова.",
  opened_at_required: "Обновите страницу и отправьте заявку ещё раз.",
  misconfigured: "Сервис заявок временно недоступен. Позвоните +7 (996) 346-30-49.",
  network: "Нет связи с сервером. Проверьте интернет или позвоните +7 (996) 346-30-49.",
  unknown: "Не удалось отправить заявку. Попробуйте ещё раз или позвоните +7 (996) 346-30-49.",
};

let openedAt = Date.now();

export function ensureLeadOpenedAt() {
  return openedAt;
}

function leadErrorMessage(code: string) {
  return ERRORS[code] || ERRORS.unknown;
}

export class CrmLeadError extends Error {
  code: string;

  constructor(code: string) {
    super(leadErrorMessage(code));
    this.code = code;
  }
}

export async function sendCrmLead(input: {
  name: string;
  phone: string;
  source?: string;
  message?: string;
}) {
  const payload: Record<string, string | number> = {
    name: input.name,
    phone: input.phone,
    source: input.source || "demo",
    openedAt: ensureLeadOpenedAt(),
  };
  if (input.message) payload.message = input.message;

  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new CrmLeadError("network");
  }

  let data: { ok?: boolean; code?: string } = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok || !data.ok) {
    const code = data.code || (response.status === 429 ? "rate_limited" : "unknown");
    throw new CrmLeadError(code);
  }

  return data;
}

const MIN_DWELL_MS = 10_000;

/** Повтор при too_fast (воркер требует ≥10 с с openedAt). */
export async function sendCrmLeadReady(input: {
  name: string;
  phone: string;
  source?: string;
  message?: string;
}) {
  try {
    return await sendCrmLead(input);
  } catch (error) {
    if (!(error instanceof CrmLeadError) || error.code !== "too_fast") {
      throw error;
    }
    const wait = Math.max(0, MIN_DWELL_MS - (Date.now() - openedAt) + 250);
    if (wait > 0) {
      await new Promise((resolve) => window.setTimeout(resolve, wait));
    }
    return sendCrmLead(input);
  }
}
