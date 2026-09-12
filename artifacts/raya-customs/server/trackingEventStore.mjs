import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { databaseEnabled, getDatabase } from './database.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR = process.env.RAYA_RECORDS_DIR || path.join(__dirname, 'data');
const FILE = path.join(DIR, 'tracking-events.json');
let tableReady = null;

function ensureFile() {
  if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, '[]', 'utf8');
}

function readFileRows() {
  ensureFile();
  try {
    const value = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeFileRows(rows) {
  ensureFile();
  fs.writeFileSync(FILE, JSON.stringify(rows.slice(-2_000), null, 2), 'utf8');
}

async function ensureTable() {
  if (!databaseEnabled()) return;
  if (!tableReady) {
    tableReady = getDatabase().query(`
      CREATE TABLE IF NOT EXISTS raya_tracking_events (
        id TEXT PRIMARY KEY,
        organization_id TEXT NULL,
        container_number TEXT NOT NULL,
        source TEXT NOT NULL,
        event_type TEXT NULL,
        event_time TIMESTAMPTZ NULL,
        location_code TEXT NULL,
        location_name TEXT NULL,
        payload JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `).catch((error) => {
      tableReady = null;
      throw error;
    });
  }
  await tableReady;
}

function normalizeEvent(event, reference, source, organizationId = null) {
  const eventTime = event?.eventTime || event?.eventDateTime || null;
  const parsed = eventTime ? new Date(eventTime) : null;
  return {
    id: `trk-${Date.now()}-${randomBytes(4).toString('hex')}`,
    organizationId: organizationId || null,
    containerNumber: String(reference || event?.equipmentReference || '').trim().toUpperCase(),
    source: String(source || event?.source || 'webhook').slice(0, 80),
    eventType: event?.eventType || event?.equipmentEventTypeCode || null,
    eventTime: parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : eventTime,
    locationCode: event?.locationCode || event?.eventLocation?.UNLocationCode || null,
    locationName: event?.locationName || event?.eventLocation?.locationName || null,
    payload: event,
    createdAt: new Date().toISOString(),
  };
}

export async function appendTrackingEvents(reference, events, source, organizationId = null) {
  const list = (Array.isArray(events) ? events : []).map((event) => normalizeEvent(event, reference, source, organizationId)).filter((event) => event.containerNumber);
  if (!list.length) return { inserted: 0, events: [] };
  if (!databaseEnabled()) {
    const existing = readFileRows();
    const keys = new Set(existing.map((row) => `${row.containerNumber}|${row.eventType}|${row.eventTime}|${row.locationCode || ''}`));
    const next = list.filter((row) => {
      const key = `${row.containerNumber}|${row.eventType}|${row.eventTime}|${row.locationCode || ''}`;
      if (keys.has(key)) return false;
      keys.add(key);
      return true;
    });
    writeFileRows([...existing, ...next]);
    return { inserted: next.length, events: next };
  }
  await ensureTable();
  const client = await getDatabase().connect();
  try {
    await client.query('BEGIN');
    const inserted = [];
    for (const row of list) {
      const result = await client.query(`
        INSERT INTO raya_tracking_events
          (id, organization_id, container_number, source, event_type, event_time, location_code, location_name, payload, created_at)
        SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10
        WHERE NOT EXISTS (
          SELECT 1 FROM raya_tracking_events
          WHERE container_number=$3 AND COALESCE(event_type,'')=COALESCE($5,'')
            AND COALESCE(event_time::text,'')=COALESCE($6::timestamptz::text,'')
            AND COALESCE(location_code,'')=COALESCE($7,'')
        )
        RETURNING id
      `, [row.id, row.organizationId, row.containerNumber, row.source, row.eventType, row.eventTime, row.locationCode, row.locationName, JSON.stringify(row.payload), row.createdAt]);
      if (result.rowCount) inserted.push(row);
    }
    await client.query('COMMIT');
    return { inserted: inserted.length, events: inserted };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function listTrackingEvents(reference, organizationId = null, limit = 100) {
  const normalized = String(reference || '').trim().toUpperCase();
  const safeLimit = Math.min(500, Math.max(1, Number(limit) || 100));
  if (!databaseEnabled()) {
    return readFileRows()
      .filter((row) => row.containerNumber === normalized && (!organizationId || !row.organizationId || row.organizationId === organizationId))
      .sort((a, b) => Date.parse(a.eventTime || a.createdAt) - Date.parse(b.eventTime || b.createdAt))
      .slice(-safeLimit);
  }
  await ensureTable();
  const result = await getDatabase().query(`
    SELECT id, organization_id AS "organizationId", container_number AS "containerNumber", source,
           event_type AS "eventType", event_time AS "eventTime", location_code AS "locationCode",
           location_name AS "locationName", payload, created_at AS "createdAt"
    FROM raya_tracking_events
    WHERE container_number = $1 AND ($2::text IS NULL OR organization_id = $2)
    ORDER BY COALESCE(event_time, created_at) DESC
    LIMIT $3
  `, [normalized, organizationId || null, safeLimit]);
  return result.rows.reverse();
}
