/**
 * GCSS leads → Telegram + двусторонний чат
 * Secrets: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, TELEGRAM_WEBHOOK_SECRET (optional)
 * Binding: LEADS_KV
 *
 * POST /           заявка: name, phone, source, openedAt, message?
 * POST /chat       сообщение из чата: sessionId, phone, message
 * GET  /chat/poll  ответы оператора: sessionId, after
 * POST /webhook    Telegram Bot API (reply на сообщение бота → клиент)
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
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

const MAX_LEADS = 5;
const MAX_CHATS = 10;
const MAX_POLLS = 120;
const WINDOW_MS = 60_000;
const MIN_DWELL_MS = 10_000;
const SESSION_TTL_SEC = 7 * 86400;
const UUID_RE = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    const origin = request.headers.get("Origin") || "";
    const corsHeaders = makeCors(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (path === "/setup-webhook" && request.method === "POST") {
      return handleSetupWebhook(request, env);
    }

    if (path === "/webhook" && request.method === "POST") {
      return handleWebhook(request, env);
    }

    if (path === "/chat/poll" && request.method === "GET") {
      return handleChatPoll(request, env, corsHeaders);
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

  if (now - openedAt < MIN_DWELL_MS) {
    return json(
      { ok: false, error: "Too fast", code: "too_fast", dwellMs: now - openedAt },
      403,
      corsHeaders
    );
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
    const label = source === "crm-quiz" ? "Ответы квиза:" : "Комментарий:";
    lines.push("", label, message);
  }

  const sent = await sendTelegram(env, lines.join("\n"));
  if (!sent.ok) {
    return json(sent.body, sent.status, corsHeaders);
  }
  return json({ ok: true }, 200, corsHeaders);
}

async function handleChat(request, env, data, corsHeaders) {
  const sessionId = String(data.sessionId || "").trim();
  const phone = String(data.phone || "").trim().slice(0, 40);
  const message = String(data.message || "").trim().slice(0, 1000);

  if (!sessionId || !UUID_RE.test(sessionId)) {
    return json({ ok: false, error: "sessionId required", code: "validation" }, 400, corsHeaders);
  }
  if (!phone || !message) {
    return json({ ok: false, error: "Phone and message required", code: "validation" }, 400, corsHeaders);
  }

  const now = Date.now();
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const allowed = await consumeSlot(env.LEADS_KV, `chat:${ip}`, now, MAX_CHATS);
  if (!allowed) {
    return json({ ok: false, error: "Too many requests", code: "rate_limited" }, 429, corsHeaders);
  }

  const tag = sessionTag(sessionId);
  const sess = await readSession(env, sessionId);
  sess.phone = phone;

  const lines = [];
  if (sess.lastAdminText) {
    lines.push(`↩️ Последний ответ оператора:\n«${sess.lastAdminText}»`, "");
  }
  lines.push(`💬 #${tag} · ${phone}`, message);

  const sent = await sendTelegram(env, lines.join("\n"));
  if (!sent.ok) {
    return json(sent.body, sent.status, corsHeaders);
  }

  if (sent.messageId) {
    await env.LEADS_KV.put(`tgmap:${sent.messageId}`, sessionId, { expirationTtl: SESSION_TTL_SEC });
  }
  await writeSession(env, sessionId, sess);

  return json({ ok: true, sessionTag: tag }, 200, corsHeaders);
}

async function handleChatPoll(request, env, corsHeaders) {
  if (!env.LEADS_KV) {
    return json({ ok: false, error: "Server misconfigured", code: "misconfigured" }, 500, corsHeaders);
  }

  const url = new URL(request.url);
  const sessionId = String(url.searchParams.get("sessionId") || "").trim();
  const after = Number(url.searchParams.get("after") || 0);

  if (!sessionId || !UUID_RE.test(sessionId)) {
    return json({ ok: false, error: "Invalid session", code: "validation" }, 400, corsHeaders);
  }

  const now = Date.now();
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const allowed = await consumeSlot(env.LEADS_KV, `poll:${ip}`, now, MAX_POLLS);
  if (!allowed) {
    return json({ ok: false, error: "Too many requests", code: "rate_limited" }, 429, corsHeaders);
  }

  const data = await readReplies(env, sessionId);
  const items = data.items.filter((it) => it.id > after);
  return json({ ok: true, items, seq: data.seq }, 200, corsHeaders);
}

async function handleSetupWebhook(request, env) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_WEBHOOK_SECRET) {
    return json({ ok: false, error: "misconfigured" }, 503, {});
  }
  const hdr = request.headers.get("X-Webhook-Setup") || "";
  if (hdr !== env.TELEGRAM_WEBHOOK_SECRET) {
    return json({ ok: false, error: "forbidden" }, 403, {});
  }

  const webhookUrl = `${new URL(request.url).origin}/webhook`;
  let tg;
  try {
    tg = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: env.TELEGRAM_WEBHOOK_SECRET,
        allowed_updates: ["message"],
      }),
    });
  } catch {
    return json({ ok: false, error: "telegram_network" }, 502, {});
  }

  let body = {};
  try {
    body = await tg.json();
  } catch {
    body = {};
  }
  return json(body, tg.ok ? 200 : 502, {});
}

async function handleWebhook(request, env) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID || !env.LEADS_KV) {
    return new Response("misconfigured", { status: 500 });
  }

  if (env.TELEGRAM_WEBHOOK_SECRET) {
    const secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token") || "";
    if (secret !== env.TELEGRAM_WEBHOOK_SECRET) {
      return new Response("forbidden", { status: 403 });
    }
  }

  let update;
  try {
    update = await request.json();
  } catch {
    return new Response("ok");
  }

  const msg = update.message;
  if (!msg?.text || !msg.reply_to_message) {
    return new Response("ok");
  }

  if (String(msg.chat.id) !== String(env.TELEGRAM_CHAT_ID)) {
    return new Response("ok");
  }

  const sessionId = await env.LEADS_KV.get(`tgmap:${msg.reply_to_message.message_id}`);
  if (!sessionId) {
    return new Response("ok");
  }

  const adminText = String(msg.text).trim().slice(0, 2000);
  if (!adminText) {
    return new Response("ok");
  }

  await appendAdminReply(env, sessionId, adminText);
  return new Response("ok");
}

async function appendAdminReply(env, sessionId, text) {
  const key = `sess:${sessionId}:replies`;
  const data = await readReplies(env, sessionId);
  const id = data.seq + 1;
  data.seq = id;
  data.items.push({ id, text, at: Date.now() });
  if (data.items.length > 50) {
    data.items = data.items.slice(-50);
  }
  await env.LEADS_KV.put(key, JSON.stringify(data), { expirationTtl: SESSION_TTL_SEC });

  const sess = await readSession(env, sessionId);
  sess.lastAdminText = text;
  await writeSession(env, sessionId, sess);
}

async function readSession(env, sessionId) {
  const raw = await env.LEADS_KV.get(`sess:${sessionId}`);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeSession(env, sessionId, sess) {
  await env.LEADS_KV.put(`sess:${sessionId}`, JSON.stringify(sess), { expirationTtl: SESSION_TTL_SEC });
}

async function readReplies(env, sessionId) {
  const raw = await env.LEADS_KV.get(`sess:${sessionId}:replies`);
  if (!raw) return { seq: 0, items: [] };
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data.items)) return { seq: 0, items: [] };
    return { seq: Number(data.seq) || 0, items: data.items };
  } catch {
    return { seq: 0, items: [] };
  }
}

function sessionTag(sessionId) {
  return sessionId.replace(/-/g, "").slice(0, 8).toUpperCase();
}

async function sendTelegram(env, text) {
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
    return { ok: false, status: 502, body: { ok: false, error: "Telegram unavailable", code: "telegram_network" } };
  }

  let body = {};
  try {
    body = await tg.json();
  } catch {
    body = {};
  }

  if (!tg.ok) {
    const detail = body?.description ? String(body.description).slice(0, 120) : "";
    return {
      ok: false,
      status: 502,
      body: {
        ok: false,
        error: "Telegram failed",
        code: "telegram_failed",
        detail: detail || undefined,
      },
    };
  }

  const messageId = body?.result?.message_id;
  return { ok: true, messageId: messageId ? Number(messageId) : undefined };
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
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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
