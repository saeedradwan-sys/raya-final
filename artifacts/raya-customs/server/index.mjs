/**
 * Raya demo API — JWT access + refresh tokens with rotation.
 * Run: node server/index.mjs
 */
import http from 'node:http';
import { scryptSync, timingSafeEqual } from 'node:crypto';
import { PRIVATE_RUNTIME } from './privateConfig.mjs';
import { signJwt, verifyJwt } from './jwt.mjs';
import { STAFF_TOKENS, PORTAL_CREDENTIALS, SHIPMENTS_BY_TAX } from './data.mjs';
import { databaseEnabled, databaseHealth, getDatabase } from './database.mjs';
import {
  channelInfo,
  submitDraft as asycudaSubmitDraft,
  listDrafts as asycudaListDrafts,
  getDraft as asycudaGetDraft,
  fetchDeclarationStatus,
  applyStatusToShipment,
} from './asycudaChannel.mjs';
import { appendServerAudit, listServerAudit, auditStats } from './auditStore.mjs';
import {
  listShipments as listUserShipmentsOnly,
  allShipmentsMerged,
  listShipmentsForTax,
  listDisbursements as listUserDisbursements,

  upsertShipment,
  upsertDisbursement,
  deleteShipment,
  deleteDisbursement,
  patchShipment,
  toggleDocument,
  getShipmentById,
} from './recordsStore.mjs';
import {
  buildJournal as buildServerJournal,
  buildClearingReconciliation as buildServerReconciliation,
  buildRecoveryQueue as buildServerRecoveryQueue,
  clientStatementLines as serverStatementLines,
  portfolioMetrics as serverPortfolioMetrics,
} from './accountingCalc.mjs';
import {
  saveJournalEntry,
  listJournalEntries,
  getReconState,
  setReconState,
} from './accountingStore.mjs';
import {
  newJti,
  newFamilyId,
  saveRefresh,
  consumeRefresh,
  revokeFamily,
  revokeBySub,
  stats,
} from './refreshStore.mjs';
import { getBestTerminalTracking, trackingProviderInfo } from './terminalTracking.mjs';
import { ask, stream as llamaStream, llamaProviderInfo, LlamaDisabledError } from './llamaClient.mjs';
import {
  buildHsPrompts,
  buildLegalResearchPrompts,
  buildDocsPrompts,
  buildNextActionPrompts,
  buildInvoiceParsePrompts,
  buildChatSystemPrompt,
} from './assistPrompts.mjs';
import {
  createServiceRequest,
  listPortalServiceRequests,
  listStaffServiceRequests,
  updateServiceRequest,
} from './serviceRequestStore.mjs';

const { port: PORT, host: HOST, jwtSecret: JWT_SECRET, accessTtl: ACCESS_TTL, refreshTtl: REFRESH_TTL } = PRIVATE_RUNTIME;

function readPositiveInteger(value, fallback, minimum = 1) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(minimum, Math.floor(parsed)) : fallback;
}

const LOGIN_WINDOW_MS = readPositiveInteger(process.env.RAYA_LOGIN_WINDOW_MS, 15 * 60_000, 60_000);
const LOGIN_MAX_ATTEMPTS = readPositiveInteger(process.env.RAYA_LOGIN_MAX_ATTEMPTS, 8, 3);
const LLAMA_RATE_WINDOW_MS = readPositiveInteger(process.env.RAYA_LLAMA_RATE_WINDOW_MS, 60_000, 1_000);
const LLAMA_RATE_MAX_REQUESTS = readPositiveInteger(process.env.RAYA_LLAMA_RATE_MAX_REQUESTS, 20);
const LLAMA_MAX_CONCURRENT = readPositiveInteger(process.env.RAYA_LLAMA_MAX_CONCURRENT, 2);
const loginAttempts = new Map();
const llamaRequests = new Map();
let llamaActiveRequests = 0;

function loginClientAddress(req) {
  const forwarded = String(req.headers['x-real-ip'] || '').trim();
  return forwarded || req.socket?.remoteAddress || 'unknown';
}

function loginRateState(req, realm) {
  const now = Date.now();
  const key = `${realm}:${loginClientAddress(req)}`;
  const recent = (loginAttempts.get(key) || []).filter((time) => now - time < LOGIN_WINDOW_MS);
  if (recent.length) loginAttempts.set(key, recent);
  else loginAttempts.delete(key);
  return {
    key,
    allowed: recent.length < LOGIN_MAX_ATTEMPTS,
    retryAfter: recent.length ? Math.max(1, Math.ceil((recent[0] + LOGIN_WINDOW_MS - now) / 1000)) : 0,
  };
}

function recordLoginFailure(state) {
  const recent = loginAttempts.get(state.key) || [];
  loginAttempts.set(state.key, [...recent, Date.now()]);
}

function clearLoginFailures(state) {
  loginAttempts.delete(state.key);
}

function acquireLlamaRequest(req, payload) {
  const now = Date.now();
  const key = `${payload.organizationId}:${payload.sub}:${loginClientAddress(req)}`;
  const recent = (llamaRequests.get(key) || []).filter((time) => now - time < LLAMA_RATE_WINDOW_MS);
  if (recent.length >= LLAMA_RATE_MAX_REQUESTS) {
    llamaRequests.set(key, recent);
    return {
      allowed: false,
      status: 429,
      error: 'llama_rate_limited',
      retryAfter: Math.max(1, Math.ceil((recent[0] + LLAMA_RATE_WINDOW_MS - now) / 1000)),
    };
  }
  if (llamaActiveRequests >= LLAMA_MAX_CONCURRENT) {
    return { allowed: false, status: 503, error: 'llama_busy', retryAfter: 1 };
  }

  llamaRequests.set(key, [...recent, now]);
  llamaActiveRequests += 1;
  let released = false;
  return {
    allowed: true,
    release() {
      if (released) return;
      released = true;
      llamaActiveRequests = Math.max(0, llamaActiveRequests - 1);
    },
  };
}

function rejectLlamaRequest(res, state) {
  return send(
    res,
    state.status,
    { error: state.error },
    { 'Retry-After': String(state.retryAfter) },
  );
}

function verifyActivationCode(stored, candidate) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const actual = Buffer.from(parts[2], 'hex');
  const derived = scryptSync(String(candidate || ''), parts[1], actual.length);
  return actual.length === derived.length && timingSafeEqual(actual, derived);
}

async function databaseStaffClaims(emailOrId, code, byId = false) {
  if (!databaseEnabled()) return null;
  const selector = byId ? 'u.id::text = $1' : 'u.email = $1';
  const result = await getDatabase().query(
    `SELECT u.id, u.email, u.display_name_en, u.display_name_ar, u.password_hash, u.status, m.organization_id, m.role, m.permissions
     FROM users u JOIN organization_memberships m ON m.user_id = u.id
     WHERE ${selector} AND m.active = true LIMIT 1`,
    [String(emailOrId).trim().toLowerCase()],
  );
  const row = result.rows[0];
  if (!row || row.status !== 'active' || (!byId && !verifyActivationCode(row.password_hash, code))) return null;
  const permissions = Array.isArray(row.permissions) ? row.permissions : [];
  return {
    sub: String(row.id),
    realm: 'staff',
    organizationId: String(row.organization_id),
    role: row.role === 'owner' ? 'staff' : row.role,
    nameEn: row.display_name_en,
    nameAr: row.display_name_ar || row.display_name_en,
    permissions: permissions.includes('*') ? ['shipments:read', 'shipments:write', 'clearing:read', 'clearing:export', 'journals:post', 'audit:read'] : permissions,
  };
}

