const { createHmac } = require("node:crypto");

const SITE_ORIGIN = "https://maecomdireito.vercel.app";
const EVENT_NAMES = new Set(["page_view", "heartbeat", "triage_start", "triage_submit", "whatsapp_click", "cta_click"]);
const PAGE_PATHS = new Set(["/", "/triagem", "other"]);
const SOURCES = new Set(["direct", "organic", "google", "bing", "instagram", "facebook", "whatsapp", "youtube", "referral", "email", "other"]);
const MEDIUMS = new Set(["organic", "referral", "social", "cpc", "paid_social", "email", "none", "other"]);
const REFERRERS = new Set(["google.com", "www.google.com", "bing.com", "www.bing.com", "instagram.com", "www.instagram.com", "facebook.com", "www.facebook.com", "t.co", "youtube.com", "www.youtube.com", "maecomdireito.vercel.app", "other"]);
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const recentRequests = new Map();

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(JSON.stringify(payload));
}

function validEvent(event) {
  if (!event || typeof event !== "object" || Array.isArray(event)) return false;
  const allowed = new Set(["session_id", "event_id", "event_name", "page_path", "occurred_at", "referrer_host", "source", "medium", "campaign", "content", "term", "device_type", "browser"]);
  if (Object.keys(event).some((key) => !allowed.has(key))) return false;
  if (!UUID_V4.test(event.session_id || "") || !UUID_V4.test(event.event_id || "")) return false;
  if (!EVENT_NAMES.has(event.event_name) || !PAGE_PATHS.has(event.page_path)) return false;
  if (typeof event.occurred_at !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(event.occurred_at)) return false;
  const occurredAt = Date.parse(event.occurred_at);
  if (!Number.isFinite(occurredAt) || Math.abs(Date.now() - occurredAt) > 300000) return false;
  if (event.referrer_host != null && !REFERRERS.has(event.referrer_host)) return false;
  if (event.source != null && !SOURCES.has(event.source)) return false;
  if (event.medium != null && !MEDIUMS.has(event.medium)) return false;
  if (event.campaign != null && !/^cmp_[0-9]{1,12}$/.test(event.campaign)) return false;
  if (event.content != null && !/^cnt_[0-9]{1,12}$/.test(event.content)) return false;
  if (event.term != null && !/^trm_[0-9]{1,12}$/.test(event.term)) return false;
  if (event.device_type != null && !["desktop", "mobile", "tablet", "unknown"].includes(event.device_type)) return false;
  if (event.browser != null && !["chrome", "safari", "firefox", "edge", "other", "unknown"].includes(event.browser)) return false;
  return true;
}

function withinRateLimit(req) {
  // Throttle best-effort por instância; IP não é registrado nem persistido.
  const forwarded = req.headers["x-forwarded-for"];
  const address = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : "unknown";
  const now = Date.now();
  const record = recentRequests.get(address);
  if (!record || now - record.start > 60000) {
    recentRequests.set(address, { start: now, count: 1 });
    if (recentRequests.size > 2000) {
      for (const [key, value] of recentRequests) if (now - value.start > 60000) recentRequests.delete(key);
    }
    return true;
  }
  record.count += 1;
  return record.count <= 60;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { error: "Método não permitido." });
  }
  if (req.headers.origin !== SITE_ORIGIN) return json(res, 403, { error: "Origem inválida." });
  if (req.headers["content-type"]?.split(";")[0]?.trim() !== "application/json") return json(res, 415, { error: "Formato inválido." });
  if (!withinRateLimit(req)) return json(res, 429, { error: "Muitas solicitações." });

  const secret = process.env.ANALYTICS_INGEST_SECRET;
  const backendUrl = process.env.ANALYTICS_BACKEND_URL;
  if (!secret || secret.length < 32 || !backendUrl) return json(res, 503, { error: "Coleta ainda não configurada." });

  let event;
  try {
    event = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch (_) {
    return json(res, 400, { error: "Requisição inválida." });
  }
  let body;
  try { body = JSON.stringify(event); } catch (_) { return json(res, 400, { error: "Requisição inválida." }); }
  if (Buffer.byteLength(body, "utf8") > 4096) return json(res, 413, { error: "Requisição muito grande." });
  if (!validEvent(event)) return json(res, 400, { error: "Evento inválido." });

  const timestamp = String(Date.now());
  const signature = createHmac("sha256", secret).update(timestamp + "." + body, "utf8").digest("hex");
  const base = backendUrl.replace(/\/+$/, "");
  if (base !== "https://mame-heartbeat-log.lovable.app") return json(res, 503, { error: "Destino de analytics inválido." });

  try {
    const upstream = await fetch(base + "/api/public/analytics/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Analytics-Site": SITE_ORIGIN,
        "X-Analytics-Timestamp": timestamp,
        "X-Analytics-Signature": signature,
        "Origin": SITE_ORIGIN,
      },
      body,
      signal: AbortSignal.timeout(5000),
    });
    const text = await upstream.text();
    let result = {};
    try { result = JSON.parse(text); } catch (_) {}
    if (upstream.status === 202) return json(res, 202, { accepted: true, duplicate: result.duplicate === true });
    if (upstream.status === 503) return json(res, 503, { error: "Coleta ainda não configurada." });
    if (upstream.status === 429) return json(res, 429, { error: "Coleta temporariamente limitada." });
    return json(res, 502, { error: "Não foi possível registrar o evento." });
  } catch (_) {
    return json(res, 502, { error: "Serviço de analytics indisponível." });
  }
};
