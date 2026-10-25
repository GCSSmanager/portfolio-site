const LEADS_ENDPOINT = 'https://gcss-tg-leads.diatsht.workers.dev/'

const LEAD_ERROR_MESSAGES: Record<string, string> = {
  rate_limited:
    'Вы слишком часто отправляете заявки. Подождите минуту и попробуйте снова.',
  too_fast:
    'Вы отправили заявку слишком быстро после открытия страницы. Подождите несколько секунд и отправьте ещё раз.',
  telegram_network:
    'Сейчас не удаётся отправить заявку онлайн. Позвоните нам по телефону +7 (996) 346-30-49 — разберёмся, пока сервис восстанавливается.',
  telegram_failed:
    'Сейчас не удаётся отправить заявку онлайн. Позвоните нам по телефону +7 (996) 346-30-49 — разберёмся, пока сервис восстанавливается.',
  validation: 'Проверьте имя и телефон и попробуйте снова.',
  opened_at_required: 'Обновите страницу и отправьте заявку ещё раз.',
  misconfigured: 'Сервис заявок временно недоступен. Позвоните +7 (996) 346-30-49.',
  method_not_allowed:
    'Не удалось отправить заявку. Попробуйте ещё раз или позвоните +7 (996) 346-30-49.',
  invalid_json: 'Не удалось отправить заявку. Попробуйте ещё раз.',
  network: 'Нет связи с сервером. Проверьте интернет или позвоните +7 (996) 346-30-49.',
  unknown: 'Не удалось отправить заявку. Попробуйте ещё раз или позвоните +7 (996) 346-30-49.',
}

let leadOpenedAt = Date.now()

export function getLeadOpenedAt(): number {
  return leadOpenedAt
}

export function resetLeadOpenedAt(): void {
  leadOpenedAt = Date.now()
}

function getLeadErrorMessage(code?: string): string {
  return (code && LEAD_ERROR_MESSAGES[code]) || LEAD_ERROR_MESSAGES.unknown
}

export type CrmLeadPayload = {
  name: string
  phone: string
  source: string
  message?: string
}

export async function sendCrmLead(payload: CrmLeadPayload): Promise<void> {
  const body = {
    ...payload,
    openedAt: getLeadOpenedAt(),
  }

  let response: Response
  try {
    response = await fetch(LEADS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    const error = new Error(getLeadErrorMessage('network')) as Error & { code?: string }
    error.code = 'network'
    throw error
  }

  const data = (await response.json().catch(() => ({}))) as { ok?: boolean; code?: string }

  if (!response.ok || !data.ok) {
    const code = data.code || 'unknown'
    const error = new Error(getLeadErrorMessage(code)) as Error & { code?: string }
    error.code = code
    throw error
  }
}

export async function sendCrmChat(payload: { phone: string; message: string }): Promise<void> {
  const url = new URL('chat', LEADS_ENDPOINT).href
  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    throw new Error(getLeadErrorMessage('network'))
  }

  const data = (await response.json().catch(() => ({}))) as { ok?: boolean; code?: string }
  if (!response.ok || !data.ok) {
    const code = data.code || (response.status === 429 ? 'rate_limited' : 'unknown')
    throw new Error(getLeadErrorMessage(code))
  }
}
