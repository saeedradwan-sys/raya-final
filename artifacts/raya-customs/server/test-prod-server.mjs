/**
 * Integration test for the production runner (prod.mjs):
 * - malformed percent-encoded static URLs return 400 and do NOT crash the server
 * - the server keeps serving static + /rapi requests afterwards
 *
 * Run: node server/test-prod-server.mjs
 * Requires a prior build (dist/public) and DATABASE_URL/SESSION_SECRET in env.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 18790;
const BASE = `http://127.0.0.1:${PORT}`;

const child = spawn(process.execPath, [path.join(root, 'prod.mjs')], {
  cwd: root,
  stdio: ['ignore', 'inherit', 'inherit'],
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: String(PORT),
    RAYA_API_PORT: '18791',
  },
});

function fail(message) {
  console.error(`FAIL: ${message}`);
  child.kill('SIGTERM');
  process.exit(1);
}

async function waitForHealth(timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/rapi/health`);
      if (res.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  fail('server did not become healthy in time');
}

const results = [];
function check(name, ok) {
  results.push({ name, ok });
  console.log(`${ok ? 'ok' : 'FAIL'} - ${name}`);
}

try {
  await waitForHealth();

  // Malformed percent-encoding must not crash the process.
  for (const bad of ['/%', '/%zz', '/foo%2', '/assets/%E0%A4%A']) {
    const res = await fetch(`${BASE}${bad}`);
    check(`${bad} returns 400`, res.status === 400);
  }

  // Server remains available afterwards.
  const index = await fetch(`${BASE}/`);
  check('index still 200 after malformed URLs', index.status === 200);

  const spa = await fetch(`${BASE}/portal`);
  check('SPA fallback still 200', spa.status === 200);

  const health = await fetch(`${BASE}/rapi/health`);
  check('/rapi/health still ok', health.ok);

  check('server process still running', child.exitCode === null);
} catch (error) {
  fail(error.message);
} finally {
  child.kill('SIGTERM');
}

if (results.some((r) => !r.ok)) process.exit(1);
console.log('All prod server tests passed.');
