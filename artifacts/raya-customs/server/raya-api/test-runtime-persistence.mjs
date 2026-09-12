import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const root = await mkdtemp(path.join(os.tmpdir(), 'raya-runtime-store-'));
process.env.RAYA_RECORDS_DIR = path.join(root, 'records');
process.env.RAYA_AUDIT_FILE = path.join(root, 'audit', 'audit.jsonl');
delete process.env.RAYA_DATABASE_URL;

try {
  const records = await import('./recordsStore.mjs');
  const audit = await import('./auditStore.mjs');

  const shipment = await records.upsertShipment({
    id: 'test-shipment',
    accessCode: 'must-not-persist',
    taxNumber: '123456789',
    customerNameEn: 'Test Client',
    goodsEn: 'Test goods',
    status: 'pre_arrival',
  });
  assert.equal(shipment.id, 'test-shipment');
  assert.equal('accessCode' in shipment, false);
  assert.equal((await records.listUserShipments()).length, 1);

  const patched = await records.patchShipment('test-shipment', { status: 'released' });
  assert.equal(patched.status, 'released');

  await records.upsertDisbursement({ id: 'test-disbursement', declarationNo: '1/1/2026' });
  assert.equal((await records.listDisbursements()).length, 1);
  await records.deleteDisbursement('test-disbursement');
  assert.equal((await records.listDisbursements()).length, 0);

  await audit.appendServerAudit({ actorType: 'staff', actorId: 'test', action: 'test.runtime' });
  assert.equal((await audit.listServerAudit({ action: 'test.runtime' })).length, 1);
  assert.equal((await audit.auditStats()).backend, 'jsonl');

  console.log('runtime persistence fallback tests passed');
} finally {
  await rm(root, { recursive: true, force: true });
}
