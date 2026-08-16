/**
 * Production runner: serves the built frontend (dist/public) and routes
 * /rapi/* to the Raya API server (rewritten to /api), mirroring the dev
 * topology (Vite proxy + server/index.mjs) in a single deployable unit.
 *
 * Env contract (fails closed via server/privateConfig.mjs):
 *   RAYA_JWT_SECRET  — 48+ char secret; derived from SESSION_SECRET if unset
 *   RAYA_DATABASE_URL — defaults to DATABASE_URL
 *   CORS_ORIGIN      — defaults to https://<first REPLIT_DOMAINS entry>
 */
import http from 'node:http';
import { spawn } from 'node:child_process';
import { createHmac } from 'node:crypto';
import { createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'dist', 'public');
const PORT = Number(process.env.PORT);
const API_HOST = '127.0.0.1';
const API_PORT = Number(process.env.RAYA_API_PORT || 8787);

if (!Number.isInteger(PORT) || PORT <= 0) {
  console.error('[prod] PORT environment variable is required.');
  process.exit(1);
}
if (!existsSync(path.join(PUBLIC_DIR, 'index.html'))) {
  console.error(`[prod] Missing build output at ${PUBLIC_DIR}. Run the build first.`);
  process.exit(1);
}

// ---- Resolve the production env contract (fail closed) ----
let jwtSecret = String(process.env.RAYA_JWT_SECRET || '').trim();
if (!jwtSecret) {
  const seed = String(process.env.SESSION_SECRET || '').trim();
  if (!seed) {
    console.error('[prod] RAYA_JWT_SECRET is not set and SESSION_SECRET is unavailable to derive one. Refusing to start.');
    process.exit(1);
  }
  // Deterministic 64-hex-char derivation so tokens survive restarts.
  jwtSecret = createHmac('sha256', seed).update('raya-customs-jwt-v1').digest('hex');
}

let corsOrigin = String(process.env.CORS_ORIGIN || '').trim();
if (!corsOrigin) {
  const domain = String(process.env.REPLIT_DOMAINS || '').split(',')[0].trim();
  if (!domain) {
    console.error('[prod] CORS_ORIGIN is not set and REPLIT_DOMAINS is unavailable. Refusing to start.');
    process.exit(1);
  }
  corsOrigin = `https://${domain}`;
}

const databaseUrl = String(process.env.RAYA_DATABASE_URL || process.env.DATABASE_URL || '').trim();
if (!databaseUrl) {
  console.error('[prod] RAYA_DATABASE_URL (or DATABASE_URL) is required in production. Refusing to start.');
  process.exit(1);
}

// ---- Start the API server as a child process ----
let shuttingDown = false;
const api = spawn(process.execPath, [path.join(__dirname, 'server', 'index.mjs')], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: String(API_PORT),
    HOST: API_HOST,
    RAYA_JWT_SECRET: jwtSecret,
    RAYA_DATABASE_URL: databaseUrl,
    CORS_ORIGIN: corsOrigin,
    RAYA_ALLOW_DEMO_AUTH: 'false',
  },
});
api.on('exit', (code, signal) => {
  if (shuttingDown) return;
  console.error(`[prod] API server exited (code=${code}, signal=${signal}); shutting down.`);
  process.exit(code ?? 1);
});

function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  if (api.exitCode === null && !api.killed) api.kill('SIGTERM');
  setTimeout(() => process.exit(code), 500);
}
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

// ---- Static file serving with SPA fallback + /rapi proxy ----
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

function sendFile(res, filePath, cacheControl) {
  res.writeHead(200, {
    'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
    'Content-Length': statSync(filePath).size,
    'Cache-Control': cacheControl,
    'X-Content-Type-Options': 'nosniff',
  });
  createReadStream(filePath).pipe(res);
}

const server = http.createServer((req, res) => {
  try {
    handleRequest(req, res);
  } catch (error) {
    console.error('[prod] request handler error:', error.message);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
    }
    res.end(JSON.stringify({ error: 'internal_error' }));
  }
});

function handleRequest(req, res) {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname === '/rapi' || url.pathname.startsWith('/rapi/')) {
    const rewritten = url.pathname.replace(/^\/rapi/, '/api') + url.search;
    const upstream = http.request(
      {
        host: API_HOST,
        port: API_PORT,
        method: req.method,
        path: rewritten,
        headers: { ...req.headers, host: `${API_HOST}:${API_PORT}` },
      },
      (upstreamRes) => {
        res.writeHead(upstreamRes.statusCode || 502, upstreamRes.headers);
        upstreamRes.pipe(res);
      },
    );
    upstream.on('error', (err) => {
      console.error('[prod] proxy error:', err.message);
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
      }
      res.end(JSON.stringify({ error: 'upstream_unavailable' }));
    });
    req.pipe(upstream);
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain' }).end('Method Not Allowed');
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain' }).end('Bad Request');
    return;
  }
  const candidate = path.normalize(path.join(PUBLIC_DIR, pathname));
  if (candidate.startsWith(PUBLIC_DIR) && existsSync(candidate) && statSync(candidate).isFile()) {
    const immutable = pathname.startsWith('/assets/');
    sendFile(res, candidate, immutable ? 'public, max-age=31536000, immutable' : 'public, max-age=3600');
    return;
  }

  // SPA fallback
  sendFile(res, path.join(PUBLIC_DIR, 'index.html'), 'no-cache');
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[prod] serving ${PUBLIC_DIR} on :${PORT}, proxying /rapi -> ${API_HOST}:${API_PORT}/api`);
});
