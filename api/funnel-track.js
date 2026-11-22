// Vercel Serverless Function: api/funnel-track.js
// Lightweight, RGPD-safe post-purchase funnel telemetry for /funil-v8/*
// Logs structured [FUNNEL_TRACK] JSON to Vercel Runtime Logs + optional Upstash Redis / memory buffer.

const crypto = require('crypto');

const ALLOWED_PAGES = new Set([
  'atlas',
  'upgrade-completo',
  'upsell-pro',
  'downsell-kits',
  'entrega-pro',
  'obrigado-basico',
  'obrigado-completo',
  'obrigado-kits',
  'pagamento-pendente',
  'other'
]);

const ALLOWED_EVENTS = new Set([
  'page_enter',
  'scroll_25',
  'scroll_50',
  'scroll_75',
  'scroll_90',
  'demo_interact',
  'quiz_interact',
  'preview_zoom',
  'cta_buy_click',
  'cta_decline_click',
  'page_leave'
]);

function getKvConfig() {
  const url = (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '').replace(/\/+$/, '');
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '';
  return url && token ? { url, token } : null;
}

async function kvCmd(cmdArray) {
  const kv = getKvConfig();
  if (!kv) return null;
  const res = await fetch(kv.url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${kv.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(cmdArray)
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  return data ? data.result : null;
}

function cleanStr(val, maxLen) {
  if (val === null || val === undefined) return '';
  return String(val).replace(/[\r\n\t]+/g, ' ').trim().slice(0, maxLen || 80);
}

function getReadKey() {
  return process.env.FUNNEL_TRACK_READ_KEY || 'em_track_2026';
}

function safeEq(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function summarize(events) {
  const byPage = {};
  const sessions = {};

  for (const ev of events) {
    const p = ev.page || 'other';
    if (!byPage[p]) {
      byPage[p] = {
        enters: 0,
        scroll_50: 0,
        scroll_75: 0,
        demo_interacts: 0,
        quiz_interacts: 0,
        preview_zooms: 0,
        buy_clicks: 0,
        decline_clicks: 0,
        leaves_no_action: 0,
        total_leave_sec: 0,
        leave_count: 0
      };
    }
    const row = byPage[p];
    if (ev.event === 'page_enter') row.enters += 1;
    else if (ev.event === 'scroll_50') row.scroll_50 += 1;
    else if (ev.event === 'scroll_75') row.scroll_75 += 1;
    else if (ev.event === 'demo_interact') row.demo_interacts += 1;
    else if (ev.event === 'quiz_interact') row.quiz_interacts += 1;
    else if (ev.event === 'preview_zoom') row.preview_zooms += 1;
    else if (ev.event === 'cta_buy_click') row.buy_clicks += 1;
    else if (ev.event === 'cta_decline_click') row.decline_clicks += 1;
    else if (ev.event === 'page_leave') {
      row.leave_count += 1;
      row.total_leave_sec += Number(ev.sec) || 0;
      if (ev.detail === 'none') row.leaves_no_action += 1;
    }

    if (ev.sid) {
      if (!sessions[ev.sid]) sessions[ev.sid] = [];
      sessions[ev.sid].push(`${ev.page}:${ev.event}${ev.detail ? '(' + ev.detail + ')' : ''}@${ev.sec || 0}s`);
    }
  }

  for (const p of Object.keys(byPage)) {
    const row = byPage[p];
    row.avg_sec_on_page = row.leave_count ? Math.round(row.total_leave_sec / row.leave_count) : 0;
    delete row.total_leave_sec;
  }

  return {
    total_events: events.length,
    unique_sessions: Object.keys(sessions).length,
    by_page: byPage,
    recent_sessions: Object.entries(sessions).slice(-20).reverse().map(([sid, trail]) => ({ sid, trail })),
    recent_events: events.slice(-30).reverse()
  };
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Access-Control-Allow-Origin', 'https://mapas-posicionamento-eletrodos-two.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const memBuf = (global.__EM_FUNNEL_EVENTS = global.__EM_FUNNEL_EVENTS || []);

  if (req.method === 'GET') {
    const key = cleanStr(req.query && req.query.key, 64);
    if (!safeEq(key, getReadKey())) {
      return res.status(401).json({ ok: false, error: 'Unauthorized. Pass ?key=...' });
    }
    let events = memBuf;
    let storage = 'memory_fallback';
    try {
      const kv = getKvConfig();
      if (kv) {
        const rawList = await kvCmd(['LRANGE', 'em:funnel_events:v1', '0', '299']);
        if (Array.isArray(rawList)) {
          events = rawList.map((item) => {
            try { return JSON.parse(item); } catch (_) { return null; }
          }).filter(Boolean).reverse();
          storage = 'upstash_redis';
        }
      }
    } catch (_) {}
    return res.status(200).json({
      ok: true,
      storage,
      note: 'Also streamed to Vercel Runtime Logs under [FUNNEL_TRACK] and Meta Events Manager (Funil_* custom events).',
      ...summarize(events)
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (_) { body = {}; }
  }
  if (!body || typeof body !== 'object') body = {};

  const page = ALLOWED_PAGES.has(body.page) ? body.page : 'other';
  const event = ALLOWED_EVENTS.has(body.event) ? body.event : '';
  if (!event) {
    return res.status(400).json({ ok: false, error: 'Invalid event' });
  }

  const record = {
    ts: new Date().toISOString(),
    sid: cleanStr(body.sid, 24),
    page,
    event,
    detail: cleanStr(body.detail, 64),
    sec: Math.max(0, Math.min(7200, Math.round(Number(body.sec) || 0))),
    max_scroll: Math.max(0, Math.min(100, Math.round(Number(body.max_scroll) || 0))),
    device: body.device === 'mobile' ? 'mobile' : 'desktop',
    vw: Math.max(0, Math.min(5000, Math.round(Number(body.vw) || 0))),
    sck: cleanStr(body.sck, 40),
    ref_host: cleanStr(body.ref_host, 48),
    has_hotmart_ref: Boolean(body.has_hotmart_ref)
  };

  // Always log structured JSON to Vercel Runtime Logs (persistent in Vercel Dashboard)
  console.log('[FUNNEL_TRACK]', JSON.stringify(record));

  // Keep bounded warm memory buffer
  memBuf.push(record);
  if (memBuf.length > 300) memBuf.splice(0, memBuf.length - 300);

  // Persist to Upstash Redis if configured
  try {
    const kv = getKvConfig();
    if (kv) {
      await kvCmd(['LPUSH', 'em:funnel_events:v1', JSON.stringify(record)]);
      await kvCmd(['LTRIM', 'em:funnel_events:v1', '0', '499']);
    }
  } catch (_) {}

  return res.status(200).json({ ok: true });
};
