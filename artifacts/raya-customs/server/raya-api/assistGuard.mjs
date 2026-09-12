/**
 * Assist endpoint guards: per-user rate limit + safe message bounds + JSON extract.
 * Use before Llama calls on POST /api/assist and /api/assist/stream.
 */

const WINDOW_MS = Math.max(10_000, Number(process.env.RAYA_ASSIST_WINDOW_MS || 60_000));
const MAX_REQUESTS = Math.max(3, Number(process.env.RAYA_ASSIST_MAX_REQUESTS || 20));
const MAX_MESSAGE_CHARS = Math.max(200, Number(process.env.RAYA_ASSIST_MAX_MESSAGE_CHARS || 4_000));

/** @type {Map<string, number[]>} */
const buckets = new Map();

export function assistClientKey(req, payload) {
  const sub = payload?.sub || 'anon';
  const ip = String(req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown');
  return `${sub}:${ip}`;
}

/**
 * @returns {{ allowed: boolean, retryAfterSec: number, remaining: number }}
 */
export function checkAssistRateLimit(key) {
  const now = Date.now();
  const recent = (buckets.get(key) || []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) {
    buckets.set(key, recent);
    const retryAfterSec = Math.max(1, Math.ceil((recent[0] + WINDOW_MS - now) / 1000));
    return { allowed: false, retryAfterSec, remaining: 0 };
  }
  recent.push(now);
  buckets.set(key, recent);
  return { allowed: true, retryAfterSec: 0, remaining: MAX_REQUESTS - recent.length };
}

/**
 * Validate chat / assist user message.
 * @returns {{ ok: true, message: string } | { ok: false, error: string, maxChars?: number }}
 */
export function validateAssistMessage(raw) {
  const message = String(raw || '').trim();
  if (!message) return { ok: false, error: 'message_required' };
  if (message.length > MAX_MESSAGE_CHARS) {
    return { ok: false, error: 'message_too_long', maxChars: MAX_MESSAGE_CHARS };
  }
  return { ok: true, message };
}

/**
 * Strip markdown fences and parse JSON. Returns null on failure.
 */
export function safeParseLlamaJson(text) {
  if (!text || typeof text !== 'string') return null;
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  const startArr = cleaned.indexOf('[');
  const startObj = cleaned.indexOf('{');
  let start = -1;
  if (startArr >= 0 && (startObj < 0 || startArr < startObj)) start = startArr;
  else if (startObj >= 0) start = startObj;
  if (start > 0) cleaned = cleaned.slice(start);
  const endArr = cleaned.lastIndexOf(']');
  const endObj = cleaned.lastIndexOf('}');
  const end = Math.max(endArr, endObj);
  if (end > 0) cleaned = cleaned.slice(0, end + 1);
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

/**
 * Light structural checks for agent JSON (no zod dependency on server).
 */
export function validateAgentPayload(agentId, parsed) {
  if (parsed == null) return { ok: false, error: 'invalid_json' };
  if (agentId === 'hs') {
    const items = Array.isArray(parsed) ? parsed : [parsed];
    if (!items.length) return { ok: false, error: 'empty_hs_list' };
    const normalized = items.slice(0, 5).map((item) => ({
      hs_code: String(item?.hs_code || item?.hsCode || '').slice(0, 15),
      description_en: String(item?.description_en || '').slice(0, 500),
      description_ar: String(item?.description_ar || '').slice(0, 500),
      duty_rate: String(item?.duty_rate || item?.dutyRate || '').slice(0, 40),
      confidence_pct: Math.min(100, Math.max(0, Number(item?.confidence_pct ?? item?.confidence) || 0)),
      reasoning_en: String(item?.reasoning_en || '').slice(0, 1000),
      reasoning_ar: String(item?.reasoning_ar || '').slice(0, 1000),
      needs_review: item?.needs_review !== false,
    }));
    if (!normalized.some((x) => x.hs_code)) return { ok: false, error: 'missing_hs_code' };
    return { ok: true, data: normalized };
  }
  if (agentId === 'docs') {
    return {
      ok: true,
      data: {
        core_docs: Array.isArray(parsed.core_docs) ? parsed.core_docs.map(String).slice(0, 20) : [],
        authority_docs: Array.isArray(parsed.authority_docs) ? parsed.authority_docs.slice(0, 12) : [],
        notes_en: String(parsed.notes_en || '').slice(0, 2000),
        notes_ar: String(parsed.notes_ar || '').slice(0, 2000),
        confidence: ['high', 'medium', 'low'].includes(parsed.confidence) ? parsed.confidence : 'medium',
      },
    };
  }
  if (agentId === 'next_action') {
    const actions = Array.isArray(parsed.actions) ? parsed.actions.slice(0, 10) : [];
    return {
      ok: true,
      data: {
        actions: actions.map((a, i) => ({
          priority: Number(a?.priority) || i + 1,
          title_en: String(a?.title_en || 'Action').slice(0, 200),
          title_ar: String(a?.title_ar || 'إجراء').slice(0, 200),
          detail_en: String(a?.detail_en || '').slice(0, 1000),
          detail_ar: String(a?.detail_ar || '').slice(0, 1000),
          urgency: ['critical', 'high', 'medium', 'low'].includes(a?.urgency) ? a.urgency : 'medium',
          route: a?.route ? String(a.route).slice(0, 80) : undefined,
        })),
        disclaimer_en: String(parsed.disclaimer_en || '').slice(0, 500),
        disclaimer_ar: String(parsed.disclaimer_ar || '').slice(0, 500),
      },
    };
  }
  return { ok: true, data: parsed };
}

export const ASSIST_LIMITS = {
  windowMs: WINDOW_MS,
  maxRequests: MAX_REQUESTS,
  maxMessageChars: MAX_MESSAGE_CHARS,
};
