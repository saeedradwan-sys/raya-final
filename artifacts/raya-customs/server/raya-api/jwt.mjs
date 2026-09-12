/**
 * Minimal HS256 JWT (Node crypto only — no npm deps).
 * Production: use a secrets manager and short-lived tokens + refresh.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

const b64url = (buf) =>
  Buffer.from(buf)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

const b64urlJson = (obj) => b64url(JSON.stringify(obj));

function decodeB64url(str) {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + pad;
  return Buffer.from(b64, 'base64');
}

/**
 * @param {object} payload
 * @param {string} secret
 * @param {number} expiresInSec
 */
export function signJwt(payload, secret, expiresInSec = 8 * 3600) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = {
    ...payload,
    iat: now,
    exp: now + expiresInSec,
  };
  const h = b64urlJson(header);
  const p = b64urlJson(body);
  const data = `${h}.${p}`;
  const sig = createHmac('sha256', secret).update(data).digest();
  return `${data}.${b64url(sig)}`;
}

/**
 * @param {string} token
 * @param {string} secret
 * @returns {{ ok: true, payload: object } | { ok: false, error: string }}
 */
export function verifyJwt(token, secret) {
  if (!token || typeof token !== 'string') {
    return { ok: false, error: 'missing_token' };
  }
  const parts = token.split('.');
  if (parts.length !== 3) {
    return { ok: false, error: 'malformed' };
  }
  const [h, p, s] = parts;
  const data = `${h}.${p}`;
  const expected = createHmac('sha256', secret).update(data).digest();
  let actual;
  try {
    actual = decodeB64url(s);
  } catch {
    return { ok: false, error: 'bad_signature' };
  }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return { ok: false, error: 'invalid_signature' };
  }
  let payload;
  try {
    payload = JSON.parse(decodeB64url(p).toString('utf8'));
  } catch {
    return { ok: false, error: 'bad_payload' };
  }
  if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) {
    return { ok: false, error: 'expired' };
  }
  if (payload.alg && payload.alg !== 'HS256') {
    return { ok: false, error: 'alg' };
  }
  return { ok: true, payload };
}
