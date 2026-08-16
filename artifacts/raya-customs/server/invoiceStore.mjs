/**
 * Invoice lifecycle persistence (Postgres + file fallback), following the
 * recordsStore/accountingStore pattern. Figures are always server-computed
 * from the persisted disbursement at issuance time.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { databaseEnabled, getDatabase } from './database.mjs';
import { round2 } from './accountingCalc.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR = process.env.RAYA_RECORDS_DIR || path.join(__dirname, 'data');
const FILE = path.join(DIR, 'invoices.json');

export const INVOICE_STATUSES = ['draft', 'sent', 'paid', 'overdue', 'void'];

function readRows() {
  try {
    const parsed = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRows(rows) {
  if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(rows, null, 2), 'utf8');
}

function requireOrganizationId(organizationId) {
  if (!organizationId) throw new Error('organization_required');
  return organizationId;
}

function mapDbRow(r) {
  return {
    id: r.id,
    invoiceNumber: r.invoice_number,
    disbursementId: r.disbursement_external_id,
    status: r.status,
    currency: r.currency,
    passThrough: Number(r.pass_through),
    agencyFee: Number(r.agency_fee),
    gstRate: Number(r.gst_rate),
    gstAmount: Number(r.gst_amount),
    total: Number(r.total),
    issuedAt: r.issued_at,
    dueAt: r.due_at,
    payload: r.source_payload || {},
    createdBy: r.created_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function invoicePrefix() {
  return `INV-${new Date().getFullYear()}-`;
}

function nextNumberFromRows(rows, org, prefix) {
  const nums = rows
    .filter((r) => (r.organizationId || 'local') === org && String(r.invoiceNumber || '').startsWith(prefix))
    .map((r) => Number(String(r.invoiceNumber).slice(prefix.length)) || 0);
  return `${prefix}${String(Math.max(0, ...nums) + 1).padStart(4, '0')}`;
}

/**
 * In-process mutex serializing file-fallback issuance so concurrent requests
 * within one server process cannot interleave the read-check-write cycle.
 */
