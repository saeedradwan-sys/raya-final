/**
 * Accounting endpoint tests (file-fallback mode) + journal idempotency.
 * Run: node server/test-accounting.mjs
 * Spawns the API on a scratch port with a scratch records dir.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8977;
const BASE = `http://127.0.0.1:${PORT}`;
const DATA_DIR = fs.mkdtempSync('/tmp/raya-acct-test-');

let failures = 0;
function assert(cond, label) {
  if (cond) console.log(`  ok: ${label}`);
  else {
    failures += 1;
    console.error(`  FAIL: ${label}`);
  }
}

async function waitForServer() {
  for (let i = 0; i < 40; i += 1) {
    try {
      const res = await fetch(`${BASE}/api/health`);
      if (res.ok) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('server did not start');
}

const child = spawn(process.execPath, [path.join(__dirname, 'index.mjs')], {
  env: { ...process.env, PORT: String(PORT), RAYA_PORT: String(PORT), RAYA_RECORDS_DIR: DATA_DIR, RAYA_DATABASE_URL: '' },
  stdio: 'ignore',
});

try {
  await waitForServer();

  const login = await (
    await fetch(`${BASE}/api/auth/staff/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'STAFF-DEMO-RAYA' }),
    })
  ).json();
  const token = login.accessToken;
  assert(Boolean(token), 'staff login issues access token');
  const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // unauthenticated access is refused
  const anon = await fetch(`${BASE}/api/accounting/summary`);
  assert(anon.status === 401, 'summary requires auth');

  // seed one disbursement
  const disb = {
    id: 'disb-test-1',
    declarationNo: 'D-9001',
    clientNameEn: 'Test Client',
    mode: 'pay_first',
    status: 'open',
    duties: 1000,
    portFees: 200,
    otherGovCharges: 100,
    agencyFee: 150,
    createdAt: '2026-07-01',
    lastMovementAt: '2026-07-02',
  };
  const up = await fetch(`${BASE}/api/records/disbursements`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify(disb),
  });
  assert(up.ok, 'disbursement saved');

  const summary = await (await fetch(`${BASE}/api/accounting/summary`, { headers: auth })).json();
  assert(summary.metrics.openReceivable === 1300, 'summary open receivable = pass-through 1300');

  // repeat + concurrent journal posts must not double-book
  const post = () =>
    fetch(`${BASE}/api/accounting/journal`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ disbursementId: 'disb-test-1', stage: 'full' }),
    });
  const [p1, p2] = await Promise.all([post(), post()]);
  assert(p1.ok && p2.ok, 'concurrent posts both succeed');
  await post(); // repeated click after success
  const listed = await (
    await fetch(`${BASE}/api/accounting/journal?caseId=disb-test-1`, { headers: auth })
  ).json();
  assert(listed.entries.length === 1, 'only one journal snapshot retained per file/stage');
  assert(listed.entries[0].passThrough === 1300 && listed.entries[0].revenue === 150, 'snapshot figures correct');

  // reconciliation adjustments persist and change the recon output
  const put = await fetch(`${BASE}/api/accounting/reconciliation/adjustments`, {
    method: 'PUT',
    headers: auth,
    body: JSON.stringify({ glAdjust122100: 50, glAdjust222100: 0, note: 'timing' }),
  });
  assert(put.ok, 'adjustments saved');
  const recon = await (
    await fetch(`${BASE}/api/accounting/reconciliation?asOf=2026-07-25`, { headers: auth })
  ).json();
  assert(recon.reconciliation.diff122100 === 50 && recon.state.note === 'timing', 'recon reflects persisted adjustments');

  // journal preview mirrors calc rules
  const preview = await (
    await fetch(`${BASE}/api/accounting/journal/preview`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ mode: 'client_prepay', duties: 1500, portFees: 350, otherGov: 50, agencyFee: 150, prepayAmount: 1800, stage: 'full' }),
    })
  ).json();
  assert(preview.journal.trueUp === 100 && preview.journal.balanced === true, 'preview computes balanced prepay shortfall journal');

  // invoice issuance is server-computed and idempotent per open lifecycle
  const issue = () =>
    fetch(`${BASE}/api/accounting/invoices`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ disbursementId: 'disb-test-1' }),
    });
  const [invR1, invR2] = await Promise.all([issue(), issue()]);
  assert(invR1.ok && invR2.ok, 'concurrent invoice issues both succeed');
  const [invA, invB] = await Promise.all([invR1.json(), invR2.json()]);
  assert(invA.invoice.id === invB.invoice.id, 'concurrent issues return the same invoice');
  const inv1 = invA;
  const inv2 = await (await issue()).json();
  assert(inv1.invoice.passThrough === 1300 && inv1.invoice.agencyFee === 150, 'invoice figures recomputed server-side');
  assert(inv1.invoice.gstAmount === 24 && inv1.invoice.total === 1474, 'invoice GST 16% on fee only');
  assert(inv2.existed === true && inv2.invoice.id === inv1.invoice.id, 'repeat issue returns existing invoice');
  const patched = await (
    await fetch(`${BASE}/api/accounting/invoices/${inv1.invoice.id}`, {
      method: 'PATCH',
      headers: auth,
      body: JSON.stringify({ status: 'sent' }),
    })
  ).json();
  assert(patched.invoice.status === 'sent', 'invoice status transition persisted');
  // lifecycle is enforced server-side: sent cannot go back to draft
  const badTransition = await fetch(`${BASE}/api/accounting/invoices/${inv1.invoice.id}`, {
    method: 'PATCH',
    headers: auth,
    body: JSON.stringify({ status: 'draft' }),
  });
  assert(badTransition.status === 409, 'illegal status transition rejected with 409');
  const partialPayment = await fetch(`${BASE}/api/accounting/invoices/${inv1.invoice.id}/payments`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ amount: 500, receivedAt: '2026-07-20', reference: 'BANK-001', note: 'First tranche', idempotencyKey: 'pay-001' }),
  });
  const partialBody = await partialPayment.json();
  assert(partialPayment.ok && partialBody.invoice.paidAmount === 500 && partialBody.invoice.balanceDue === 974, 'partial payment recalculates invoice balance');
  const partialRetry = await fetch(`${BASE}/api/accounting/invoices/${inv1.invoice.id}/payments`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ amount: 500, receivedAt: '2026-07-20', reference: 'BANK-001', idempotencyKey: 'pay-001' }),
  });
  const retryBody = await partialRetry.json();
  assert(partialRetry.ok && retryBody.existed === true && retryBody.invoice.balanceDue === 974, 'payment retry is idempotent');
  const overpay = await fetch(`${BASE}/api/accounting/invoices/${inv1.invoice.id}/payments`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ amount: 975, idempotencyKey: 'pay-over' }),
  });
  assert(overpay.status === 409, 'overpayment is rejected');
  const finalPayment = await fetch(`${BASE}/api/accounting/invoices/${inv1.invoice.id}/payments`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ amount: 974, receivedAt: '2026-07-21', reference: 'BANK-002', idempotencyKey: 'pay-002' }),
  });
  const finalBody = await finalPayment.json();
  assert(finalPayment.ok && finalBody.invoice.status === 'paid' && finalBody.invoice.balanceDue === 0, 'final payment closes invoice automatically');
  const paidRes = await fetch(`${BASE}/api/accounting/invoices/${inv1.invoice.id}`, {
    method: 'PATCH',
    headers: auth,
    body: JSON.stringify({ status: 'paid' }),
  });
  assert(paidRes.status === 409, 'paid invoice is terminal after settlement');
  const reopenPaid = await fetch(`${BASE}/api/accounting/invoices/${inv1.invoice.id}`, {
    method: 'PATCH',
    headers: auth,
    body: JSON.stringify({ status: 'sent' }),
  });
  assert(reopenPaid.status === 409, 'paid is terminal — cannot reopen');
  const invList = await (await fetch(`${BASE}/api/accounting/invoices`, { headers: auth })).json();
  assert(invList.invoices.length === 1 && invList.invoices[0].status === 'paid', 'invoice list reflects status');

  // GST report matches posted journal figures
  const today = new Date().toISOString().slice(0, 10);
  const gst = await (
    await fetch(`${BASE}/api/accounting/gst?from=${today}&to=${today}`, { headers: auth })
  ).json();
  assert(gst.report.feeRevenue === 150 && gst.report.passThrough === 1300, 'GST report totals match journal');
  assert(gst.report.gstCollectible === 24 && gst.report.entryCount === 1, 'GST collectible computed at default rate');

  // posting extra stages for the same case must not double-count GST/fees
  const postStage = (stage) =>
    fetch(`${BASE}/api/accounting/journal`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ disbursementId: 'disb-test-1', stage }),
    });
  assert((await postStage('payout')).ok && (await postStage('settle')).ok, 'stage posts succeed');
  const gstMulti = await (
    await fetch(`${BASE}/api/accounting/gst?from=${today}&to=${today}`, { headers: auth })
  ).json();
  assert(
    gstMulti.report.feeRevenue === 150 && gstMulti.report.gstCollectible === 24 && gstMulti.report.passThrough === 1300,
    'multi-stage posts count each case once in GST report',
  );
  const badPeriod = await fetch(`${BASE}/api/accounting/gst?from=2026-02-01&to=2026-01-01`, { headers: auth });
  assert(badPeriod.status === 400, 'invalid GST period rejected');

  // reconciliation resolve/reopen persists
  const resolve = await fetch(`${BASE}/api/accounting/reconciliation/resolve`, {
    method: 'PUT',
    headers: auth,
    body: JSON.stringify({ caseId: 'disb-test-1', resolved: true, note: 'chased client' }),
  });
  assert(resolve.ok, 'resolution saved');
  const recon2 = await (
    await fetch(`${BASE}/api/accounting/reconciliation?asOf=2026-07-25`, { headers: auth })
  ).json();
  assert(
    recon2.resolutions['disb-test-1']?.resolved === true && recon2.resolutions['disb-test-1'].note === 'chased client',
    'reconciliation returns persisted resolutions',
  );
} finally {
  child.kill('SIGTERM');
  fs.rmSync(DATA_DIR, { recursive: true, force: true });
}

if (failures > 0) {
  console.error(`${failures} accounting test(s) failed`);
  process.exit(1);
}
console.log('All accounting endpoint tests passed');
