/** PostgreSQL-backed operational records with a file fallback for local development. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { databaseEnabled, getDatabase } from './database.mjs';
import { SEED_SHIPMENTS } from './seedShipments.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR = process.env.RAYA_RECORDS_DIR || path.join(__dirname, 'data');
const SHIP_FILE = path.join(DIR, 'user-shipments.json');
const DISB_FILE = path.join(DIR, 'user-disbursements.json');

function ensureFiles() {
  if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
  if (!fs.existsSync(SHIP_FILE)) fs.writeFileSync(SHIP_FILE, '[]', 'utf8');
  if (!fs.existsSync(DISB_FILE)) fs.writeFileSync(DISB_FILE, '[]', 'utf8');
}

function readFileRows(file) {
  ensureFiles();
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeFileRows(file, rows) {
  ensureFiles();
  fs.writeFileSync(file, JSON.stringify(rows, null, 2), 'utf8');
}

function requireOrganizationId(organizationId) {
  if (!organizationId) throw new Error('organization_required');
  return organizationId;
}

function withoutCredential(row) {
  const { accessCode: _accessCode, ...safe } = row || {};
  return safe;
}

async function ensureClient(client, organizationId, row) {
  const taxNumber = String(row.taxNumber || '').trim();
  if (!taxNumber) throw new Error('tax_number_required');
  const result = await client.query(
    `INSERT INTO clients (organization_id, tax_number, legal_name_en, legal_name_ar, status)
     VALUES ($1, $2, $3, $4, 'active')
     ON CONFLICT (organization_id, tax_number) DO UPDATE SET
       legal_name_en = EXCLUDED.legal_name_en,
       legal_name_ar = COALESCE(EXCLUDED.legal_name_ar, clients.legal_name_ar),
       updated_at = now()
     RETURNING id`,
    [organizationId, taxNumber, row.customerNameEn || taxNumber, row.customerNameAr || null],
  );
  return result.rows[0].id;
}

export async function listUserShipments(organizationId) {
  if (!databaseEnabled()) return readFileRows(SHIP_FILE);
  const org = requireOrganizationId(organizationId);
  const result = await getDatabase().query(
    `SELECT source_payload FROM cases
     WHERE organization_id = $1
     ORDER BY updated_at DESC`,
    [org],
  );
  return result.rows.map((row) => row.source_payload || {});
}

export async function listShipments(organizationId) {
  return listUserShipments(organizationId);
}

export async function allShipmentsMerged(organizationId) {
  const user = await listUserShipments(organizationId);
  if (databaseEnabled()) return user;
  const map = new Map(SEED_SHIPMENTS.map((shipment) => [shipment.id, { ...shipment }]));
  for (const shipment of user) map.set(shipment.id, shipment);
  return [...map.values()];
}

export async function getShipmentById(id, organizationId) {
  if (!databaseEnabled()) {
    return (await allShipmentsMerged()).find((shipment) => shipment.id === id) || null;
  }
  const result = await getDatabase().query(
    `SELECT source_payload FROM cases WHERE organization_id = $1 AND external_id = $2 LIMIT 1`,
    [requireOrganizationId(organizationId), id],
  );
  return result.rows[0]?.source_payload || null;
}

export async function listShipmentsForTax(taxNumber, organizationId) {
  if (!databaseEnabled()) {
    return (await allShipmentsMerged()).filter((shipment) => shipment.taxNumber === taxNumber);
  }
  const result = await getDatabase().query(
    `SELECT c.source_payload
     FROM cases c JOIN clients cl ON cl.id = c.client_id
     WHERE c.organization_id = $1 AND cl.tax_number = $2
     ORDER BY c.updated_at DESC`,
    [requireOrganizationId(organizationId), taxNumber],
  );
  return result.rows.map((row) => row.source_payload || {});
}

export async function listShipmentsByContainer(containerNumber, organizationId = null) {
  const normalized = String(containerNumber || '').trim().toUpperCase();
  if (!normalized) return [];
  if (!databaseEnabled()) {
    return (await allShipmentsMerged()).filter((shipment) => String(shipment.containerNo || '').trim().toUpperCase() === normalized);
  }
  const result = await getDatabase().query(
    `SELECT source_payload
     FROM cases
     WHERE container_number = $1 AND ($2::text IS NULL OR organization_id = $2)
     ORDER BY updated_at DESC`,
    [normalized, organizationId || null],
  );
  return result.rows.map((row) => row.source_payload || {});
}

export async function listDisbursements(organizationId) {
  if (!databaseEnabled()) return readFileRows(DISB_FILE);
  const result = await getDatabase().query(
    `SELECT source_payload FROM disbursements
     WHERE organization_id = $1
     ORDER BY updated_at DESC`,
    [requireOrganizationId(organizationId)],
  );
  return result.rows.map((row) => row.source_payload || {});
}

export async function upsertShipment(row, organizationId) {
  const id = row.id || `shp-user-${randomBytes(4).toString('hex')}`;
  const next = { ...withoutCredential(row), id, updatedAt: new Date().toISOString() };
  if (!databaseEnabled()) {
    const rows = readFileRows(SHIP_FILE);
    const index = rows.findIndex((item) => item.id === id);
    if (index >= 0) rows[index] = { ...rows[index], ...next };
    else rows.unshift(next);
    writeFileRows(SHIP_FILE, rows);
    return next;
  }

  const org = requireOrganizationId(organizationId);
  const db = getDatabase();
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const clientId = await ensureClient(client, org, next);
    await client.query(
      `INSERT INTO cases (
         organization_id, client_id, external_id, declaration_number, bill_of_lading,
         container_number, status, selectivity_lane, last_free_day, goods_description,
         hs_code, source_payload, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,now())
       ON CONFLICT (organization_id, external_id) DO UPDATE SET
         client_id = EXCLUDED.client_id,
         declaration_number = EXCLUDED.declaration_number,
         bill_of_lading = EXCLUDED.bill_of_lading,
         container_number = EXCLUDED.container_number,
         status = EXCLUDED.status,
         selectivity_lane = EXCLUDED.selectivity_lane,
         last_free_day = EXCLUDED.last_free_day,
         goods_description = EXCLUDED.goods_description,
         hs_code = EXCLUDED.hs_code,
         source_payload = EXCLUDED.source_payload,
         updated_at = now()`,
      [
        org,
        clientId,
        id,
        next.declarationNo || null,
        next.blNo || null,
        next.containerNo || null,
        next.status || 'pre_arrival',
        next.selectivityLane || null,
        next.lastFreeDay || null,
        next.goodsEn || null,
        next.hsCodeSuggested || null,
        next,
      ],
    );
    await client.query('COMMIT');
    return next;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteShipment(id, organizationId) {
  if (!databaseEnabled()) {
    writeFileRows(SHIP_FILE, readFileRows(SHIP_FILE).filter((row) => row.id !== id));
    return { ok: true };
  }
  const result = await getDatabase().query(
    'DELETE FROM cases WHERE organization_id = $1 AND external_id = $2',
    [requireOrganizationId(organizationId), id],
  );
  return { ok: true, deleted: result.rowCount > 0 };
}

export async function upsertDisbursement(row, organizationId) {
  const id = row.id || `disb-user-${randomBytes(4).toString('hex')}`;
  const next = { ...row, id, currency: row.currency || 'JOD', updatedAt: new Date().toISOString() };
  if (!databaseEnabled()) {
    const rows = readFileRows(DISB_FILE);
    const index = rows.findIndex((item) => item.id === id);
    if (index >= 0) rows[index] = { ...rows[index], ...next };
    else rows.unshift(next);
    writeFileRows(DISB_FILE, rows);
    return next;
  }
  await getDatabase().query(
    `INSERT INTO disbursements (
       organization_id, external_id, declaration_number, status, currency, source_payload, updated_at
     ) VALUES ($1,$2,$3,$4,$5,$6,now())
     ON CONFLICT (organization_id, external_id) DO UPDATE SET
       declaration_number = EXCLUDED.declaration_number,
       status = EXCLUDED.status,
       currency = EXCLUDED.currency,
       source_payload = EXCLUDED.source_payload,
       updated_at = now()`,
    [
      requireOrganizationId(organizationId),
      id,
      next.declarationNo || null,
      next.status || null,
      next.currency,
      next,
    ],
  );
  return next;
}

export async function deleteDisbursement(id, organizationId) {
  if (!databaseEnabled()) {
    writeFileRows(DISB_FILE, readFileRows(DISB_FILE).filter((row) => row.id !== id));
    return { ok: true };
  }
  const result = await getDatabase().query(
    'DELETE FROM disbursements WHERE organization_id = $1 AND external_id = $2',
    [requireOrganizationId(organizationId), id],
  );
  return { ok: true, deleted: result.rowCount > 0 };
}

export async function patchShipment(id, patch, organizationId) {
  const existing = await getShipmentById(id, organizationId);
  if (!existing) return null;
  return upsertShipment({ ...existing, ...patch, id, updatedAt: new Date().toISOString() }, organizationId);
}

export async function toggleDocument(shipmentId, docId, available, organizationId) {
  const shipment = await getShipmentById(shipmentId, organizationId);
  if (!shipment) return null;
  const documents = (shipment.documents || []).map((document) =>
    document.id === docId ? { ...document, available: Boolean(available) } : document,
  );
  return patchShipment(shipmentId, { documents }, organizationId);
}
