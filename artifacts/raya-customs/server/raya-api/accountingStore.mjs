/**
 * Accounting persistence: journal entry snapshots and reconciliation state.
 * PostgreSQL when configured, file fallback for local development
 * (same pattern as recordsStore.mjs).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { databaseEnabled, getDatabase } from './database.mjs';
import { round2 } from './accountingCalc.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR = process.env.RAYA_RECORDS_DIR || path.join(__dirname, 'data');
const JOURNAL_FILE = path.join(DIR, 'journal-entries.json');
const RECON_FILE = path.join(DIR, 'accounting-recon-state.json');
const RESOLUTION_FILE = path.join(DIR, 'recon-resolutions.json');

function ensureFiles() {
  if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
  if (!fs.existsSync(JOURNAL_FILE)) fs.writeFileSync(JOURNAL_FILE, '[]', 'utf8');
  if (!fs.existsSync(RECON_FILE)) fs.writeFileSync(RECON_FILE, '{}', 'utf8');
  if (!fs.existsSync(RESOLUTION_FILE)) fs.writeFileSync(RESOLUTION_FILE, '{}', 'utf8');
}

function readJsonFile(file, fallback) {
  ensureFiles();
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJsonFile(file, value) {
  ensureFiles();
  fs.writeFileSync(file, JSON.stringify(value, null, 2), 'utf8');
}

function requireOrganizationId(organizationId) {
  if (!organizationId) throw new Error('organization_required');
  return organizationId;
}

/**
 * Persist a journal entry snapshot for a disbursement case.
 * Idempotent per (organization, disbursement, stage): reposting replaces the
 * previous snapshot — figures are always server-recomputed, so a repeated
 * click or retried request can never double-book pass-through or revenue.
 */
export async function saveJournalEntry(entry, organizationId) {
  const row = {
    id: randomUUID(),
    disbursementId: String(entry.disbursementId),
    stage: entry.stage || 'full',
    mode: entry.mode,
    passThrough: round2(entry.passThrough),
    revenue: round2(entry.revenue),
    prepay: round2(entry.prepay),
    trueUp: round2(entry.trueUp),
    balanced: Boolean(entry.balanced),
    lines: Array.isArray(entry.lines) ? entry.lines : [],
    postedBy: entry.postedBy || null,
    createdAt: new Date().toISOString(),
  };

  if (!databaseEnabled()) {
    const org = organizationId || 'local';
    const rows = readJsonFile(JOURNAL_FILE, []).filter(
      (r) =>
        !(
          (r.organizationId || 'local') === org &&
          r.disbursementId === row.disbursementId &&
          (r.stage || 'full') === row.stage
        ),
    );
    rows.unshift({ ...row, organizationId: org });
    writeJsonFile(JOURNAL_FILE, rows);
    return row;
  }

  await getDatabase().query(
    `INSERT INTO journal_entries (
       id, organization_id, disbursement_external_id, stage, mode,
       pass_through, revenue, prepay, true_up, balanced, lines, posted_by
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     ON CONFLICT (organization_id, disbursement_external_id, stage) DO UPDATE SET
       id = EXCLUDED.id,
       mode = EXCLUDED.mode,
       pass_through = EXCLUDED.pass_through,
       revenue = EXCLUDED.revenue,
       prepay = EXCLUDED.prepay,
       true_up = EXCLUDED.true_up,
       balanced = EXCLUDED.balanced,
       lines = EXCLUDED.lines,
       posted_by = EXCLUDED.posted_by,
       created_at = now()`,
    [
      row.id,
      requireOrganizationId(organizationId),
      row.disbursementId,
      row.stage,
      row.mode,
      row.passThrough,
      row.revenue,
      row.prepay,
      row.trueUp,
      row.balanced,
      JSON.stringify(row.lines),
      row.postedBy,
    ],
  );
  return row;
}

/** List persisted journal entries, newest first, optionally for one case. */
export async function listJournalEntries(organizationId, disbursementId) {
  if (!databaseEnabled()) {
    const org = organizationId || 'local';
    const rows = readJsonFile(JOURNAL_FILE, []).filter(
      (r) => (r.organizationId || 'local') === org,
    );
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
    `SELECT id, disbursement_external_id, stage, mode, pass_through, revenue,
            prepay, true_up, balanced, lines, posted_by, created_at
     FROM journal_entries WHERE ${where}
     ORDER BY created_at DESC LIMIT 200`,
    params,
  );
  return result.rows.map((r) => ({
    id: r.id,
    disbursementId: r.disbursement_external_id,
    stage: r.stage,
    mode: r.mode,
    passThrough: Number(r.pass_through),
    revenue: Number(r.revenue),
    prepay: Number(r.prepay),
    trueUp: Number(r.true_up),
    balanced: r.balanced,
    lines: r.lines || [],
    postedBy: r.posted_by,
    createdAt: r.created_at,
  }));
}

