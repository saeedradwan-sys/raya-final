import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { databaseEnabled, getDatabase } from './database.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR = process.env.RAYA_RECORDS_DIR || path.join(__dirname, 'data');
const FILE = path.join(DIR, 'notifications.json');
const DEFAULT_PREFERENCES = Object.freeze({
  inAppEnabled: true,
  smsEnabled: false,
  whatsappEnabled: false,
  phone: '',
  whatsapp: '',
  smsOptIn: false,
  whatsappOptIn: false,
});

function ensureFile() {
  if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, JSON.stringify({ notifications: [], preferences: {} }, null, 2), 'utf8');
}
function readState() {
  ensureFile();
  try {
    const value = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    return { notifications: Array.isArray(value.notifications) ? value.notifications : [], preferences: value.preferences && typeof value.preferences === 'object' ? value.preferences : {} };
  } catch {
    return { notifications: [], preferences: {} };
  }
}
function writeState(state) {
  ensureFile();
  fs.writeFileSync(FILE, JSON.stringify({ notifications: state.notifications.slice(-2_000), preferences: state.preferences }, null, 2), 'utf8');
}
function keyFor(taxNumber, organizationId) {
  return `${organizationId || 'demo'}:${String(taxNumber || '').trim()}`;
}
function cleanText(value, max = 500) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

