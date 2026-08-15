/**
 * ASYCUDA / NSW integration channel.
 *
 * Modes:
 * - simulation (default): local queue + synthetic status — safe for demo
 * - live: POST/GET against RAYA_ASYCUDA_BASE_URL when Customs issues access
 *
 * Env:
 *   RAYA_ASYCUDA_MODE=simulation|live
 *   RAYA_ASYCUDA_BASE_URL=https://...
 *   RAYA_ASYCUDA_API_KEY=...
 *   RAYA_ASYCUDA_TIMEOUT_MS=15000
 */
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getShipmentById, patchShipment } from './recordsStore.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR = process.env.RAYA_RECORDS_DIR || path.join(__dirname, 'data');
const QUEUE_FILE = path.join(DIR, 'asycuda-queue.json');

const MODE = (process.env.RAYA_ASYCUDA_MODE || 'simulation').toLowerCase();
const BASE_URL = (process.env.RAYA_ASYCUDA_BASE_URL || '').replace(/\/$/, '');
const API_KEY = process.env.RAYA_ASYCUDA_API_KEY || '';
const TIMEOUT_MS = Number(process.env.RAYA_ASYCUDA_TIMEOUT_MS || 15000);

function ensure() {
  if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
  if (!fs.existsSync(QUEUE_FILE)) fs.writeFileSync(QUEUE_FILE, '[]', 'utf8');
}

function readQueue() {
  ensure();
  try {
    const parsed = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(rows) {
  ensure();
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(rows, null, 2), 'utf8');
}

export function channelInfo() {
  const liveConfigured = MODE === 'live' && Boolean(BASE_URL);
  return {
    mode: liveConfigured ? 'live' : 'simulation',
    live: liveConfigured,
    baseUrlConfigured: Boolean(BASE_URL),
    hasApiKey: Boolean(API_KEY),
    message:
      liveConfigured
        ? 'Live mode: requests go to RAYA_ASYCUDA_BASE_URL'
        : 'Simulation mode: no Customs traffic. Set RAYA_ASYCUDA_MODE=live and RAYA_ASYCUDA_BASE_URL after Customs onboarding.',
  };
}

/**
 * Queue a declaration draft for ASYCUDA handoff / submission.
 */
export async function submitDraft({ draft, shipmentId, approvedBy, forceSimulate }) {
  const id = `aw-${randomBytes(6).toString('hex')}`;
  const createdAt = new Date().toISOString();
  const info = channelInfo();
  const useLive = info.live && !forceSimulate;

  const entry = {
    id,
    createdAt,
    shipmentId: shipmentId || null,
    type: 'SAD_DRAFT',
    status: 'queued',
    approvedBy: approvedBy || 'staff',
    draft,
    channel: useLive ? 'live' : 'simulation',
    externalRef: null,
    response: null,
    error: null,
  };

  if (useLive) {
    try {
      const result = await livePost('/declarations/drafts', {
        messageType: 'SAD_DRAFT',
        payload: draft,
        shipmentId,
        approvedBy,
      });
      entry.status = result.ok ? 'sent' : 'rejected';
      entry.externalRef = result.externalRef || null;
      entry.response = result.body;
      entry.error = result.ok ? null : result.error || 'rejected';
    } catch (e) {
      entry.status = 'rejected';
      entry.error = e.message || String(e);
    }
  } else {
    // Simulation: accept and invent a Customs-style ref
    entry.status = 'simulated';
    entry.externalRef = `SIM-${(draft?.declaration?.commercialRef || shipmentId || id).toString().replace(/[^\w]/g, '').slice(0, 16)}`;
    entry.response = {
      simulated: true,
      note: 'Not sent to Jordan Customs. Register in official ASYCUDA/NSW using exported draft.',
      suggestedNext: ['Verify HS', 'Attach permits', 'Register SAD in ASYCUDA client'],
    };
  }

  const q = readQueue();
  q.unshift(entry);
  writeQueue(q.slice(0, 500));
  return entry;
}

export function listDrafts(limit = 50) {
  return readQueue().slice(0, limit);
}

export function getDraft(id) {
  return readQueue().find((r) => r.id === id) || null;
}

/**
 * Status for a declaration reference (agency or Customs).
 */
export async function fetchDeclarationStatus(ref, organizationId) {
  const info = channelInfo();
  if (info.live) {
    try {
      const result = await liveGet(`/declarations/${encodeURIComponent(ref)}/status`);
      return {
        ok: result.ok,
        live: true,
        ref,
        status: result.body?.status,
        selectivityLane: result.body?.selectivityLane,
        body: result.body,
        reason: result.ok ? 'live' : result.error || 'error',
      };
    } catch (e) {
      return { ok: false, live: true, ref, reason: e.message || String(e) };
    }
  }

  // Simulation from local shipment mirror
  const ships = [];
  try {
    const { allShipmentsMerged } = await import('./recordsStore.mjs');
    ships.push(...(await allShipmentsMerged(organizationId)));
  } catch {
    /* */
  }
  const hit =
    ships.find(
      (s) =>
        s.declarationNo === ref ||
        s.id === ref ||
        s.blNo === ref ||
        s.hsCodeSuggested === ref,
    ) || null;

  if (!hit) {
    return {
      ok: true,
      live: false,
      ref,
      status: 'unknown',
      reason: 'No local mirror for this ref (simulation).',
    };
  }

  return {
    ok: true,
    live: false,
    ref,
    shipmentId: hit.id,
    status: hit.status,
    selectivityLane: hit.selectivityLane || null,
    pcaOpen: hit.pcaOpen || false,
    lastFreeDay: hit.lastFreeDay || null,
    statusEn: hit.statusEn,
    statusAr: hit.statusAr,
    reason: 'Simulated from agency mirror — not live ASYCUDA.',
  };
}

/**
 * Apply a simulated or live status snapshot onto a shipment overlay.
 */
export async function applyStatusToShipment(shipmentId, snapshot, organizationId) {
  const patch = {
    status: snapshot.status || undefined,
    selectivityLane: snapshot.selectivityLane ?? undefined,
    pcaOpen: snapshot.pcaOpen,
    statusEn: snapshot.statusEn,
    statusAr: snapshot.statusAr,
    agentNoteEn: `ASYCUDA channel sync (${snapshot.live ? 'live' : 'simulation'}): ${snapshot.status || 'n/a'}`,
    agentNoteAr: `مزامنة قناة الأسيكودا (${snapshot.live ? 'حي' : 'محاكاة'}): ${snapshot.status || 'n/a'}`,
  };
  // strip undefined
  Object.keys(patch).forEach((k) => patch[k] === undefined && delete patch[k]);
  return patchShipment(shipmentId, patch, organizationId);
}

async function livePost(pathname, body) {
  if (!BASE_URL) throw new Error('RAYA_ASYCUDA_BASE_URL not set');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}${pathname}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const text = await res.text();
    let parsed = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = { raw: text };
    }
    return {
      ok: res.ok,
      statusCode: res.status,
      body: parsed,
      externalRef: parsed?.id || parsed?.externalRef || parsed?.declarationNo || null,
      error: res.ok ? null : parsed?.error || res.statusText,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function liveGet(pathname) {
  if (!BASE_URL) throw new Error('RAYA_ASYCUDA_BASE_URL not set');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}${pathname}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
      },
      signal: ctrl.signal,
    });
    const text = await res.text();
    let parsed = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = { raw: text };
    }
    return {
      ok: res.ok,
      statusCode: res.status,
      body: parsed,
      error: res.ok ? null : parsed?.error || res.statusText,
    };
  } finally {
    clearTimeout(timer);
  }
}
