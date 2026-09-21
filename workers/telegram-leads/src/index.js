/**
 * GCSS leads → Telegram
 * Secrets: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
 * Binding: LEADS_KV
 *
 * POST /        заявка: name, phone, source, openedAt, message?
 * POST /chat    сообщение из чата: phone, message
 */

const ALLOWED_ORIGINS = [
  "https://gcss.ru",
  "https://www.gcss.ru",
  "https://gcss-portfolio.ru",
  "https://www.gcss-portfolio.ru",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
];

const MAX_LEADS = 5;
const MAX_CHATS = 10;
const WINDOW_MS = 60_000;
const MIN_DWELL_MS = 10_000;

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const corsHeaders = makeCors(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return json({ ok: false, error: "Method not allowed", code: "method_not_allowed" }, 405, corsHeaders);
    }

    if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
      return json({ ok: false, error: "Server misconfigured", code: "misconfigured" }, 500, corsHeaders);
    }

    let data;
    try {
      data = await request.json();
    } catch {
      return json({ ok: false, error: "Invalid JSON", code: "invalid_json" }, 400, corsHeaders);
    }

    const path = new URL(request.url).pathname.replace(/\/+$/, "") || "/";
    if (path === "/chat") {
      return handleChat(request, env, data, corsHeaders);
    }

    return handleLead(request, env, data, corsHeaders);
  },
};

async function handleLead(request, env, data, corsHeaders) {
  const name = String(data.name || "").trim().slice(0, 80);
  const phone = String(data.phone || "").trim().slice(0, 40);
  const source = String(data.source || "crm").trim().slice(0, 60);
  const message = String(data.message || "").trim().slice(0, 1000);
  const openedAt = Number(data.openedAt);

  if (!name || !phone) {
    return json({ ok: false, error: "Name and phone required", code: "validation" }, 400, corsHeaders);
  }

  const now = Date.now();
  if (!Number.isFinite(openedAt)) {
    return json({ ok: false, error: "openedAt required", code: "opened_at_required" }, 400, corsHeaders);
  }

  const dwell = now - openedAt;
  if (dwell < MIN_DWELL_MS) {
    return json({ ok: false, error: "Too fast", code: "too_fast", dwellMs: dwell }, 403, corsHeaders);
  }

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const allowed = await consumeSlot(env.LEADS_KV, `rl:${ip}`, now, MAX_LEADS);
  if (!allowed) {
    return json({ ok: false, error: "Too many requests", code: "rate_limited" }, 429, corsHeaders);
  }

  const lines = [
    "🆕 Заявка с сайта",
    `Имя: ${name}`,
    `Телефон: ${phone}`,
    `Откуда: ${source}`,
  ];
  if (message) {
    lines.push(`Сообщение из чата: ${message}`);
  }

  return sendTelegram(env, lines.join("\n"), corsHeaders);
}

async function handleChat(request, env, data, corsHeaders) {
  const phone = String(data.phone || "").trim().slice(0, 40);
  const message = String(data.message || "").trim().slice(0, 1000);

  if (!phone || !message) {
    return json({ ok: false, error: "Phone and message required", code: "validation" }, 400, corsHeaders);
  }

  const now = Date.now();
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const allowed = await consumeSlot(env.LEADS_KV, `chat:${ip}`, now, MAX_CHATS);
  if (!allowed) {
    return json({ ok: false, error: "Too many requests", code: "rate_limited" }, 429, corsHeaders);
  }

  const text = [
    "💬 Сообщение из чата",
    `${phone} написал в чат:`,
    message,
  ].join("\n");

  return sendTelegram(env, text, corsHeaders);
}

async function sendTelegram(env, text, corsHeaders) {
  let tg;
  try {
    tg = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text,
      }),
    });
  } catch {
    return json({ ok: false, error: "Telegram unavailable", code: "telegram_network" }, 502, corsHeaders);
  }

  if (!tg.ok) {
    let detail = "";
    try {
      const body = await tg.json();
      detail = body?.description ? String(body.description).slice(0, 120) : "";
    } catch {
      /* ignore */
    }
    return json(
      {
        ok: false,
        error: "Telegram failed",
        code: "telegram_failed",
        detail: detail || undefined,
      },
      502,
      corsHeaders
    );
  }

  return json({ ok: true }, 200, corsHeaders);
}

async function consumeSlot(kv, key, now, max) {
  const raw = await kv.get(key);
  let entry = { n: 0, reset: now + WINDOW_MS };
  if (raw) {
    try {
      entry = JSON.parse(raw);
    } catch {
      entry = { n: 0, reset: now + WINDOW_MS };
    }
    if (now >= entry.reset) {
      entry = { n: 0, reset: now + WINDOW_MS };
    }
  }
  if (entry.n >= max) {
    return false;
  }
  entry.n += 1;
  const ttlSec = Math.max(60, Math.ceil((entry.reset - now) / 1000));
  await kv.put(key, JSON.stringify(entry), { expirationTtl: ttlSec });
  return true;
}

function makeCors(origin) {
  const allow =
    ALLOWED_ORIGINS.includes(origin) || origin.endsWith(".github.io")
      ? origin
      : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(body, status, corsHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders,
    },
  });
}
