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
const PAYMENTS_FILE = path.join(DIR, 'invoice-payments.json');

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

function readPaymentRows() {
  try {
    const parsed = JSON.parse(fs.readFileSync(PAYMENTS_FILE, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writePaymentRows(rows) {
  if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(PAYMENTS_FILE, JSON.stringify(rows, null, 2), 'utf8');
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

function paymentView(row) {
  return {
    id: row.id,
    invoiceId: row.invoiceId || row.invoice_id,
    amount: Number(row.amount),
    currency: row.currency || 'JOD',
    receivedAt: row.receivedAt || row.received_at,
    reference: row.reference || null,
    note: row.note || null,
    createdBy: row.createdBy || row.created_by || null,
    createdAt: row.createdAt || row.created_at,
  };
}

function enrichInvoice(invoice, payments) {
  const rows = (payments || []).map(paymentView);
  const paidAmount = round2(rows.reduce((sum, payment) => sum + payment.amount, 0));
  return {
    ...invoice,
    paidAmount,
    balanceDue: round2(Math.max(0, Number(invoice.total) - paidAmount)),
    payments: rows,
  };
}

let paymentTableReady = null;
async function ensurePaymentTable() {
  if (!databaseEnabled()) return;
  if (!paymentTableReady) {
    paymentTableReady = getDatabase().query(`
      CREATE TABLE IF NOT EXISTS invoice_payments (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        invoice_id TEXT NOT NULL,
        amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
        currency TEXT NOT NULL DEFAULT 'JOD',
        received_at DATE NOT NULL,
        reference TEXT NULL,
        note TEXT NULL,
        created_by TEXT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        idempotency_key TEXT NOT NULL,
        UNIQUE (organization_id, invoice_id, idempotency_key)
      )
    `).catch((error) => {
      paymentTableReady = null;
      throw error;
    });
  }
  await paymentTableReady;
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
    const filtered = disbursementId ? rows.filter((r) => r.disbursementId === disbursementId) : rows;
    const payments = readPaymentRows();
    return filtered.map((row) => enrichInvoice(row, payments.filter((payment) =>
      (payment.organizationId || 'local') === org && payment.invoiceId === row.id,
    )));
  }
  const org = requireOrganizationId(organizationId);
  await ensurePaymentTable();
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
  const invoiceRows = result.rows.map(mapDbRow);
  if (!invoiceRows.length) return [];
  const paymentResult = await getDatabase().query(
    `SELECT id, invoice_id AS "invoiceId", amount, currency, received_at AS "receivedAt",
            reference, note, created_by AS "createdBy", created_at AS "createdAt"
     FROM invoice_payments WHERE organization_id = $1 AND invoice_id = ANY($2::text[])
     ORDER BY received_at DESC, created_at DESC`,
    [org, invoiceRows.map((row) => row.id)],
  );
  return invoiceRows.map((row) => enrichInvoice(row, paymentResult.rows.filter((payment) => payment.invoiceId === row.id)));
}

let filePaymentLock = Promise.resolve();
function withFilePaymentLock(fn) {
  const run = filePaymentLock.then(fn, fn);
  filePaymentLock = run.then(() => undefined, () => undefined);
  return run;
}

function paymentInput(input) {
  const amount = round2(Number(input.amount));
  if (!Number.isFinite(amount) || amount <= 0) throw Object.assign(new Error('invalid_payment_amount'), { code: 'invalid_payment_amount' });
  const idempotencyKey = String(input.idempotencyKey || '').trim().slice(0, 120);
  if (!idempotencyKey) throw Object.assign(new Error('idempotency_key_required'), { code: 'idempotency_key_required' });
  const receivedAt = String(input.receivedAt || new Date().toISOString().slice(0, 10)).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(receivedAt)) throw Object.assign(new Error('invalid_received_at'), { code: 'invalid_received_at' });
  return {
    amount,
    idempotencyKey,
    receivedAt,
    reference: input.reference ? String(input.reference).trim().slice(0, 160) : null,
    note: input.note ? String(input.note).trim().slice(0, 1000) : null,
    currency: String(input.currency || 'JOD').slice(0, 8),
    createdBy: input.createdBy || null,
  };
}

function paymentError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

/** Record an idempotent payment and return the invoice with a recomputed balance. */
export async function recordInvoicePayment(invoiceId, input, organizationId) {
  const data = paymentInput(input);
  if (!databaseEnabled()) {
    const org = organizationId || 'local';
    return withFilePaymentLock(async () => {
      const invoices = readRows();
      const invoice = invoices.find((row) => row.id === invoiceId && (row.organizationId || 'local') === org);
      if (!invoice) return null;
      const payments = readPaymentRows();
      const existing = payments.find((payment) => payment.organizationId === org && payment.invoiceId === invoiceId && payment.idempotencyKey === data.idempotencyKey);
      if (existing) return { invoice: enrichInvoice(invoice, payments.filter((payment) => payment.organizationId === org && payment.invoiceId === invoiceId)), payment: paymentView(existing), existed: true };
      if (invoice.status === 'void') throw paymentError('invoice_void');
      const current = enrichInvoice(invoice, payments.filter((payment) => payment.organizationId === org && payment.invoiceId === invoiceId));
      if (current.balanceDue <= 0) throw paymentError('invoice_already_paid');
      if (data.amount > current.balanceDue) throw paymentError('payment_exceeds_balance');
      const payment = { id: randomUUID(), invoiceId, organizationId: org, ...data, createdAt: new Date().toISOString() };
      payments.unshift(payment);
      writePaymentRows(payments);
      const updated = enrichInvoice(invoice, payments.filter((row) => row.organizationId === org && row.invoiceId === invoiceId));
      if (updated.balanceDue === 0) {
        invoice.status = 'paid';
        invoice.paidAt = new Date().toISOString();
        updated.status = 'paid';
      }
      invoice.updatedAt = new Date().toISOString();
      writeRows(invoices);
      return { invoice: updated, payment: paymentView(payment), existed: false };
    });
  }

  const org = requireOrganizationId(organizationId);
  await ensurePaymentTable();
  const client = await getDatabase().connect();
  try {
    await client.query('BEGIN');
    const invoiceResult = await client.query('SELECT * FROM invoices WHERE organization_id = $1 AND id = $2 FOR UPDATE', [org, invoiceId]);
    const invoice = invoiceResult.rows[0] && mapDbRow(invoiceResult.rows[0]);
    if (!invoice) { await client.query('ROLLBACK'); return null; }
    const existingResult = await client.query('SELECT id, invoice_id AS "invoiceId", amount, currency, received_at AS "receivedAt", reference, note, created_by AS "createdBy", created_at AS "createdAt" FROM invoice_payments WHERE organization_id = $1 AND invoice_id = $2 AND idempotency_key = $3', [org, invoiceId, data.idempotencyKey]);
    const paymentRows = await client.query('SELECT id, invoice_id AS "invoiceId", amount, currency, received_at AS "receivedAt", reference, note, created_by AS "createdBy", created_at AS "createdAt" FROM invoice_payments WHERE organization_id = $1 AND invoice_id = $2 ORDER BY received_at DESC, created_at DESC', [org, invoiceId]);
    if (existingResult.rows[0]) {
      await client.query('COMMIT');
      return { invoice: enrichInvoice(invoice, paymentRows.rows), payment: paymentView(existingResult.rows[0]), existed: true };
    }
    if (invoice.status === 'void') throw paymentError('invoice_void');
    const current = enrichInvoice(invoice, paymentRows.rows);
    if (current.balanceDue <= 0) throw paymentError('invoice_already_paid');
    if (data.amount > current.balanceDue) throw paymentError('payment_exceeds_balance');
    const payment = { id: randomUUID(), invoiceId, ...data, createdAt: new Date().toISOString() };
    await client.query('INSERT INTO invoice_payments (id, organization_id, invoice_id, amount, currency, received_at, reference, note, created_by, idempotency_key) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', [payment.id, org, invoiceId, payment.amount, payment.currency, payment.receivedAt, payment.reference, payment.note, payment.createdBy, payment.idempotencyKey]);
    const nextBalance = round2(current.balanceDue - data.amount);
    if (nextBalance === 0) await client.query(`UPDATE invoices SET status = 'paid', updated_at = now() WHERE organization_id = $1 AND id = $2`, [org, invoiceId]);
    else await client.query('UPDATE invoices SET updated_at = now() WHERE organization_id = $1 AND id = $2', [org, invoiceId]);
    await client.query('COMMIT');
    const refreshed = await listInvoices(org, invoice.disbursementId);
    return { invoice: refreshed.find((row) => row.id === invoiceId), payment: paymentView(payment), existed: false };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    if (error?.code === '23505') return recordInvoicePayment(invoiceId, input, organizationId);
    throw error;
  } finally {
    client.release();
  }
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