let fileIssueLock = Promise.resolve();
function withFileIssueLock(fn) {
  const run = fileIssueLock.then(fn, fn);
  fileIssueLock = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

/**
 * Issue an invoice for a disbursement case. Idempotent per open lifecycle:
 * if a non-void invoice already exists for the case, it is returned instead
 * of creating a duplicate. Concurrency-safe: DB mode takes a per-org advisory
 * transaction lock (atomic number allocation) and is backed by a partial
 * unique index (one non-void invoice per org+case); file mode is serialized
 * through an in-process mutex.
 */
export async function issueInvoice(input, organizationId) {
  const today = new Date().toISOString().slice(0, 10);
  const due = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10);
  const buildRow = (invoiceNumber) => ({
    id: randomUUID(),
    invoiceNumber,
    disbursementId: String(input.disbursementId),
    status: 'draft',
    currency: input.currency || 'JOD',
    passThrough: round2(input.passThrough),
    agencyFee: round2(input.agencyFee),
    gstRate: input.gstRate,
    gstAmount: round2(input.gstAmount),
    total: round2(input.total),
    issuedAt: today,
    dueAt: due,
    payload: input.payload || {},
    createdBy: input.createdBy || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  if (!databaseEnabled()) {
    const org = organizationId || 'local';
    return withFileIssueLock(async () => {
      const rows = readRows();
      const existing = rows.find(
        (r) =>
          (r.organizationId || 'local') === org &&
          r.disbursementId === String(input.disbursementId) &&
          r.status !== 'void',
      );
      if (existing) return { invoice: existing, existed: true };
      const row = buildRow(nextNumberFromRows(rows, org, invoicePrefix()));
      rows.unshift({ ...row, organizationId: org });
      writeRows(rows);
      return { invoice: row, existed: false };
    });
  }

  const org = requireOrganizationId(organizationId);
  const client = await getDatabase().connect();
  try {
    await client.query('BEGIN');
    // Per-org advisory lock: serializes number allocation + idempotency check
    // for concurrent issue requests, released automatically at COMMIT/ROLLBACK.
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`invoices:${org}`]);
    const existing = await client.query(
      `SELECT * FROM invoices
       WHERE organization_id = $1 AND disbursement_external_id = $2 AND status <> 'void'
       ORDER BY created_at DESC LIMIT 1`,
      [org, String(input.disbursementId)],
    );
    if (existing.rows[0]) {
      await client.query('COMMIT');
      return { invoice: mapDbRow(existing.rows[0]), existed: true };
    }
    const prefix = invoicePrefix();
    const last = await client.query(
      `SELECT invoice_number FROM invoices
       WHERE organization_id = $1 AND invoice_number LIKE $2
       ORDER BY invoice_number DESC LIMIT 1`,
      [org, `${prefix}%`],
    );
    const n = last.rows[0]?.invoice_number
      ? Number(String(last.rows[0].invoice_number).slice(prefix.length)) || 0
      : 0;
    const row = buildRow(`${prefix}${String(n + 1).padStart(4, '0')}`);
    await client.query(
      `INSERT INTO invoices (
         id, organization_id, invoice_number, disbursement_external_id, status, currency,
         pass_through, agency_fee, gst_rate, gst_amount, total, issued_at, due_at,
         source_payload, created_by
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [
        row.id,
        org,
        row.invoiceNumber,
        row.disbursementId,
        row.status,
        row.currency,
        row.passThrough,
        row.agencyFee,
        row.gstRate,
        row.gstAmount,
        row.total,
        row.issuedAt,
        row.dueAt,
        JSON.stringify(row.payload),
        row.createdBy,
      ],
    );
    await client.query('COMMIT');
    return { invoice: row, existed: false };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    // Unique-index race safety net (e.g. cross-process insert without lock):
    // return the winning invoice instead of failing.
    if (error?.code === '23505') {
      const winner = (await listInvoices(organizationId, input.disbursementId)).find(
        (r) => r.status !== 'void',
      );
      if (winner) return { invoice: winner, existed: true };
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function listInvoices(organizationId, disbursementId) {
  if (!databaseEnabled()) {
    const org = organizationId || 'local';
    const rows = readRows().filter((r) => (r.organizationId || 'local') === org);
    return disbursementId ? rows.filter((r) => r.disbursementId === disbursementId) : rows;
  }
  const org = requireOrganizationId(organizationId);
  const params = [org];
  let where = 'organization_id = $1';
  if (disbursementId) {
    params.push(String(disbursementId));
    where += ' AND disbursement_external_id = $2';
  }
  const result = await getDatabase().query(
    `SELECT * FROM invoices WHERE ${where} ORDER BY created_at DESC LIMIT 500`,
    params,
  );
  return result.rows.map(mapDbRow);
}

/**
 * Allowed lifecycle transitions, enforced server-side so API callers cannot
 * resurrect paid/void invoices or skip states. paid and void are terminal.
 */
export const INVOICE_TRANSITIONS = {
  draft: ['sent', 'void'],
  sent: ['paid', 'overdue', 'void'],
  overdue: ['paid', 'void'],
  paid: [],
  void: [],
};

function assertTransition(fromStatus, toStatus) {
  if (!(INVOICE_TRANSITIONS[fromStatus] || []).includes(toStatus)) {
    const err = new Error('invalid_transition');
    err.code = 'invalid_transition';
    err.fromStatus = fromStatus;
    throw err;
  }
}

export async function setInvoiceStatus(id, status, organizationId, actor) {
  if (!INVOICE_STATUSES.includes(status)) throw new Error('invalid_status');
  if (!databaseEnabled()) {
    const org = organizationId || 'local';
    const rows = readRows();
    const row = rows.find((r) => r.id === id && (r.organizationId || 'local') === org);
    if (!row) return null;
    assertTransition(row.status, status);
    row.status = status;
    row.updatedAt = new Date().toISOString();
    row.updatedBy = actor || null;
    writeRows(rows);
    return row;
  }
  const org = requireOrganizationId(organizationId);
  const current = await getDatabase().query(
    'SELECT status FROM invoices WHERE organization_id = $1 AND id = $2',
    [org, id],
  );
  if (!current.rows[0]) return null;
  assertTransition(current.rows[0].status, status);
  // Guard the transition in the UPDATE too, so a concurrent change between
  // the read and the write cannot bypass the state machine.
  const result = await getDatabase().query(
    `UPDATE invoices SET status = $3, updated_at = now()
     WHERE organization_id = $1 AND id = $2 AND status = $4
     RETURNING *`,
    [org, id, status, current.rows[0].status],
  );
  if (!result.rows[0]) {
    const err = new Error('invalid_transition');
    err.code = 'invalid_transition';
    throw err;
  }
  return mapDbRow(result.rows[0]);
}