async function ensureTable() {
  if (!databaseEnabled()) return;
  await getDatabase().query(`
    CREATE TABLE IF NOT EXISTS raya_notifications (
      id TEXT PRIMARY KEY,
      organization_id TEXT NULL,
      tax_number TEXT NOT NULL,
      shipment_id TEXT NULL,
      kind TEXT NOT NULL,
      title_en TEXT NOT NULL,
      title_ar TEXT NOT NULL,
      body_en TEXT NOT NULL,
      body_ar TEXT NOT NULL,
      read_at TIMESTAMPTZ NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS raya_notification_preferences (
      preference_key TEXT PRIMARY KEY,
      organization_id TEXT NULL,
      tax_number TEXT NOT NULL,
      in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      sms_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      whatsapp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      phone TEXT NULL,
      whatsapp TEXT NULL,
      sms_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
      whatsapp_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

function normalizeNotification(input) {
  return {
    id: input.id || `ntf-${Date.now()}-${randomBytes(4).toString('hex')}`,
    organizationId: input.organizationId || null,
    taxNumber: cleanText(input.taxNumber, 80),
    shipmentId: input.shipmentId || null,
    kind: cleanText(input.kind || 'milestone', 80),
    titleEn: cleanText(input.titleEn || 'Shipment update', 180),
    titleAr: cleanText(input.titleAr || 'تحديث الشحنة', 180),
    bodyEn: cleanText(input.bodyEn || '', 600),
    bodyAr: cleanText(input.bodyAr || input.bodyEn || '', 600),
    readAt: input.readAt || null,
    createdAt: input.createdAt || new Date().toISOString(),
  };
}

export async function getNotificationPreferences(taxNumber, organizationId = null) {
  const key = keyFor(taxNumber, organizationId);
  if (!databaseEnabled()) return { ...DEFAULT_PREFERENCES, ...(readState().preferences[key] || {}) };
  await ensureTable();
  const result = await getDatabase().query(`SELECT in_app_enabled AS "inAppEnabled", sms_enabled AS "smsEnabled", whatsapp_enabled AS "whatsappEnabled", phone, whatsapp, sms_opt_in AS "smsOptIn", whatsapp_opt_in AS "whatsappOptIn" FROM raya_notification_preferences WHERE preference_key=$1`, [key]);
  return { ...DEFAULT_PREFERENCES, ...(result.rows[0] || {}) };
}

export async function saveNotificationPreferences(taxNumber, organizationId, input) {
  const key = keyFor(taxNumber, organizationId);
  const current = await getNotificationPreferences(taxNumber, organizationId);
  const next = {
    ...current,
    inAppEnabled: input.inAppEnabled === undefined ? current.inAppEnabled : Boolean(input.inAppEnabled),
    smsEnabled: input.smsEnabled === undefined ? current.smsEnabled : Boolean(input.smsEnabled),
    whatsappEnabled: input.whatsappEnabled === undefined ? current.whatsappEnabled : Boolean(input.whatsappEnabled),
    phone: cleanText(input.phone === undefined ? current.phone : input.phone, 40),
    whatsapp: cleanText(input.whatsapp === undefined ? current.whatsapp : input.whatsapp, 40),
    smsOptIn: input.smsOptIn === undefined ? current.smsOptIn : Boolean(input.smsOptIn),
    whatsappOptIn: input.whatsappOptIn === undefined ? current.whatsappOptIn : Boolean(input.whatsappOptIn),
  };
  if (!databaseEnabled()) {
    const state = readState();
    state.preferences[key] = next;
    writeState(state);
    return next;
  }
  await ensureTable();
  await getDatabase().query(`
    INSERT INTO raya_notification_preferences (preference_key, organization_id, tax_number, in_app_enabled, sms_enabled, whatsapp_enabled, phone, whatsapp, sms_opt_in, whatsapp_opt_in, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now())
    ON CONFLICT (preference_key) DO UPDATE SET in_app_enabled=EXCLUDED.in_app_enabled, sms_enabled=EXCLUDED.sms_enabled, whatsapp_enabled=EXCLUDED.whatsapp_enabled, phone=EXCLUDED.phone, whatsapp=EXCLUDED.whatsapp, sms_opt_in=EXCLUDED.sms_opt_in, whatsapp_opt_in=EXCLUDED.whatsapp_opt_in, updated_at=now()
  `, [key, organizationId || null, taxNumber, next.inAppEnabled, next.smsEnabled, next.whatsappEnabled, next.phone || null, next.whatsapp || null, next.smsOptIn, next.whatsappOptIn]);
  return next;
}

async function sendTwilioMessage(to, body, channel) {
  const accountSid = String(process.env.TWILIO_ACCOUNT_SID || '').trim();
  const authToken = String(process.env.TWILIO_AUTH_TOKEN || '').trim();
  if (!accountSid || !authToken) return { sent: false, reason: 'twilio_not_configured' };
  const from = channel === 'whatsapp'
    ? String(process.env.TWILIO_WHATSAPP_FROM || '').trim()
    : String(process.env.TWILIO_SMS_FROM || '').trim();
  if (!from || !to) return { sent: false, reason: 'sender_or_recipient_not_configured' };
  const target = channel === 'whatsapp' && !String(to).startsWith('whatsapp:') ? `whatsapp:${to}` : to;
  const sender = channel === 'whatsapp' && !String(from).startsWith('whatsapp:') ? `whatsapp:${from}` : from;
  const form = new URLSearchParams({ To: target, From: sender, Body: body });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) return { sent: false, reason: `twilio_http_${response.status}` };
  const payload = await response.json();
  return { sent: true, sid: payload.sid || null, status: payload.status || null };
}

export async function appendNotification(input, options = {}) {
  const notification = normalizeNotification(input);
  const preferences = await getNotificationPreferences(notification.taxNumber, notification.organizationId);
  const delivery = { inApp: preferences.inAppEnabled, sms: null, whatsapp: null };
  if (!databaseEnabled()) {
    const state = readState();
    if (preferences.inAppEnabled) state.notifications.unshift(notification);
    writeState(state);
  } else {
    await ensureTable();
    if (preferences.inAppEnabled) {
      await getDatabase().query(`INSERT INTO raya_notifications (id, organization_id, tax_number, shipment_id, kind, title_en, title_ar, body_en, body_ar, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING`, [notification.id, notification.organizationId, notification.taxNumber, notification.shipmentId, notification.kind, notification.titleEn, notification.titleAr, notification.bodyEn, notification.bodyAr, notification.createdAt]);
    }
  }
  const externalEnabled = options.sendExternal !== false;
  if (externalEnabled && preferences.smsEnabled && preferences.smsOptIn && preferences.phone) {
    delivery.sms = await sendTwilioMessage(preferences.phone, notification.bodyEn, 'sms').catch((error) => ({ sent: false, reason: error?.message || 'sms_failed' }));
  }
  if (externalEnabled && preferences.whatsappEnabled && preferences.whatsappOptIn && preferences.whatsapp) {
    delivery.whatsapp = await sendTwilioMessage(preferences.whatsapp, notification.bodyEn, 'whatsapp').catch((error) => ({ sent: false, reason: error?.message || 'whatsapp_failed' }));
  }
  return { notification, delivery };
}

export async function listNotifications(taxNumber, organizationId = null, shipmentIds = [], limit = 50) {
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
  if (!databaseEnabled()) {
    const ids = new Set(shipmentIds);
    return readState().notifications.filter((row) => row.taxNumber === taxNumber && (!organizationId || !row.organizationId || row.organizationId === organizationId) && (!row.shipmentId || !ids.size || ids.has(row.shipmentId))).slice(0, safeLimit);
  }
  await ensureTable();
  const params = [taxNumber, organizationId || null, safeLimit];
  const result = await getDatabase().query(`SELECT id, organization_id AS "organizationId", tax_number AS "taxNumber", shipment_id AS "shipmentId", kind, title_en AS "titleEn", title_ar AS "titleAr", body_en AS "bodyEn", body_ar AS "bodyAr", read_at AS "readAt", created_at AS "createdAt" FROM raya_notifications WHERE tax_number=$1 AND ($2::text IS NULL OR organization_id=$2) ORDER BY created_at DESC LIMIT $3`, params);
  return result.rows;
}

export async function markNotificationsRead(taxNumber, organizationId = null, ids = []) {
  if (!ids.length) return { updated: 0 };
  if (!databaseEnabled()) {
    const state = readState();
    const idSet = new Set(ids);
    let updated = 0;
    state.notifications = state.notifications.map((row) => {
      if (row.taxNumber === taxNumber && idSet.has(row.id) && (!organizationId || row.organizationId === organizationId) && !row.readAt) { updated += 1; return { ...row, readAt: new Date().toISOString() }; }
      return row;
    });
    writeState(state);
    return { updated };
  }
  await ensureTable();
  const result = await getDatabase().query(`UPDATE raya_notifications SET read_at=now() WHERE tax_number=$1 AND ($2::text IS NULL OR organization_id=$2) AND id = ANY($3::text[]) AND read_at IS NULL`, [taxNumber, organizationId || null, ids]);
  return { updated: result.rowCount || 0 };
}
