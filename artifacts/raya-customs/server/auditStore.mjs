/** PostgreSQL-backed audit trail with JSONL fallback for local development. */
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { databaseEnabled, getDatabase } from './database.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = process.env.RAYA_AUDIT_FILE || path.join(__dirname, 'data', 'audit.jsonl');
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function ensureFile() {
  const dir = path.dirname(FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, '', 'utf8');
}

function buildRow(event) {
  return {
    id: event.id || `aud-${randomBytes(8).toString('hex')}`,
    at: event.at || new Date().toISOString(),
    actorType: event.actorType || 'system',
    actorId: event.actorId || 'unknown',
    actorRole: event.actorRole || null,
    action: event.action || 'unknown',
    entityType: event.entityType || null,
    entityId: event.entityId || null,
    detailEn: event.detailEn || event.action || '',
    detailAr: event.detailAr || event.detailEn || event.action || '',
    meta: event.meta && typeof event.meta === 'object' ? event.meta : undefined,
    requestId: event.requestId || null,
    ip: event.ip || null,
    organizationId: event.organizationId || null,
  };
}

function appendFile(row) {
  ensureFile();
  fs.appendFileSync(FILE, JSON.stringify(row) + '\n', 'utf8');
  return row;
}

function listFile(opts = {}) {
  ensureFile();
  const limit = Math.min(500, Math.max(1, Number(opts.limit) || 100));
  const lines = fs.readFileSync(FILE, 'utf8').split('\n').filter(Boolean);
  const rows = [];
  for (let index = lines.length - 1; index >= 0 && rows.length < limit; index -= 1) {
    try {
      const row = JSON.parse(lines[index]);
      if (opts.action && row.action !== opts.action) continue;
      if (opts.actorId && row.actorId !== opts.actorId) continue;
      rows.push(row);
    } catch {
      // Ignore a corrupt local development line.
    }
  }
  return rows;
}

export async function appendServerAudit(event) {
  const row = buildRow(event);
  if (!databaseEnabled()) return appendFile(row);

  const actorUuid = UUID_PATTERN.test(row.actorId) ? row.actorId : null;
  const actorUserId = row.actorType === 'staff' ? actorUuid : null;
  const actorClientId = row.actorType === 'portal' ? actorUuid : null;
  const result = await getDatabase().query(
    `WITH resolved AS (
       SELECT COALESCE(
         $1::uuid,
         (SELECT organization_id FROM organization_memberships WHERE user_id = $2::uuid LIMIT 1),
         (SELECT organization_id FROM clients WHERE id = $3::uuid LIMIT 1),
         (SELECT id FROM organizations ORDER BY created_at LIMIT 1)
       ) AS organization_id
     )
     INSERT INTO audit_events (
       organization_id, actor_user_id, actor_client_id, action, entity_type,
       entity_id, ip_address, details, occurred_at
     )
     SELECT organization_id, $2::uuid, $3::uuid, $4, $5, $6,
       CASE WHEN $7 = '' THEN NULL ELSE $7::inet END, $8::jsonb, $9::timestamptz
     FROM resolved
     WHERE organization_id IS NOT NULL
     RETURNING id, occurred_at`,
    [
      row.organizationId,
      actorUserId,
      actorClientId,
      row.action,
      row.entityType,
      row.entityId,
      row.ip || '',
      JSON.stringify(row),
      row.at,
    ],
  );
  if (!result.rowCount) throw new Error('audit_organization_not_found');
  return { ...row, id: String(result.rows[0].id), at: result.rows[0].occurred_at.toISOString() };
}

export async function listServerAudit(opts = {}) {
  if (!databaseEnabled()) return listFile(opts);
  const limit = Math.min(500, Math.max(1, Number(opts.limit) || 100));
  const values = [];
  const filters = [];
  if (opts.organizationId) {
    values.push(opts.organizationId);
    filters.push(`organization_id = $${values.length}`);
  }
  if (opts.action) {
    values.push(opts.action);
    filters.push(`action = $${values.length}`);
  }
  if (opts.actorId) {
    values.push(opts.actorId);
    filters.push(`details->>'actorId' = $${values.length}`);
  }
  values.push(limit);
  const result = await getDatabase().query(
    `SELECT id, occurred_at, details
     FROM audit_events
     ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
     ORDER BY occurred_at DESC
     LIMIT $${values.length}`,
    values,
  );
  return result.rows.map((record) => ({
    ...(record.details || {}),
    id: String(record.id),
    at: record.occurred_at.toISOString(),
  }));
}

export async function auditStats(organizationId) {
  if (!databaseEnabled()) {
    ensureFile();
    const totalLines = fs.readFileSync(FILE, 'utf8').split('\n').filter(Boolean).length;
    return { totalLines, file: FILE, backend: 'jsonl' };
  }
  const values = organizationId ? [organizationId] : [];
  const result = await getDatabase().query(
    `SELECT count(*)::int AS total FROM audit_events${organizationId ? ' WHERE organization_id = $1' : ''}`,
    values,
  );
  return { totalLines: result.rows[0].total, file: 'postgresql:audit_events', backend: 'postgresql' };
}