async function databasePortalClaims(taxOrId, code, byId = false) {
  if (!databaseEnabled()) return null;
  const selector = byId ? 'c.id::text = $1' : 'c.tax_number = $1';
  const result = await getDatabase().query(
    `SELECT c.id, c.organization_id, c.tax_number, c.legal_name_en, c.legal_name_ar,
            c.access_code_hash, c.status
     FROM clients c
     WHERE ${selector} LIMIT 1`,
    [String(taxOrId).trim()],
  );
  const row = result.rows[0];
  if (!row || row.status !== 'active' || (!byId && !verifyActivationCode(row.access_code_hash, code))) return null;
  const shipments = await listShipmentsForTax(row.tax_number, row.organization_id);
  return {
    sub: String(row.id),
    realm: 'portal',
    organizationId: String(row.organization_id),
    taxNumber: row.tax_number,
    shipmentIds: shipments.map((shipment) => shipment.id),
    nameEn: row.legal_name_en,
    nameAr: row.legal_name_ar || row.legal_name_en,
    permissions: ['portal:shipments:read'],
  };
}

function send(res, status, body, extraHeaders = {}) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(data),
    'Access-Control-Allow-Origin': PRIVATE_RUNTIME.corsOrigin,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    ...extraHeaders,
  });
  res.end(data);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let tooLarge = false;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > PRIVATE_RUNTIME.maxBodyBytes) {
        tooLarge = true;
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (tooLarge) return reject(new Error('body_too_large'));
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('invalid_json'));
      }
    });
    req.on('error', reject);
  });
}

function getBearer(req) {
  const h = req.headers.authorization || '';
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1].trim() : null;
}

async function issueTokenPair(claims) {
  const familyId = claims.familyId || newFamilyId();
  const jti = newJti();
  const now = Math.floor(Date.now() / 1000);

  const accessToken = signJwt(
    {
      ...claims,
      typ: 'access',
      familyId,
    },
    JWT_SECRET,
    ACCESS_TTL,
  );

  const refreshToken = signJwt(
    {
      sub: claims.sub,
      realm: claims.realm,
      typ: 'refresh',
      jti,
      familyId,
    },
    JWT_SECRET,
    REFRESH_TTL,
  );

  await saveRefresh(jti, {
    sub: claims.sub,
    realm: claims.realm,
    familyId,
    expiresAtSec: now + REFRESH_TTL,
  });

  return {
    accessToken,
    refreshToken,
    tokenType: 'Bearer',
    expiresIn: ACCESS_TTL,
    refreshExpiresIn: REFRESH_TTL,
  };
}

/** Access-token only middleware */
function requireAuth(req, res, opts = {}) {
  const token = getBearer(req);
  const result = verifyJwt(token, JWT_SECRET);
  if (!result.ok) {
    send(res, 401, { error: 'unauthorized', reason: result.error });
    return null;
  }
  const payload = result.payload;
  if (payload.typ && payload.typ !== 'access') {
    send(res, 401, { error: 'unauthorized', reason: 'not_access_token' });
    return null;
  }
  if (opts.realm && payload.realm !== opts.realm) {
    send(res, 403, { error: 'forbidden', reason: 'wrong_realm' });
    return null;
  }
  if (opts.permissions?.length) {
    const perms = payload.permissions || [];
    const missing = opts.permissions.filter((p) => !perms.includes(p));
    if (missing.length) {
      send(res, 403, {
        error: 'forbidden',
        reason: 'insufficient_permissions',
        missing,
      });
      return null;
    }
  }
  if (opts.roles?.length && !opts.roles.includes(payload.role)) {
    send(res, 403, {
      error: 'forbidden',
      reason: 'role_not_allowed',
      role: payload.role,
    });
    return null;
  }
  return payload;
}

function canMutateDisbursements(payload) {
  const perms = payload.permissions || [];
  return (
    perms.includes('journals:post') ||
    perms.includes('shipments:write') ||
    payload.role === 'staff' ||
    payload.role === 'accounting'
  );
}

/**
 * Converts Llama JSON output (varies by agentId) into AgentSuggestion[].
 */
