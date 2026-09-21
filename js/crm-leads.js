/**
 * CRM leads → Cloudflare Worker
 * Тексты ошибок для пользователя — объект LEAD_ERROR_MESSAGES ниже.
 */

window.CRM_LEADS = window.CRM_LEADS || {
  endpoint: 'https://gcss-tg-leads.diatsht.workers.dev/',
};

/** Пользовательские тексты ошибок заявки — правь здесь */
const LEAD_ERROR_MESSAGES = {
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
  method_not_allowed: 'Не удалось отправить заявку. Попробуйте ещё раз или позвоните +7 (996) 346-30-49.',
  invalid_json: 'Не удалось отправить заявку. Попробуйте ещё раз.',
  network: 'Нет связи с сервером. Проверьте интернет или позвоните +7 (996) 346-30-49.',
  unknown: 'Не удалось отправить заявку. Попробуйте ещё раз или позвоните +7 (996) 346-30-49.',
};

function ensureLeadOpenedAt() {
  if (!window.__crmLeadOpenedAt) {
    window.__crmLeadOpenedAt = Date.now();
  }
  return window.__crmLeadOpenedAt;
}

ensureLeadOpenedAt();

function getLeadErrorMessage(code) {
  return LEAD_ERROR_MESSAGES[code] || LEAD_ERROR_MESSAGES.unknown;
}

async function sendCrmLead({ name, phone, source, message }) {
  const endpoint = window.CRM_LEADS?.endpoint;
  if (!endpoint) {
    const error = new Error(getLeadErrorMessage('misconfigured'));
    error.code = 'misconfigured';
    throw error;
  }

  const payload = {
    name,
    phone,
    source: source || 'crm',
    openedAt: ensureLeadOpenedAt(),
  };

  if (message) {
    payload.message = message;
  }

  return postCrmLead(endpoint, payload);
}

async function sendCrmChat({ phone, message }) {
  const endpoint = window.CRM_LEADS?.endpoint;
  if (!endpoint) {
    const error = new Error(getLeadErrorMessage('misconfigured'));
    error.code = 'misconfigured';
    throw error;
  }

  return postCrmLead(new URL('chat', endpoint).href, {
    phone,
    message,
  });
}

async function postCrmLead(url, payload) {
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    const error = new Error(getLeadErrorMessage('network'));
    error.code = 'network';
    throw error;
  }

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok || !data.ok) {
    const code = data.code || (response.status === 429 ? 'rate_limited' : 'unknown');
    const error = new Error(getLeadErrorMessage(code));
    error.code = code;
    error.detail = data.detail;
    throw error;
  }

  return data;
}

window.LEAD_ERROR_MESSAGES = LEAD_ERROR_MESSAGES;
window.getLeadErrorMessage = getLeadErrorMessage;
window.sendCrmLead = sendCrmLead;
window.sendCrmChat = sendCrmChat;
window.ensureLeadOpenedAt = ensureLeadOpenedAt;