const DEFAULT_RECON_STATE = { glAdjust122100: 0, glAdjust222100: 0, note: null, updatedBy: null, updatedAt: null };

/** Organization-level reconciliation state (GL adjustments). */
export async function getReconState(organizationId) {
  if (!databaseEnabled()) {
    const all = readJsonFile(RECON_FILE, {});
    return { ...DEFAULT_RECON_STATE, ...(all[organizationId || 'local'] || {}) };
  }
  const result = await getDatabase().query(
    `SELECT gl_adjust_122100, gl_adjust_222100, note, updated_by, updated_at
     FROM accounting_recon_state WHERE organization_id = $1`,
    [requireOrganizationId(organizationId)],
  );
  const r = result.rows[0];
  if (!r) return { ...DEFAULT_RECON_STATE };
  return {
    glAdjust122100: Number(r.gl_adjust_122100),
    glAdjust222100: Number(r.gl_adjust_222100),
    note: r.note,
    updatedBy: r.updated_by,
    updatedAt: r.updated_at,
  };
}

export async function setReconState(state, organizationId) {
  const next = {
    glAdjust122100: round2(state.glAdjust122100 ?? 0),
    glAdjust222100: round2(state.glAdjust222100 ?? 0),
    note: state.note ? String(state.note).slice(0, 2000) : null,
    updatedBy: state.updatedBy || null,
    updatedAt: new Date().toISOString(),
  };

  if (!databaseEnabled()) {
    const all = readJsonFile(RECON_FILE, {});
    all[organizationId || 'local'] = next;
    writeJsonFile(RECON_FILE, all);
    return next;
  }

  await getDatabase().query(
    `INSERT INTO accounting_recon_state (organization_id, gl_adjust_122100, gl_adjust_222100, note, updated_by, updated_at)
     VALUES ($1,$2,$3,$4,$5,now())
     ON CONFLICT (organization_id) DO UPDATE SET
       gl_adjust_122100 = EXCLUDED.gl_adjust_122100,
       gl_adjust_222100 = EXCLUDED.gl_adjust_222100,
       note = EXCLUDED.note,
       updated_by = EXCLUDED.updated_by,
       updated_at = now()`,
    [
      requireOrganizationId(organizationId),
      next.glAdjust122100,
      next.glAdjust222100,
      next.note,
      next.updatedBy,
    ],
  );
  return next;
}

/** Per-case reconciliation resolution flags (resolved + note). */
export async function listReconResolutions(organizationId) {
  if (!databaseEnabled()) {
    const all = readJsonFile(RESOLUTION_FILE, {});
    return all[organizationId || 'local'] || {};
  }
  const result = await getDatabase().query(
    `SELECT disbursement_external_id, resolved, note, resolved_by, resolved_at
     FROM recon_resolutions WHERE organization_id = $1`,
    [requireOrganizationId(organizationId)],
  );
  const map = {};
  for (const r of result.rows) {
    map[r.disbursement_external_id] = {
      resolved: r.resolved,
      note: r.note,
      resolvedBy: r.resolved_by,
      resolvedAt: r.resolved_at,
    };
  }
  return map;
}

export async function setReconResolution(caseId, patch, organizationId) {
  const next = {
    resolved: Boolean(patch.resolved),
    note: patch.note ? String(patch.note).slice(0, 2000) : null,
    resolvedBy: patch.resolvedBy || null,
    resolvedAt: patch.resolved ? new Date().toISOString() : null,
  };

  if (!databaseEnabled()) {
    const all = readJsonFile(RESOLUTION_FILE, {});
    const org = organizationId || 'local';
    all[org] = all[org] || {};
    all[org][caseId] = next;
    writeJsonFile(RESOLUTION_FILE, all);
    return next;
  }

  await getDatabase().query(
    `INSERT INTO recon_resolutions (organization_id, disbursement_external_id, resolved, note, resolved_by, resolved_at)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (organization_id, disbursement_external_id) DO UPDATE SET
       resolved = EXCLUDED.resolved,
       note = EXCLUDED.note,
       resolved_by = EXCLUDED.resolved_by,
       resolved_at = EXCLUDED.resolved_at`,
    [
      requireOrganizationId(organizationId),
      String(caseId),
      next.resolved,
      next.note,
      next.resolvedBy,
      next.resolved ? next.resolvedAt : null,
    ],
  );
  return next;
}