function normalizeLlamaOutput(agentId, parsed) {
  const suggestions = [];

  if (agentId === 'hs') {
    const items = Array.isArray(parsed) ? parsed : [parsed];
    items.slice(0, 5).forEach((item, i) => {
      const pct = Number(item.confidence_pct || 0);
      suggestions.push({
        id: `llama-hs-${item.hs_code || i}`,
        agentId: 'hs',
        titleEn: `HS ${item.hs_code || '?'} · confidence ${pct}%`,
        titleAr: `HS ${item.hs_code || '?'} · ثقة ${pct}٪`,
        bodyEn: `${item.description_en || ''}. Duty: ${item.duty_rate || '?'}. ${item.reasoning_en || ''}`,
        bodyAr: `${item.description_ar || item.description_en || ''}. الرسم: ${item.duty_rate || '?'}. ${item.reasoning_ar || ''}`,
        confidence: pct >= 70 ? 'high' : pct >= 45 ? 'medium' : 'low',
        priority: i + 1,
        meta: {
          hs: item.hs_code || '',
          confidence: String(pct),
          source: 'llama',
          needs_review: item.needs_review ? 'true' : 'false',
        },
        links: [{ href: '/hs-search', labelEn: 'Verify in HS search', labelAr: 'تحقق في بحث HS' }],
      });
    });
  } else if (agentId === 'docs') {
    const core = parsed.core_docs || [];
    const authDocs = parsed.authority_docs || [];
    suggestions.push({
      id: 'llama-docs-core',
      agentId: 'docs',
      titleEn: 'Core document pack',
      titleAr: 'حزمة الوثائق الأساسية',
      bodyEn: core.map((d) => `• ${d}`).join('\n'),
      bodyAr: core.map((d) => `• ${d}`).join('\n'),
      confidence: parsed.confidence || 'high',
      priority: 1,
      meta: { source: 'llama' },
    });
    authDocs.forEach((ad, i) => {
      suggestions.push({
        id: `llama-docs-auth-${i}`,
        agentId: 'docs',
        titleEn: `${ad.authority} requirements`,
        titleAr: `متطلبات ${ad.authority}`,
        bodyEn: (ad.docs || []).map((d) => `• ${d}`).join('\n') + (ad.reason_en ? `\n${ad.reason_en}` : ''),
        bodyAr: (ad.docs || []).map((d) => `• ${d}`).join('\n') + (ad.reason_ar ? `\n${ad.reason_ar}` : ''),
        confidence: 'medium',
        priority: i + 2,
        meta: { source: 'llama' },
        links: [{ href: '/authorities', labelEn: 'Authorities guide', labelAr: 'دليل الجهات' }],
      });
    });
    if (parsed.notes_en) {
      suggestions.push({
        id: 'llama-docs-notes',
        agentId: 'docs',
        titleEn: 'Additional notes',
        titleAr: 'ملاحظات إضافية',
        bodyEn: parsed.notes_en,
        bodyAr: parsed.notes_ar || parsed.notes_en,
        confidence: 'low',
        priority: 99,
        meta: { source: 'llama' },
      });
    }
  } else if (agentId === 'next_action') {
    const actions = parsed.actions || [];
    actions.forEach((action, i) => {
      suggestions.push({
        id: `llama-next-${i}`,
        agentId: 'next_action',
        titleEn: action.title_en || 'Action',
        titleAr: action.title_ar || 'إجراء',
        bodyEn: action.detail_en || '',
        bodyAr: action.detail_ar || '',
        confidence: action.urgency === 'critical' || action.urgency === 'high' ? 'high' : action.urgency === 'medium' ? 'medium' : 'low',
        priority: action.priority || i + 1,
        meta: { source: 'llama', urgency: action.urgency || 'medium' },
        links: action.route ? [{ href: action.route, labelEn: 'View guide', labelAr: 'عرض الدليل' }] : [],
      });
    });
  } else if (agentId === 'legal_research') {
    // Legal research returns free-text; wrap into one suggestion
    const text = typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2);
    suggestions.push({
      id: 'llama-legal-result',
      agentId: 'legal_research',
      titleEn: 'Legal research result',
      titleAr: 'نتيجة البحث القانوني',
      bodyEn: text,
      bodyAr: text,
      confidence: 'medium',
      priority: 1,
      meta: { source: 'llama' },
      links: [
        { href: '/laws', labelEn: 'Laws reference', labelAr: 'المرجع القانوني' },
        { href: '/authorities', labelEn: 'Authorities', labelAr: 'الجهات' },
      ],
    });
  }

  return suggestions;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${HOST}:${PORT}`);
  const path = url.pathname;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': PRIVATE_RUNTIME.corsOrigin,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    });
    return res.end();
  }

  try {
    if (req.method === 'GET' && path === '/api/health') {
      return send(res, 200, {
        ok: true,
        service: 'raya-api',
        jwt: 'HS256',
        accessTtl: ACCESS_TTL,
        refreshTtl: REFRESH_TTL,
        refreshStore: await stats(),
        audit: await auditStats(),
        database: await databaseHealth(),
        asycuda: channelInfo(),
        tracking: trackingProviderInfo(),
        llama: llamaProviderInfo(),
        deploymentMode: PRIVATE_RUNTIME.isPrivateDeployment ? 'private' : 'development',
        demoAuthEnabled: PRIVATE_RUNTIME.allowDemoAuth,
      });
    }

    // --- Staff-only container and B/L provider tracking ---
    if (req.method === 'GET' && path === '/api/tracking/container') {
      const payload = requireAuth(req, res, { realm: 'staff', permissions: ['shipments:read'] });
      if (!payload) return;
      const result = await getBestTerminalTracking(
        url.searchParams.get('reference'),
        url.searchParams.get('provider'),
        url.searchParams.get('carrier'),
      );
      if (!result.ok) return send(res, 400, { error: result.error });
      await appendServerAudit({
        actorType: 'staff',
        actorId: payload.sub,
        actorRole: payload.role,
        organizationId: payload.organizationId,
        action: 'tracking.lookup',
        entityType: 'tracking_reference',
        entityId: result.reference,
        detailEn: `Tracking lookup via ${result.source}`,
        detailAr: `استعلام تتبع عبر ${result.source}`,
        meta: { source: result.source, live: result.live, eventCount: result.events.length },
      });
      return send(res, 200, result);
    }
    // --- Staff login ---
    if (req.method === 'POST' && path === '/api/auth/staff/login') {
      const body = await readBody(req);
      const rate = loginRateState(req, 'staff');
      if (!rate.allowed) {
        return send(res, 429, { error: 'too_many_attempts' }, { 'Retry-After': String(rate.retryAfter) });
      }
      const email = String(body.email || '').trim().toLowerCase();
      const activationCode = String(body.activationCode || '').trim();
      const claims = email && activationCode ? await databaseStaffClaims(email, activationCode) : null;
      const tokenKey = String(body.token || '').trim().toUpperCase();
      const match = PRIVATE_RUNTIME.allowDemoAuth ? STAFF_TOKENS[tokenKey] : null;
      if (!claims && !match) {
        recordLoginFailure(rate);
        await appendServerAudit({
          actorType: 'staff',
          actorId: email || tokenKey || 'empty',
          action: 'auth.staff.login_failed',
          detailEn: 'Invalid staff token',
          detailAr: 'رمز موظف غير صالح',
          ip: req.socket?.remoteAddress,
        }).catch((error) => {
          // Failed logins from unknown actors cannot always be attributed to an
          // organization; auditing is best-effort here and must not mask the 401.
          console.warn('[audit] staff login_failed audit skipped:', error.message);
        });
        return send(res, 401, { error: 'invalid_credentials' });
      }
      clearLoginFailures(rate);
      const staffClaims = claims || { sub: tokenKey, realm: 'staff', role: match.role, nameEn: match.nameEn, nameAr: match.nameAr, permissions: match.permissions };
      const pair = await issueTokenPair(staffClaims);
      await appendServerAudit({
        actorType: 'staff',
        actorId: staffClaims.sub,
        actorRole: staffClaims.role,
        organizationId: staffClaims.organizationId,
        action: 'auth.staff.login',
        detailEn: `Staff login ${staffClaims.role}`,
        detailAr: `دخول موظف ${staffClaims.role}`,
      });
      return send(res, 200, {
        ...pair,
        realm: 'staff',
        role: staffClaims.role,
        displayNameEn: staffClaims.nameEn,
        displayNameAr: staffClaims.nameAr,
        permissions: staffClaims.permissions,
      });
    }

    // --- Portal login ---
    if (req.method === 'POST' && path === '/api/auth/portal/login') {
      const body = await readBody(req);
      const rate = loginRateState(req, 'portal');
      if (!rate.allowed) {
        return send(res, 429, { error: 'too_many_attempts' }, { 'Retry-After': String(rate.retryAfter) });
      }
      const tax = String(body.taxNumber || '').replace(/\s/g, '');
      const code = String(body.accessCode || '').trim();
      const databaseClaims = tax && code ? await databasePortalClaims(tax, code) : null;
      const match = PRIVATE_RUNTIME.allowDemoAuth
        ? PORTAL_CREDENTIALS.find((credential) => credential.taxNumber === tax && credential.accessCode === code.toUpperCase())
        : null;
      if (!databaseClaims && !match) {
        recordLoginFailure(rate);
        await appendServerAudit({
          actorType: 'portal',
          actorId: tax || 'empty',
          action: 'auth.portal.login_failed',
          detailEn: 'Invalid portal credentials',
          detailAr: 'بيانات بوابة غير صالحة',
          ip: req.socket?.remoteAddress,
        }).catch((error) => {
          // Failed logins from unknown actors cannot always be attributed to an
          // organization; auditing is best-effort here and must not mask the 401.
          console.warn('[audit] portal login_failed audit skipped:', error.message);
        });
        return send(res, 401, { error: 'invalid_credentials' });
      }
      clearLoginFailures(rate);
      const portalClaims = databaseClaims || {
        sub: tax,
        realm: 'portal',
        taxNumber: tax,
        shipmentIds: SHIPMENTS_BY_TAX[tax] || [],
        nameEn: match.customerNameEn,
        nameAr: match.customerNameAr,
        permissions: ['portal:shipments:read'],
      };
      const pair = await issueTokenPair(portalClaims);
      await appendServerAudit({
        actorType: 'portal',
        actorId: portalClaims.sub,
        organizationId: portalClaims.organizationId,
        action: 'auth.portal.login',
        detailEn: `Portal login ${tax}`,
        detailAr: `دخول بوابة ${tax}`,
      });
      return send(res, 200, {
        ...pair,
        realm: 'portal',
        taxNumber: portalClaims.taxNumber,
        shipmentIds: portalClaims.shipmentIds,
        customerNameEn: portalClaims.nameEn,
        customerNameAr: portalClaims.nameAr,
      });
    }

    // --- Refresh: rotate refresh token, issue new access ---
    if (req.method === 'POST' && path === '/api/auth/refresh') {
      const body = await readBody(req);
      const refreshToken = body.refreshToken || getBearer(req);
      const verified = verifyJwt(refreshToken, JWT_SECRET);
      if (!verified.ok) {
        return send(res, 401, { error: 'unauthorized', reason: verified.error });
      }
      const payload = verified.payload;
      if (payload.typ !== 'refresh' || !payload.jti) {
        return send(res, 401, { error: 'unauthorized', reason: 'not_refresh_token' });
      }

      const consumed = await consumeRefresh(payload.jti);
      if (!consumed.ok) {
        if (consumed.error === 'revoked_reuse') {
          await revokeFamily(payload.familyId);
          return send(res, 401, {
            error: 'unauthorized',
            reason: 'refresh_reuse_detected',
            message: 'Refresh token reuse — session family revoked',
          });
        }
        return send(res, 401, { error: 'unauthorized', reason: consumed.error });
      }

      // Rebuild access claims from original login shape
      let accessClaims;
      if (payload.realm === 'staff') {
        const databaseClaims = await databaseStaffClaims(payload.sub, '', true);
        const match = PRIVATE_RUNTIME.allowDemoAuth ? STAFF_TOKENS[payload.sub] : null;
        if (!databaseClaims && !match) {
          return send(res, 401, { error: 'unauthorized', reason: 'subject_unknown' });
        }
        accessClaims = {
          ...(databaseClaims || { sub: payload.sub, realm: 'staff', role: match.role, nameEn: match.nameEn, nameAr: match.nameAr, permissions: match.permissions }),
          familyId: payload.familyId,
        };
      } else if (payload.realm === 'portal') {
        const databaseClaims = await databasePortalClaims(payload.sub, '', true);
        const credential = PRIVATE_RUNTIME.allowDemoAuth
          ? PORTAL_CREDENTIALS.find((item) => item.taxNumber === payload.sub)
          : null;
        if (!databaseClaims && !credential) {
          return send(res, 401, { error: 'unauthorized', reason: 'subject_unknown' });
        }
        accessClaims = {
          ...(databaseClaims || {
            sub: payload.sub,
            realm: 'portal',
            taxNumber: payload.sub,
            shipmentIds: SHIPMENTS_BY_TAX[payload.sub] || [],
            nameEn: credential.customerNameEn,
            nameAr: credential.customerNameAr,
            permissions: ['portal:shipments:read'],
          }),
          familyId: payload.familyId,
        };
      } else {
        return send(res, 401, { error: 'unauthorized', reason: 'bad_realm' });
      }

      const pair = await issueTokenPair(accessClaims);
      await appendServerAudit({
        actorType: accessClaims.realm === 'portal' ? 'portal' : 'staff',
        actorId: accessClaims.sub,
        actorRole: accessClaims.role || null,
        organizationId: accessClaims.organizationId,
        action: 'auth.token.refresh',
        detailEn: 'Access token refreshed',
        detailAr: 'تجديد رمز الوصول',
      });
      return send(res, 200, {
        ...pair,
        realm: accessClaims.realm,
        role: accessClaims.role || null,
        taxNumber: accessClaims.taxNumber || null,
        permissions: accessClaims.permissions,
        shipmentIds: accessClaims.shipmentIds || null,
        displayNameEn: accessClaims.nameEn,
        displayNameAr: accessClaims.nameAr,
        customerNameEn: accessClaims.realm === 'portal' ? accessClaims.nameEn : undefined,
        customerNameAr: accessClaims.realm === 'portal' ? accessClaims.nameAr : undefined,
      });
    }

    // --- Logout: revoke all refresh tokens for subject ---
    if (req.method === 'POST' && path === '/api/auth/logout') {
      const body = await readBody(req);
      const access = getBearer(req);
      let sub = null;
      let realm = null;
      if (access) {
        const v = verifyJwt(access, JWT_SECRET);
        if (v.ok && (!v.payload.typ || v.payload.typ === 'access')) {
          sub = v.payload.sub;
          realm = v.payload.realm;
        }
      }
      if (body.refreshToken) {
        const v = verifyJwt(body.refreshToken, JWT_SECRET);
        if (v.ok && v.payload.jti && v.payload.typ === 'refresh') {
          sub ||= v.payload.sub;
          realm ||= v.payload.realm;
          const c = await consumeRefresh(v.payload.jti);
          if (c.ok) await revokeFamily(v.payload.familyId);
          else if (v.payload.familyId) await revokeFamily(v.payload.familyId);
        }
      }
      const revoked = Boolean(sub && realm);
      if (revoked) await revokeBySub(sub, realm);
      await appendServerAudit({
        actorType: realm === 'portal' ? 'portal' : realm === 'staff' ? 'staff' : 'system',
        actorId: sub || 'unknown',
        action: 'auth.logout',
        detailEn: revoked ? 'Session logout / refresh revoked' : 'Ignored unauthenticated logout request',
        detailAr: revoked ? 'خروج / إلغاء التجديد' : 'تم تجاهل طلب خروج غير موثق',
      });
      return send(res, 200, { ok: true, revoked });
    }

    // --- me (access token) ---
    if (req.method === 'GET' && path === '/api/auth/me') {
      const payload = requireAuth(req, res);
      if (!payload) return;
      return send(res, 200, {
        sub: payload.sub,
        realm: payload.realm,
        role: payload.role || null,
        taxNumber: payload.taxNumber || null,
        permissions: payload.permissions || [],
        nameEn: payload.nameEn,
        nameAr: payload.nameAr,
        shipmentIds: payload.shipmentIds || null,
        exp: payload.exp,
        iat: payload.iat,
        typ: payload.typ || 'access',
      });
    }

    if (req.method === 'GET' && path === '/api/clearing/summary') {
      const payload = requireAuth(req, res, {
        realm: 'staff',
        permissions: ['clearing:read'],
      });
      if (!payload) return;
      await appendServerAudit({
        actorType: 'staff',
        actorId: payload.sub,
        actorRole: payload.role,
        action: 'clearing.summary.read',
        detailEn: 'Read clearing summary',
        detailAr: 'قراءة ملخص التسوية',
      });
      return send(res, 200, {
        asOf: new Date().toISOString().slice(0, 10),
        message: 'JWT access token validated server-side',
        role: payload.role,
        permissions: payload.permissions,
        subledger122100: 4385,
        subledger222100: 2000,
      });
    }

    if (req.method === 'GET' && path === '/api/portal/shipments') {
      const payload = requireAuth(req, res, { realm: 'portal' });
      if (!payload) return;
      const tax = payload.taxNumber || payload.sub;
      const shipments = await listShipmentsForTax(tax, payload.organizationId);
      return send(res, 200, {
        taxNumber: tax,
        shipmentIds: shipments.map((s) => s.id),
        shipments,
      });
    }

    if (req.method === 'POST' && path === '/api/portal/requests') {
      const payload = requireAuth(req, res, { realm: 'portal' });
      if (!payload) return;
      const body = await readBody(req);
      const requestType = String(body.requestType || body.type || '').trim().toLowerCase();
      if (!['payment', 'statement', 'documents', 'general'].includes(requestType)) {
        return send(res, 400, { error: 'invalid_request_type' });
      }
      const request = await createServiceRequest(
        { ...body, requestType },
        {
          organizationId: payload.organizationId,
          taxNumber: payload.taxNumber || payload.sub,
          clientNameEn: payload.nameEn,
          clientNameAr: payload.nameAr,
        },
      );
      await appendServerAudit({
        actorType: 'portal',
        actorId: payload.sub,
        organizationId: payload.organizationId,
        action: 'portal.service_request.create',
        entityType: 'service_request',
        entityId: request.id,
        detailEn: `Client created ${request.requestType} request`,
        detailAr: `أنشأ العميل طلب ${request.requestType}`,
        meta: { shipmentId: request.shipmentId || null },
        ip: req.socket?.remoteAddress,
      });
      return send(res, 201, { request });
    }

    if (req.method === 'GET' && path === '/api/portal/requests') {
      const payload = requireAuth(req, res, { realm: 'portal' });
      if (!payload) return;
      const requests = await listPortalServiceRequests({
        organizationId: payload.organizationId,
        taxNumber: payload.taxNumber || payload.sub,
      });
      return send(res, 200, { requests });
    }
    if (req.method === 'POST' && path === '/api/auth/validate') {
      const body = await readBody(req);
      const token = body.token || getBearer(req);
      const result = verifyJwt(token, JWT_SECRET);
      if (!result.ok) {
        return send(res, 401, { valid: false, error: result.error });
      }
      return send(res, 200, { valid: true, payload: result.payload });
    }

    if (req.method === 'GET' && path === '/api/audit') {
      const payload = requireAuth(req, res, { realm: 'staff', permissions: ['audit:read'] });
      if (!payload) return;
      const limit = Math.min(500, Number(url.searchParams.get('limit') || 50));
      const action = url.searchParams.get('action') || undefined;
      const actorId = url.searchParams.get('actorId') || undefined;
      const events = await listServerAudit({ limit, action, actorId, organizationId: payload.organizationId });
      return send(res, 200, { events, stats: await auditStats(payload.organizationId) });
    }

    if (req.method === 'POST' && path === '/api/audit') {
      const payload = requireAuth(req, res, { realm: 'staff' });
      if (!payload) return;
      const body = await readBody(req);
      if (!body.action || typeof body.action !== 'string') {
        return send(res, 400, { error: 'action_required' });
      }
      const row = await appendServerAudit({
        actorType: 'staff',
        actorId: payload.sub,
        actorRole: payload.role,
        action: String(body.action).slice(0, 120),
        entityType: body.entityType ? String(body.entityType).slice(0, 80) : null,
        entityId: body.entityId ? String(body.entityId).slice(0, 120) : null,
        detailEn: String(body.detailEn || body.action).slice(0, 2000),
        detailAr: String(body.detailAr || body.detailEn || body.action).slice(0, 2000),
        meta: body.meta && typeof body.meta === 'object' ? body.meta : undefined,
        ip: req.socket?.remoteAddress,
      });
      return send(res, 201, { ok: true, event: row });
    }


    // --- Client service request work queue ---
    if (req.method === 'GET' && path === '/api/records/service-requests') {
      const payload = requireAuth(req, res, { realm: 'staff', permissions: ['shipments:read'] });
      if (!payload) return;
      const requests = await listStaffServiceRequests(payload.organizationId);
      return send(res, 200, { requests });
    }

    if (req.method === 'PATCH' && path.startsWith('/api/records/service-requests/')) {
      const payload = requireAuth(req, res, { realm: 'staff', permissions: ['shipments:write'] });
      if (!payload) return;
      const id = decodeURIComponent(path.slice('/api/records/service-requests/'.length));
      const body = await readBody(req);
      if (body.status && !['open', 'in_progress', 'completed', 'rejected'].includes(String(body.status))) {
        return send(res, 400, { error: 'invalid_request_status' });
      }
      const request = await updateServiceRequest(id, body, payload.organizationId);
      if (!request) return send(res, 404, { error: 'not_found' });
      await appendServerAudit({
        actorType: 'staff',
        actorId: payload.sub,
        actorRole: payload.role,
        organizationId: payload.organizationId,
        action: 'records.service_request.patch',
        entityType: 'service_request',
        entityId: id,
        detailEn: `Updated client request ${id} to ${request.status}`,
        detailAr: `تحديث طلب العميل ${id} إلى ${request.status}`,
        meta: { status: request.status, assignedTo: request.assignedTo || null },
      });
      return send(res, 200, { request });
    }
    // --- User records (shipments / disbursements) ---
    if (req.method === 'GET' && path === '/api/records/shipments') {
      const payload = requireAuth(req, res, { realm: 'staff', permissions: ['shipments:read'] });
      if (!payload) return;
      const q = (url.searchParams.get('q') || '').trim().toLowerCase();
      let shipments = await allShipmentsMerged(payload.organizationId);
      if (q) {
        shipments = shipments.filter((s) => {
          const blob = [s.id, s.declarationNo, s.blNo, s.containerNo, s.taxNumber, s.customerNameEn, s.goodsEn, s.hsCodeSuggested]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          return blob.includes(q);
        });
      }
      return send(res, 200, { shipments, total: shipments.length });
    }
    if (req.method === 'POST' && path === '/api/records/shipments') {
      const payload = requireAuth(req, res, { realm: 'staff', permissions: ['shipments:write'] });
      if (!payload) return;
      const body = await readBody(req);
      const row = await upsertShipment(body, payload.organizationId);
      await appendServerAudit({
        actorType: 'staff',
        actorId: payload.sub,
        actorRole: payload.role,
        action: 'records.shipment.upsert',
        entityType: 'shipment',
        entityId: row.id,
        detailEn: `Upsert shipment ${row.declarationNo || row.blNo || row.id}`,
        detailAr: `حفظ شحنة ${row.declarationNo || row.blNo || row.id}`,
      });
      return send(res, 200, { shipment: row });
    }
    if (req.method === 'PATCH' && path.startsWith('/api/records/shipments/')) {
      const payload = requireAuth(req, res, { realm: 'staff', permissions: ['shipments:write'] });
      if (!payload) return;
      const id = path.slice('/api/records/shipments/'.length);
      const body = await readBody(req);
      const row = await patchShipment(id, body, payload.organizationId);
      if (!row) return send(res, 404, { error: 'not_found' });
      await appendServerAudit({
        actorType: 'staff',
        actorId: payload.sub,
        actorRole: payload.role,
        action: 'records.shipment.patch',
        entityType: 'shipment',
        entityId: id,
        detailEn: `Patch shipment ${id}`,
        detailAr: `تعديل شحنة ${id}`,
        meta: body,
      });
      return send(res, 200, { shipment: row });
    }
    if (req.method === 'DELETE' && path.startsWith('/api/records/shipments/')) {
      const payload = requireAuth(req, res, { realm: 'staff', permissions: ['shipments:write'] });
      if (!payload) return;
      const id = path.slice('/api/records/shipments/'.length);
      await deleteShipment(id, payload.organizationId);
      await appendServerAudit({
        actorType: 'staff',
        actorId: payload.sub,
        actorRole: payload.role,
        action: 'records.shipment.delete',
        entityType: 'shipment',
        entityId: id,
        detailEn: `Delete shipment ${id}`,
        detailAr: `حذف شحنة ${id}`,
      });
      return send(res, 200, { ok: true });
    }
    if (req.method === 'GET' && path === '/api/records/disbursements') {
      const payload = requireAuth(req, res, { realm: 'staff', permissions: ['clearing:read'] });
      if (!payload) return;
      return send(res, 200, { disbursements: await listUserDisbursements(payload.organizationId) });
    }
    if (req.method === 'POST' && path === '/api/records/disbursements') {
      const payload = requireAuth(req, res, {
        realm: 'staff',
        permissions: ['clearing:read'],
      });
      if (!payload) return;
      // accounting write: staff with clearing or journals
      if (!canMutateDisbursements(payload)) {
        return send(res, 403, { error: 'forbidden', reason: 'insufficient_permissions' });
      }
      const body = await readBody(req);
      const row = await upsertDisbursement(body, payload.organizationId);
      await appendServerAudit({
        actorType: 'staff',
        actorId: payload.sub,
        actorRole: payload.role,
        action: 'records.disbursement.upsert',
        entityType: 'disbursement',
        entityId: row.id,
        detailEn: `Upsert disbursement ${row.declarationNo}`,
        detailAr: `حفظ تسوية ${row.declarationNo}`,
      });
      return send(res, 200, { disbursement: row });
    }
    if (req.method === 'DELETE' && path.startsWith('/api/records/disbursements/')) {
      const payload = requireAuth(req, res, { realm: 'staff', permissions: ['clearing:read'] });
      if (!payload) return;
      if (!canMutateDisbursements(payload)) {
        return send(res, 403, { error: 'forbidden', reason: 'insufficient_permissions' });
      }
      const id = path.slice('/api/records/disbursements/'.length);
      await deleteDisbursement(id, payload.organizationId);
      await appendServerAudit({
        actorType: 'staff',
        actorId: payload.sub,
        actorRole: payload.role,
        action: 'records.disbursement.delete',
        entityType: 'disbursement',
        entityId: id,
        detailEn: `Delete disbursement ${id}`,
        detailAr: `حذف تسوية ${id}`,
      });
      return send(res, 200, { ok: true });
    }

    // --- Accounting (server-computed from persisted disbursements) ---
    if (req.method === 'GET' && path === '/api/accounting/summary') {
      const payload = requireAuth(req, res, { realm: 'staff', permissions: ['clearing:read'] });
      if (!payload) return;
      const cases = await listUserDisbursements(payload.organizationId);
      return send(res, 200, {
        metrics: serverPortfolioMetrics(cases),
        recoveryQueue: buildServerRecoveryQueue(cases),
        caseCount: cases.length,
      });
    }

    if (req.method === 'POST' && path === '/api/accounting/journal/preview') {
      const payload = requireAuth(req, res, { realm: 'staff', permissions: ['clearing:read'] });
      if (!payload) return;
      const body = await readBody(req);
      if (!['pay_first', 'client_prepay'].includes(String(body.mode))) {
        return send(res, 400, { error: 'invalid_mode' });
      }
      if (body.stage != null && !['payout', 'settle', 'full'].includes(String(body.stage))) {
        return send(res, 400, { error: 'invalid_stage' });
      }
      return send(res, 200, { journal: buildServerJournal(body) });
    }

    if (req.method === 'GET' && path === '/api/accounting/journal') {
      const payload = requireAuth(req, res, { realm: 'staff', permissions: ['clearing:read'] });
      if (!payload) return;
      const caseId = (url.searchParams.get('caseId') || '').trim() || undefined;
      const entries = await listJournalEntries(payload.organizationId, caseId);
      return send(res, 200, { entries });
    }

    if (req.method === 'POST' && path === '/api/accounting/journal') {
      const payload = requireAuth(req, res, { realm: 'staff', permissions: ['clearing:read'] });
      if (!payload) return;
      if (!canMutateDisbursements(payload)) {
        return send(res, 403, { error: 'forbidden', reason: 'insufficient_permissions' });
      }
      const body = await readBody(req);
      const caseId = String(body.disbursementId || '').trim();
      if (!caseId) return send(res, 400, { error: 'disbursement_id_required' });
      const cases = await listUserDisbursements(payload.organizationId);
      const disb = cases.find((c) => c.id === caseId);
      if (!disb) return send(res, 404, { error: 'not_found' });
      const stage = ['payout', 'settle', 'full'].includes(String(body.stage)) ? body.stage : 'full';
      // Server recomputes the journal from the persisted case — client figures are never trusted.
      const journal = buildServerJournal({
        mode: disb.mode,
        duties: disb.duties,
        portFees: disb.portFees,
        otherGov: disb.otherGovCharges,
        agencyFee: disb.agencyFee,
        prepayAmount: disb.prepayReceived,
        stage,
      });
      const entry = await saveJournalEntry(
        {
          disbursementId: caseId,
          stage,
          mode: disb.mode,
          ...journal,
          postedBy: payload.sub,
        },
        payload.organizationId,
      );
      await appendServerAudit({
        actorType: 'staff',
        actorId: payload.sub,
        actorRole: payload.role,
        organizationId: payload.organizationId,
        action: 'accounting.journal.post',
        entityType: 'journal_entry',
        entityId: entry.id,
        detailEn: `Posted journal for ${disb.declarationNo || caseId} (${stage})`,
        detailAr: `ترحيل قيد للبيان ${disb.declarationNo || caseId} (${stage})`,
        meta: { disbursementId: caseId, passThrough: journal.passThrough, revenue: journal.revenue },
      });
      return send(res, 200, { entry });
    }

    if (req.method === 'GET' && path.startsWith('/api/accounting/statement/')) {
      const payload = requireAuth(req, res, { realm: 'staff', permissions: ['clearing:read'] });
      if (!payload) return;
      const caseId = decodeURIComponent(path.slice('/api/accounting/statement/'.length));
      if (!caseId || caseId.includes('/')) return send(res, 404, { error: 'not_found' });
      const cases = await listUserDisbursements(payload.organizationId);
      const disb = cases.find((c) => c.id === caseId);
      if (!disb) return send(res, 404, { error: 'not_found' });
      return send(res, 200, { caseId, lines: serverStatementLines(disb) });
    }

    if (req.method === 'GET' && path === '/api/accounting/reconciliation') {
      const payload = requireAuth(req, res, { realm: 'staff', permissions: ['clearing:read'] });
      if (!payload) return;
      const asOf = (url.searchParams.get('asOf') || '').trim() || new Date().toISOString().slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) return send(res, 400, { error: 'invalid_as_of' });
      const [cases, state] = await Promise.all([
        listUserDisbursements(payload.organizationId),
        getReconState(payload.organizationId),
      ]);
      const reconciliation = buildServerReconciliation(cases, asOf, {
        glAdjust122100: state.glAdjust122100,
        glAdjust222100: state.glAdjust222100,
      });
      return send(res, 200, { reconciliation, state });
    }

    if (req.method === 'PUT' && path === '/api/accounting/reconciliation/adjustments') {
      const payload = requireAuth(req, res, { realm: 'staff', permissions: ['clearing:read'] });
      if (!payload) return;
      if (!canMutateDisbursements(payload)) {
        return send(res, 403, { error: 'forbidden', reason: 'insufficient_permissions' });
      }
      const body = await readBody(req);
      const gl122100 = Number(body.glAdjust122100 ?? 0);
      const gl222100 = Number(body.glAdjust222100 ?? 0);
      if (!Number.isFinite(gl122100) || !Number.isFinite(gl222100)) {
        return send(res, 400, { error: 'invalid_adjustment' });
      }
      const state = await setReconState(
        { glAdjust122100: gl122100, glAdjust222100: gl222100, note: body.note, updatedBy: payload.sub },
        payload.organizationId,
      );
      await appendServerAudit({
        actorType: 'staff',
        actorId: payload.sub,
        actorRole: payload.role,
        organizationId: payload.organizationId,
        action: 'accounting.recon.adjust',
        entityType: 'accounting_recon_state',
        entityId: payload.organizationId || 'local',
        detailEn: `Set GL adjustments 122100=${state.glAdjust122100}, 222100=${state.glAdjust222100}`,
        detailAr: `تعيين تسويات الأستاذ 122100=${state.glAdjust122100}، 222100=${state.glAdjust222100}`,
        meta: state,
      });
      return send(res, 200, { state });
    }

    if (req.method === 'POST' && path === '/api/records/document') {
      const payload = requireAuth(req, res, { realm: 'staff', permissions: ['shipments:write'] });
      if (!payload) return;
      const body = await readBody(req);
      const row = await toggleDocument(body.shipmentId, body.docId, body.available, payload.organizationId);
      if (!row) return send(res, 404, { error: 'not_found' });
      await appendServerAudit({
        actorType: 'staff',
        actorId: payload.sub,
        actorRole: payload.role,
        action: 'records.document.toggle',
        entityType: 'shipment',
        entityId: body.shipmentId,
        detailEn: `Document ${body.docId} available=${!!body.available}`,
        detailAr: `وثيقة ${body.docId} متاحة=${!!body.available}`,
      });
      return send(res, 200, { shipment: row });
    }

    if (req.method === 'GET' && path.startsWith('/api/records/shipments/') && !path.includes('...')) {
      const payload = requireAuth(req, res, { realm: 'staff', permissions: ['shipments:read'] });
      if (!payload) return;
      const id = path.slice('/api/records/shipments/'.length);
      if (!id || id.includes('/')) return send(res, 404, { error: 'not_found', path });
      const shipment = await getShipmentById(id, payload.organizationId);
      if (!shipment) return send(res, 404, { error: 'not_found' });
      return send(res, 200, { shipment });
    }


    // --- ASYCUDA / NSW channel ---
    if (req.method === 'GET' && path === '/api/asycuda/status') {
      return send(res, 200, channelInfo());
    }

    if (req.method === 'GET' && path === '/api/asycuda/drafts') {
      const payload = requireAuth(req, res, { realm: 'staff', permissions: ['shipments:read'] });
      if (!payload) return;
      const limit = Math.min(100, Number(url.searchParams.get('limit') || 30));
      return send(res, 200, { drafts: asycudaListDrafts(limit), channel: channelInfo() });
    }

    if (req.method === 'GET' && path.startsWith('/api/asycuda/drafts/')) {
      const payload = requireAuth(req, res, { realm: 'staff', permissions: ['shipments:read'] });
      if (!payload) return;
      const id = path.slice('/api/asycuda/drafts/'.length);
      const draft = asycudaGetDraft(id);
      if (!draft) return send(res, 404, { error: 'not_found' });
      return send(res, 200, { draft });
    }

    if (req.method === 'POST' && path === '/api/asycuda/drafts') {
      const payload = requireAuth(req, res, { realm: 'staff', permissions: ['shipments:write'] });
      if (!payload) return;
      const body = await readBody(req);
      if (!body.draft || typeof body.draft !== 'object') {
        return send(res, 400, { error: 'draft_required' });
      }
      const entry = await asycudaSubmitDraft({
        draft: body.draft,
        shipmentId: body.shipmentId,
        approvedBy: payload.sub,
        forceSimulate: body.forceSimulate === true,
      });
      await appendServerAudit({
        actorType: 'staff',
        actorId: payload.sub,
        actorRole: payload.role,
        action: 'asycuda.draft.submit',
        entityType: 'asycuda_draft',
        entityId: entry.id,
        detailEn: `ASYCUDA draft ${entry.status} (${entry.channel})`,
        detailAr: `مسودة أسيكودا ${entry.status} (${entry.channel})`,
        meta: { channel: entry.channel, externalRef: entry.externalRef },
      });
      return send(res, entry.status === 'rejected' ? 502 : 201, { ok: entry.status !== 'rejected', entry });
    }

    if (req.method === 'GET' && path.startsWith('/api/asycuda/declarations/') && path.endsWith('/status')) {
      const payload = requireAuth(req, res, { realm: 'staff', permissions: ['shipments:read'] });
      if (!payload) return;
      const ref = decodeURIComponent(path.slice('/api/asycuda/declarations/'.length, -'/status'.length));
      const status = await fetchDeclarationStatus(ref, payload.organizationId);
      return send(res, 200, status);
    }

    if (req.method === 'POST' && path === '/api/asycuda/sync') {
      const payload = requireAuth(req, res, { realm: 'staff', permissions: ['shipments:write'] });
      if (!payload) return;
      const body = await readBody(req);
      const ref = body.ref || body.declarationNo || body.shipmentId;
      if (!ref) return send(res, 400, { error: 'ref_required' });
      const status = await fetchDeclarationStatus(ref, payload.organizationId);
      let shipment = null;
      if (body.shipmentId && status.ok) {
        shipment = await applyStatusToShipment(body.shipmentId, status, payload.organizationId);
      }
      await appendServerAudit({
        actorType: 'staff',
        actorId: payload.sub,
        actorRole: payload.role,
        action: 'asycuda.status.sync',
        entityType: 'shipment',
        entityId: body.shipmentId || ref,
        detailEn: `Sync status for ${ref}: ${status.status || status.reason}`,
        detailAr: `مزامنة حالة ${ref}`,
      });
      return send(res, 200, { status, shipment });
    }

    // -----------------------------------------------------------------------
    // Llama Assist — POST /api/assist
    // Staff-only. Accepts { agentId, input } and returns AgentRunResult-shaped JSON.
    // Falls back gracefully with 503 when Llama is disabled / unreachable.
    // -----------------------------------------------------------------------
    if (req.method === 'POST' && path === '/api/assist') {
      const payload = requireAuth(req, res, { realm: 'staff', permissions: ['shipments:read'] });
      if (!payload) return;
      const body = await readBody(req);
      const agentId = String(body.agentId || '');
      const input = body.input && typeof body.input === 'object' ? body.input : {};

      let prompts;
      try {
        switch (agentId) {
          case 'hs':
            prompts = buildHsPrompts(input);
            break;
          case 'legal_research':
            prompts = buildLegalResearchPrompts(input);
            break;
          case 'docs':
            prompts = buildDocsPrompts(input);
            break;
          case 'next_action':
            prompts = buildNextActionPrompts(input);
            break;
          default:
            return send(res, 400, { error: 'unsupported_agent', agentId });
        }
      } catch (promptErr) {
        return send(res, 400, { error: 'prompt_build_error', detail: promptErr.message });
      }

      const llamaRequest = acquireLlamaRequest(req, payload);
      if (!llamaRequest.allowed) return rejectLlamaRequest(res, llamaRequest);

      let llamaText;
      try {
        llamaText = await ask(prompts.systemPrompt, prompts.userMessage);
      } catch (llamaErr) {
        if (llamaErr instanceof LlamaDisabledError) {
          return send(res, 503, { error: 'llama_disabled', reason: llamaErr.message });
        }
        console.error('Llama assist error:', llamaErr);
        return send(res, 502, { error: 'llama_error' });
      } finally {
        llamaRequest.release();
      }

      // Parse Llama JSON output into AgentRunResult shape
      let suggestions = [];
      try {
        const parsed = JSON.parse(llamaText.replace(/^```json\s*/i, '').replace(/```\s*$/, ''));
        suggestions = normalizeLlamaOutput(agentId, parsed);
      } catch {
        // If JSON parse fails, wrap as a single freetext suggestion
        suggestions = [{
          id: `llama-${agentId}-raw`,
          agentId,
          titleEn: 'Assistant response',
          titleAr: 'رد المساعد',
          bodyEn: llamaText,
          bodyAr: llamaText,
          confidence: 'medium',
          priority: 1,
          meta: { source: 'llama' },
        }];
      }

      const result = {
        agentId,
        ranAt: new Date().toISOString(),
        suggestions,
        disclaimerEn: 'AI-generated guidance — confirm critical decisions with Jordan Customs or the relevant authority.',
        disclaimerAr: 'توجيه بالذكاء الاصطناعي — أكّد القرارات الحاسمة مع دائرة الجمارك أو الجهة المختصة.',
        source: 'llama',
      };

      await appendServerAudit({
        actorType: 'staff',
        actorId: payload.sub,
        actorRole: payload.role,
        organizationId: payload.organizationId,
        action: `llama.assist.${agentId}`,
        entityType: 'llama_assist',
        entityId: agentId,
        detailEn: `Llama assist ran ${agentId} (${suggestions.length} suggestions)`,
        detailAr: `تشغيل مساعد ذكاء اصطناعي ${agentId} (${suggestions.length} اقتراحات)`,
        meta: { agentId, suggestionCount: suggestions.length },
      });

      return send(res, 200, result);
    }

    // -----------------------------------------------------------------------
    // Llama Assist Stream — POST /api/assist/stream
    // Streams tokens via Server-Sent Events (text/event-stream).
    // -----------------------------------------------------------------------
    if (req.method === 'POST' && path === '/api/assist/stream') {
      const payload = requireAuth(req, res, { realm: 'staff', permissions: ['shipments:read'] });
      if (!payload) return;
      const body = await readBody(req);
      const caseContext = body.caseContext && typeof body.caseContext === 'object' ? body.caseContext : {};
      const userMessage = String(body.message || '').trim();
      if (!userMessage) return send(res, 400, { error: 'message_required' });

      const systemPrompt = buildChatSystemPrompt(caseContext);
      const llamaRequest = acquireLlamaRequest(req, payload);
      if (!llamaRequest.allowed) return rejectLlamaRequest(res, llamaRequest);

      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-store',
        'X-Accel-Buffering': 'no',
        'Access-Control-Allow-Origin': PRIVATE_RUNTIME.corsOrigin,
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'same-origin',
        Connection: 'keep-alive',
      });

      const writeEvent = (type, data) => {
        res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
      };

      try {
        for await (const token of llamaStream(systemPrompt, userMessage)) {
          if (res.destroyed || res.writableEnded) break;
          writeEvent('token', { token });
        }
        if (!res.destroyed && !res.writableEnded) writeEvent('done', { done: true });
      } catch (err) {
        if (err instanceof LlamaDisabledError) {
          writeEvent('error', { error: 'llama_disabled', reason: err.message });
        } else {
          writeEvent('error', { error: 'llama_error' });
        }
      } finally {
        llamaRequest.release();
      }

      if (!res.destroyed && !res.writableEnded) res.end();

      await appendServerAudit({
        actorType: 'staff',
        actorId: payload.sub,
        actorRole: payload.role,
        organizationId: payload.organizationId,
        action: 'llama.chat.stream',
        entityType: 'llama_chat',
        entityId: 'stream',
        detailEn: `Llama chat stream: "${userMessage.slice(0, 80)}"`,
        detailAr: `محادثة الذكاء الاصطناعي: "${userMessage.slice(0, 80)}"`,
        meta: { messageLength: userMessage.length },
      }).catch(() => {});

      return;
    }

    // -----------------------------------------------------------------------
    // Invoice Parse — POST /api/draft/parse
    // Parse a pasted invoice text into structured declaration fields.
    // -----------------------------------------------------------------------
    if (req.method === 'POST' && path === '/api/draft/parse') {
      const payload = requireAuth(req, res, { realm: 'staff', permissions: ['shipments:write'] });
      if (!payload) return;
      const body = await readBody(req);
      const rawText = String(body.text || '').trim();
      if (!rawText) return send(res, 400, { error: 'text_required' });
      if (rawText.length > 8_000) return send(res, 400, { error: 'text_too_long', maxChars: 8_000 });

      const { systemPrompt, userMessage } = buildInvoiceParsePrompts(rawText);
      const llamaRequest = acquireLlamaRequest(req, payload);
      if (!llamaRequest.allowed) return rejectLlamaRequest(res, llamaRequest);

      let llamaText;
      try {
        llamaText = await ask(systemPrompt, userMessage);
      } catch (err) {
        if (err instanceof LlamaDisabledError) {
          return send(res, 503, { error: 'llama_disabled', reason: err.message });
        }
        return send(res, 502, { error: 'llama_error' });
      } finally {
        llamaRequest.release();
      }

      let parsed;
      try {
        parsed = JSON.parse(llamaText.replace(/^```json\s*/i, '').replace(/```\s*$/, ''));
      } catch {
        return send(res, 422, { error: 'parse_failed', raw: llamaText.slice(0, 500) });
      }

      await appendServerAudit({
        actorType: 'staff',
        actorId: payload.sub,
        actorRole: payload.role,
        organizationId: payload.organizationId,
        action: 'llama.draft.parse',
        entityType: 'draft_invoice',
        entityId: parsed.invoice_number || 'unknown',
        detailEn: `Invoice parse: ${parsed.goods_description_en || 'goods'}`,
        detailAr: `تحليل فاتورة: ${parsed.goods_description_ar || parsed.goods_description_en || 'بضاعة'}`,
        meta: { invoiceNumber: parsed.invoice_number, hsSuggestion: parsed.hs_code_suggestion },
      });

      return send(res, 200, { ...parsed, source: 'llama', parsedAt: new Date().toISOString() });
    }

    send(res, 404, { error: 'not_found', path });
  } catch (e) {
    if (e.message === 'invalid_json') {
      return send(res, 400, { error: 'invalid_json' });
    }
    if (e.message === 'body_too_large') {
      return send(res, 413, { error: 'body_too_large', maxBytes: PRIVATE_RUNTIME.maxBodyBytes });
    }
    console.error(e);
    send(res, 500, { error: 'server_error' });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Raya JWT API on http://${HOST}:${PORT}`);
  console.log(`Access TTL=${ACCESS_TTL}s Refresh TTL=${REFRESH_TTL}s`);
  console.log('POST /api/auth/refresh  POST /api/auth/logout');
});
