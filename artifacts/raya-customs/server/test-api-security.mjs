import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const port = 18787;
const root = await mkdtemp(path.join(os.tmpdir(), 'raya-api-security-'));
const child = spawn(process.execPath, ['server/raya-api/index.mjs'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    NODE_ENV: 'development',
    RAYA_DEPLOYMENT_MODE: 'development',
    RAYA_ALLOW_DEMO_AUTH: 'true',
    RAYA_JWT_SECRET: 'raya-api-security-test-secret-that-is-longer-than-48-characters',
    CORS_ORIGIN: '*',
    HOST: '127.0.0.1',
    PORT: String(port),
    RAYA_RECORDS_DIR: path.join(root, 'records'),
    RAYA_AUDIT_FILE: path.join(root, 'audit', 'audit.jsonl'),
    RAYA_LLAMA_ENABLED: 'false',
    RAYA_LLAMA_RATE_WINDOW_MS: '60000',
    RAYA_LLAMA_RATE_MAX_REQUESTS: '1',
    RAYA_LLAMA_MAX_CONCURRENT: '1',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let output = '';
child.stdout.on('data', (chunk) => { output += chunk; });
child.stderr.on('data', (chunk) => { output += chunk; });

const base = `http://127.0.0.1:${port}/api`;

async function request(pathname, { token, ...init } = {}) {
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${base}${pathname}`, { ...init, headers });
  const text = await response.text();
  return { response, body: text ? JSON.parse(text) : null };
}

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const { response } = await request('/health');
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`API did not start. Output:\n${output}`);
}

async function login(token) {
  const result = await request('/auth/staff/login', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
  assert.equal(result.response.status, 200, output);
  return result.body;
}

try {
  await waitForServer();

  const unauthenticatedTracking = await request('/tracking/container?reference=MSCU1234567');
  assert.equal(unauthenticatedTracking.response.status, 401);

  const staff = await login('STAFF-DEMO-RAYA');

  const health = await request('/health');
  assert.equal(health.response.status, 200);
  assert.equal(health.body.llama.enabled, false);
  assert.equal('url' in health.body.llama, false);

  const disabledLlama = await request('/assist', {
    method: 'POST',
    token: staff.accessToken,
    body: JSON.stringify({ agentId: 'hs', input: { query: 'cotton shirt' } }),
  });
  assert.equal(disabledLlama.response.status, 503);
  assert.equal(disabledLlama.body.error, 'llama_disabled');

  const throttledLlama = await request('/assist', {
    method: 'POST',
    token: staff.accessToken,
    body: JSON.stringify({ agentId: 'hs', input: { query: 'cotton shirt' } }),
  });
  assert.equal(throttledLlama.response.status, 429);
  assert.equal(throttledLlama.body.error, 'llama_rate_limited');
  assert.ok(Number(throttledLlama.response.headers.get('retry-after')) > 0);
  const tracking = await request('/tracking/container?reference=MSCU1234567', {
    token: staff.accessToken,
  });
  assert.equal(tracking.response.status, 200);
  assert.equal(tracking.body.source, 'manual_act');
  assert.equal(tracking.body.live, false);
  assert.equal(tracking.body.locationCode, 'JOAQJ');
  assert.doesNotMatch(JSON.stringify(tracking.body), /username|password|guest\s*(login|credential)/i);

  const invalidTracking = await request('/tracking/container?reference=%3Cscript%3E', {
    token: staff.accessToken,
  });
  assert.equal(invalidTracking.response.status, 400);

  const portal = await request('/auth/portal/login', {
    method: 'POST',
    body: JSON.stringify({ taxNumber: '100123456', accessCode: 'RAYA-DEMO-01' }),
  });
  assert.equal(portal.response.status, 200);
  const portalTracking = await request('/tracking/container?reference=MSCU1234567', {
    token: portal.body.accessToken,
  });
  assert.equal(portalTracking.response.status, 403);

  const unauthenticatedRequest = await request('/portal/requests', {
    method: 'POST',
    body: JSON.stringify({ requestType: 'documents' }),
  });
  assert.equal(unauthenticatedRequest.response.status, 401);

  const invalidServiceRequest = await request('/portal/requests', {
    method: 'POST',
    token: portal.body.accessToken,
    body: JSON.stringify({ requestType: 'delete_everything' }),
  });
  assert.equal(invalidServiceRequest.response.status, 400);

  const createdServiceRequest = await request('/portal/requests', {
    method: 'POST',
    token: portal.body.accessToken,
    body: JSON.stringify({
      requestType: 'documents',
      shipmentId: portal.body.shipmentIds[0],
      message: 'Please provide the release document.',
    }),
  });
  assert.equal(createdServiceRequest.response.status, 201, output);
  assert.equal(createdServiceRequest.body.request.status, 'open');

  const portalRequests = await request('/portal/requests', { token: portal.body.accessToken });
  assert.equal(portalRequests.response.status, 200);
  assert.equal(portalRequests.body.requests.length, 1);

  const portalStaffQueue = await request('/records/service-requests', {
    token: portal.body.accessToken,
  });
  assert.equal(portalStaffQueue.response.status, 403);

  const staffQueue = await request('/records/service-requests', { token: staff.accessToken });
  assert.equal(staffQueue.response.status, 200);
  assert.equal(staffQueue.body.requests.length, 1);

  const patchedServiceRequest = await request(
    `/records/service-requests/${encodeURIComponent(createdServiceRequest.body.request.id)}`,
    {
      method: 'PATCH',
      token: staff.accessToken,
      body: JSON.stringify({ status: 'in_progress', assignedTo: 'Ops desk', acknowledged: true }),
    },
  );
  assert.equal(patchedServiceRequest.response.status, 200);
  assert.equal(patchedServiceRequest.body.request.status, 'in_progress');
  assert.equal(patchedServiceRequest.body.request.assignedTo, 'Ops desk');
  assert.ok(patchedServiceRequest.body.request.acknowledgedAt);

  const ignoredLogout = await request('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ sub: 'STAFF-DEMO-RAYA', realm: 'staff' }),
  });
  assert.equal(ignoredLogout.response.status, 200);
  assert.equal(ignoredLogout.body.revoked, false);

  const refreshed = await request('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken: staff.refreshToken }),
  });
  assert.equal(refreshed.response.status, 200, 'Unauthenticated logout must not revoke another subject');

  const agent = await login('AGENT-DEMO-RAYA');
  const forbiddenDelete = await request('/records/disbursements/test-case', {
    method: 'DELETE',
    token: agent.accessToken,
  });
  assert.equal(forbiddenDelete.response.status, 403);

  const allowedDelete = await request('/records/disbursements/test-case', {
    method: 'DELETE',
    token: staff.accessToken,
  });
  assert.equal(allowedDelete.response.status, 200);

  const authorizedLogout = await request('/auth/logout', {
    method: 'POST',
    token: refreshed.body.accessToken,
    body: JSON.stringify({ refreshToken: refreshed.body.refreshToken }),
  });
  assert.equal(authorizedLogout.response.status, 200);
  assert.equal(authorizedLogout.body.revoked, true);

  const revokedRefresh = await request('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken: refreshed.body.refreshToken }),
  });
  assert.equal(revokedRefresh.response.status, 401);

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const failed = await request('/auth/portal/login', {
      method: 'POST',
      body: JSON.stringify({ taxNumber: 'invalid', accessCode: 'invalid' }),
    });
    assert.equal(failed.response.status, 401);
  }
  const throttled = await request('/auth/portal/login', {
    method: 'POST',
    body: JSON.stringify({ taxNumber: 'invalid', accessCode: 'invalid' }),
  });
  assert.equal(throttled.response.status, 429);
  assert.ok(Number(throttled.response.headers.get('retry-after')) > 0);

  console.log('API security regression tests passed');
} finally {
  child.kill();
  await new Promise((resolve) => {
    if (child.exitCode !== null) return resolve();
    child.once('exit', resolve);
    setTimeout(resolve, 2000);
  });
  await rm(root, { recursive: true, force: true });
}
