import fs from 'node:fs';
import path from 'node:path';
import { appendServerAudit } from './auditStore.mjs';
import { closeDatabase, databaseEnabled, getDatabase } from './database.mjs';
import { upsertDisbursement, upsertShipment } from './recordsStore.mjs';

if (!databaseEnabled()) throw new Error('RAYA_DATABASE_URL is required');

const organizationCode = String(process.env.RAYA_ORGANIZATION_CODE || 'raya').trim().toLowerCase();
const recordsDirectory = process.env.RAYA_RECORDS_DIR || new URL('./data', import.meta.url).pathname;
const auditFile = process.env.RAYA_AUDIT_FILE || path.join(recordsDirectory, 'audit.jsonl');

function readArray(file) {
  if (!fs.existsSync(file)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

try {
  const organization = await getDatabase().query(
    'SELECT id FROM organizations WHERE code = $1 LIMIT 1',
    [organizationCode],
  );
  if (!organization.rowCount) throw new Error(`Organization not found: ${organizationCode}`);
  const organizationId = String(organization.rows[0].id);

  const shipments = readArray(path.join(recordsDirectory, 'user-shipments.json'));
  for (const shipment of shipments) await upsertShipment(shipment, organizationId);

  const disbursements = readArray(path.join(recordsDirectory, 'user-disbursements.json'));
  for (const disbursement of disbursements) await upsertDisbursement(disbursement, organizationId);

  let audits = 0;
  const existingAudits = await getDatabase().query(
    'SELECT count(*)::int AS total FROM audit_events WHERE organization_id = $1',
    [organizationId],
  );
  if (existingAudits.rows[0].total === 0 && fs.existsSync(auditFile)) {
    const lines = fs.readFileSync(auditFile, 'utf8').split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        const event = JSON.parse(line);
        await appendServerAudit({ ...event, organizationId });
        audits += 1;
      } catch {
        // Preserve the source file and skip only malformed legacy lines.
      }
    }
  }

  console.log(`Runtime import complete: ${shipments.length} shipment(s), ${disbursements.length} disbursement(s), ${audits} audit event(s)`);
} finally {
  await closeDatabase();
}
