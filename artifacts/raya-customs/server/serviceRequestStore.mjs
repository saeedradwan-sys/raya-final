/** Durable client-to-staff service request queue with a local-development file fallback. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { databaseEnabled, getDatabase } from './database.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR = process.env.RAYA_RECORDS_DIR || path.join(__dirname, 'data');
const FILE = path.join(DIR, 'service-requests.json');
const TYPES = new Set(['payment', 'statement', 'documents', 'general']);
const STATUSES = new Set(['open', 'in_progress', 'completed', 'rejected']);

function ensureFile() {
  if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, '[]', 'utf8');
}

function readRows() {
  ensureFile();
  try {
    const rows = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

function writeRows(rows) {
  ensureFile();
  fs.writeFileSync(FILE, JSON.stringify(rows, null, 2), 'utf8');
}

function requireOrganizationId(organizationId) {
  if (!organizationId) throw new Error('organization_required');
  return organizationId;
}

function cleanText(value, max = 2000) {
  return String(value || '').trim().slice(0, max);
}

function normalizeDueAt(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('invalid_due_at');
  return date.toISOString();
}

function normalizeRequest(input, identity) {
  const requestType = cleanText(input.requestType || input.type, 32).toLowerCase();
  if (!TYPES.has(requestType)) throw new Error('invalid_request_type');
  const now = new Date().toISOString();
  return {
    id: cleanText(input.id, 120) || `req-${randomBytes(6).toString('hex')}`,
    requestType,
    status: 'open',
    shipmentId: cleanText(input.shipmentId, 120) || null,
    message: cleanText(input.message),
    taxNumber: cleanText(identity.taxNumber, 80),
    clientNameEn: cleanText(identity.clientNameEn, 240),
    clientNameAr: cleanText(identity.clientNameAr, 240),
    assignedTo: null,
    dueAt: null,
    acknowledgedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

function rowFromDatabase(row) {
  const source = row.source_payload || {};
  return {
    ...source,
    id: row.external_id,
    requestType: row.request_type,
    status: row.status,
    shipmentId: source.shipmentId || null,
    message: row.message || '',
    assignedTo: row.assigned_to || null,
    dueAt: row.due_at ? new Date(row.due_at).toISOString() : null,
    acknowledgedAt: row.acknowledged_at ? new Date(row.acknowledged_at).toISOString() : null,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export async function createServiceRequest(input, identity) {
  const next = normalizeRequest(input, identity);
  if (!databaseEnabled()) {
    const rows = readRows();
    rows.unshift(next);
    writeRows(rows);
    return next;
  }

  const organizationId = requireOrganizationId(identity.organizationId);
  const db = getDatabase();
  const clientResult = await db.query(
    'SELECT id FROM clients WHERE organization_id = $1 AND tax_number = $2 AND status = $3 LIMIT 1',
    [organizationId, next.taxNumber, 'active'],
  );
  const clientId = clientResult.rows[0]?.id;
  if (!clientId) throw new Error('client_not_found');

  let caseId = null;
  if (next.shipmentId) {
    const caseResult = await db.query(
      'SELECT id FROM cases WHERE organization_id = $1 AND client_id = $2 AND external_id = $3 LIMIT 1',
      [organizationId, clientId, next.shipmentId],
    );
    caseId = caseResult.rows[0]?.id || null;
  }

  const result = await db.query(
    `INSERT INTO service_requests (
       organization_id, client_id, case_id, external_id, request_type, status,
       message, source_payload, created_at, updated_at
     ) VALUES ($1,$2,$3,$4,$5,'open',$6,$7,now(),now())
     RETURNING *`,
    [organizationId, clientId, caseId, next.id, next.requestType, next.message || null, next],
  );
  return rowFromDatabase(result.rows[0]);
}

export async function listPortalServiceRequests(identity) {
  if (!databaseEnabled()) {
    return readRows().filter((row) => row.taxNumber === identity.taxNumber);
  }
  const result = await getDatabase().query(
    `SELECT sr.* FROM service_requests sr
     JOIN clients c ON c.id = sr.client_id
     WHERE sr.organization_id = $1 AND c.tax_number = $2
     ORDER BY sr.created_at DESC`,
    [requireOrganizationId(identity.organizationId), identity.taxNumber],
  );
  return result.rows.map(rowFromDatabase);
}

export async function listStaffServiceRequests(organizationId) {
  if (!databaseEnabled()) return readRows();
  const result = await getDatabase().query(
    `SELECT sr.* FROM service_requests sr
     WHERE sr.organization_id = $1
     ORDER BY CASE sr.status WHEN 'open' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END,
              sr.created_at DESC`,
    [requireOrganizationId(organizationId)],
  );
  return result.rows.map(rowFromDatabase);
}

export async function updateServiceRequest(id, patch, organizationId) {
  const cleanId = cleanText(id, 120);
  const status = cleanText(patch.status, 32);
  if (status && !STATUSES.has(status)) throw new Error('invalid_request_status');

  if (!databaseEnabled()) {
    const rows = readRows();
    const index = rows.findIndex((row) => row.id === cleanId);
    if (index < 0) return null;
    const existing = rows[index];
    const next = {
      ...existing,
      status: status || existing.status,
      assignedTo: patch.assignedTo === undefined ? existing.assignedTo : cleanText(patch.assignedTo, 160) || null,
      dueAt: patch.dueAt === undefined ? existing.dueAt : normalizeDueAt(patch.dueAt),
      acknowledgedAt: patch.acknowledged === undefined
        ? existing.acknowledgedAt
        : patch.acknowledged ? new Date().toISOString() : null,
      updatedAt: new Date().toISOString(),
    };
    rows[index] = next;
    writeRows(rows);
    return next;
  }

  const org = requireOrganizationId(organizationId);
  const existingResult = await getDatabase().query(
    'SELECT * FROM service_requests WHERE organization_id = $1 AND external_id = $2 LIMIT 1',
    [org, cleanId],
  );
  if (!existingResult.rows[0]) return null;
  const existing = rowFromDatabase(existingResult.rows[0]);
  const next = {
    ...existing,
    status: status || existing.status,
    assignedTo: patch.assignedTo === undefined ? existing.assignedTo : cleanText(patch.assignedTo, 160) || null,
    dueAt: patch.dueAt === undefined ? existing.dueAt : normalizeDueAt(patch.dueAt),
    acknowledgedAt: patch.acknowledged === undefined
      ? existing.acknowledgedAt
      : patch.acknowledged ? new Date().toISOString() : null,
    updatedAt: new Date().toISOString(),
  };
  const result = await getDatabase().query(
    `UPDATE service_requests SET
       status = $3,
       assigned_to = $4,
       due_at = $5,
       acknowledged_at = $6,
       source_payload = $7,
       updated_at = now()
     WHERE organization_id = $1 AND external_id = $2
     RETURNING *`,
    [org, cleanId, next.status, next.assignedTo, next.dueAt, next.acknowledgedAt, next],
  );
  return rowFromDatabase(result.rows[0]);
}