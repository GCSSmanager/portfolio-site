import { buildMetrikaPayload } from './metrika'

const WORKER_ORIGIN = 'https://gcss-tg-leads.diatsht.workers.dev'
const LEADS_ENDPOINT = `${WORKER_ORIGIN}/`
const CHAT_ENDPOINT = `${WORKER_ORIGIN}/chat`
const CHAT_POLL_ENDPOINT = `${WORKER_ORIGIN}/chat/poll`

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
  /** false — без кнопки Метрики в TG; по умолчанию crm-form */
  metrikaGoal?: string | false
}

export async function sendCrmLead(payload: CrmLeadPayload): Promise<void> {
  const { metrikaGoal = 'crm-form', ...lead } = payload
  const body: Record<string, unknown> = {
    ...lead,
    openedAt: getLeadOpenedAt(),
  }
  if (metrikaGoal !== false) {
    body.metrika = await buildMetrikaPayload(metrikaGoal, lead)
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

export async function sendCrmChat(payload: {
  phone: string
  message: string
  sessionId: string
}): Promise<void> {
  let response: Response
  try {
    response = await fetch(CHAT_ENDPOINT, {
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

export type CrmChatReply = { id: number; text: string; at?: number }

export async function pollCrmChat(
  sessionId: string,
  after: number,
): Promise<{ items: CrmChatReply[]; seq: number }> {
  const url = new URL(CHAT_POLL_ENDPOINT)
  url.searchParams.set('sessionId', sessionId)
  url.searchParams.set('after', String(after))

  let response: Response
  try {
    response = await fetch(url.toString(), { method: 'GET', credentials: 'omit' })
  } catch {
    throw new Error(getLeadErrorMessage('network'))
  }

  const data = (await response.json().catch(() => ({}))) as {
    ok?: boolean
    code?: string
    items?: CrmChatReply[]
    seq?: number
  }
  if (!response.ok || !data.ok) {
    const code = data.code || (response.status === 429 ? 'rate_limited' : 'unknown')
    throw new Error(getLeadErrorMessage(code))
  }
  return { items: data.items ?? [], seq: data.seq ?? after }
}

const CHAT_SESSION_KEY = 'gcss-crm-chat-session'

export function createChatSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function loadChatSessionId(): string | null {
  try {
    return sessionStorage.getItem(CHAT_SESSION_KEY)
  } catch {
    return null
  }
}

export function saveChatSessionId(sessionId: string): void {
  try {
    sessionStorage.setItem(CHAT_SESSION_KEY, sessionId)
  } catch {
    /* ignore */
  }
}
