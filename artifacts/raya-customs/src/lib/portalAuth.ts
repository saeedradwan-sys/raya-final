import { appendAudit } from '@/lib/auditLog';
import type { PortalSession, PortalShipment } from '@/lib/types';
import { allShipments } from '@/lib/recordStore';
import {
  ApiError,
  apiFetch,
  apiHealth,
  refreshAccessToken,
  serverLogout,
  validateAccessToken,
  type PortalLoginResponse,
} from '@/lib/api';

const STORAGE_KEY = 'raya-portal-session';
const SESSION_HOURS = 8;

export type PortalLoginResult =
  | { ok: true; session: PortalSession }
  | { ok: false; error: 'required' | 'invalid' | 'expired' | 'network' | 'rate_limited' };

function normalizeTax(tax: string): string {
  return tax.replace(/\s+/g, '').trim();
}

function normalizeCode(code: string): string {
  return code.trim();
}

function normalizeDemoCode(code: string): string {
  return normalizeCode(code).toUpperCase();
}

/** Legacy local demo token (fallback when API is down). */
function createLocalToken(taxNumber: string, shipmentIds: string[], expiresAt: string): string {
  const payload = { tax: taxNumber, sid: shipmentIds, exp: expiresAt, v: 1 };
  const json = JSON.stringify(payload);
  return btoa(unescape(encodeURIComponent(json)));
}

function parseLocalToken(token: string): { tax: string; sid: string[]; exp: string } | null {
  try {
    const json = decodeURIComponent(escape(atob(token)));
    const data = JSON.parse(json) as { tax?: string; sid?: string[]; exp?: string };
    if (!data.tax || !Array.isArray(data.sid) || !data.exp) return null;
    return { tax: data.tax, sid: data.sid, exp: data.exp };
  } catch {
    return null;
  }
}

export function isSessionExpired(session: PortalSession): boolean {
  return Date.now() >= new Date(session.expiresAt).getTime();
}

function localPortalLogin(taxNumber: string, accessCode: string): PortalLoginResult {
  const match = allShipments().find(
    (s) =>
      s.taxNumber === taxNumber &&
      normalizeDemoCode(s.accessCode) === normalizeDemoCode(accessCode),
  );
  if (!match) return { ok: false, error: 'invalid' };

  const customerShipments = allShipments().filter((s) => s.taxNumber === taxNumber);
  const shipmentIds = customerShipments.map((s) => s.id);
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + SESSION_HOURS * 60 * 60 * 1000);

  const session: PortalSession = {
    token: createLocalToken(taxNumber, shipmentIds, expiresAt.toISOString()),
    taxNumber,
    customerNameEn: match.customerNameEn,
    customerNameAr: match.customerNameAr,
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    shipmentIds,
    serverValidated: false,
  };
  saveSession(session);
  appendAudit(
    'portal',
    'login_local',
    `Local portal login tax ${taxNumber}`,
    `دخول بوابة محلي ${taxNumber}`,
    { taxNumber, mode: 'local' },
  );
  return { ok: true, session };
}

/**
 * Authenticate with tax number + access code.
 * Prefers server-issued JWT; falls back to local demo when API is offline.
 */
export async function portalLogin(
  taxNumberRaw: string,
  accessCodeRaw: string,
): Promise<PortalLoginResult> {
  const taxNumber = normalizeTax(taxNumberRaw);
  const accessCode = normalizeCode(accessCodeRaw);

  if (!taxNumber || !accessCode) {
    return { ok: false, error: 'required' };
  }

  const online = await apiHealth();
  if (online) {
    try {
      const res = await apiFetch<PortalLoginResponse>('/auth/portal/login', {
        method: 'POST',
        body: JSON.stringify({ taxNumber, accessCode }),
      });
      const issuedAt = new Date();
      const expiresAt = new Date(issuedAt.getTime() + res.expiresIn * 1000);
      const session: PortalSession = {
        token: res.accessToken,
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
        taxNumber: res.taxNumber,
        customerNameEn: res.customerNameEn,
        customerNameAr: res.customerNameAr,
        issuedAt: issuedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        shipmentIds: res.shipmentIds,
        serverValidated: true,
      };
      saveSession(session);
      appendAudit(
        'portal',
        'login',
        `Server JWT portal login tax ${res.taxNumber}`,
        `دخول بوابة بـ JWT ${res.taxNumber}`,
        { taxNumber: res.taxNumber, mode: 'jwt' },
      );
      return { ok: true, session };
    } catch (error) {
      if (error instanceof ApiError && error.status === 429) {
        return { ok: false, error: 'rate_limited' };
      }
      return { ok: false, error: 'invalid' };
    }
  }

  return import.meta.env.DEV
    ? localPortalLogin(taxNumber, accessCode)
    : { ok: false, error: 'network' };
}

export function saveSession(session: PortalSession): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    /* */
  }
}

export function loadSession(): PortalSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as PortalSession;
    if (!session?.token || !session.taxNumber || !session.expiresAt) return null;
    if (isSessionExpired(session)) {
      clearSession();
      return null;
    }
    // Local token integrity check only
    if (!session.serverValidated && !session.accessToken) {
      const parsed = parseLocalToken(session.token);
      if (!parsed || parsed.tax !== session.taxNumber) {
        clearSession();
        return null;
      }
    }
    return session;
  } catch {
    return null;
  }
}

/** Server-side JWT revalidation */
export async function revalidatePortalSession(
  session: PortalSession,
): Promise<PortalSession | null> {
  if (!session.serverValidated) {
    if (import.meta.env.PROD) {
      clearSession();
      return null;
    }
    return isSessionExpired(session) ? null : session;
  }
  if (session.accessToken) {
    const me = await validateAccessToken(session.accessToken);
    if (me && me.realm === 'portal') {
      return {
        ...session,
        taxNumber: me.taxNumber || session.taxNumber,
        shipmentIds: me.shipmentIds || session.shipmentIds,
        serverValidated: true,
      };
    }
  }
  if (session.refreshToken) {
    const pair = await refreshAccessToken(session.refreshToken);
    if (pair && pair.realm === 'portal') {
      const issuedAt = new Date();
      const expiresAt = new Date(issuedAt.getTime() + pair.expiresIn * 1000);
      const next: PortalSession = {
        ...session,
        token: pair.accessToken,
        accessToken: pair.accessToken,
        refreshToken: pair.refreshToken,
        taxNumber: pair.taxNumber || session.taxNumber,
        shipmentIds: pair.shipmentIds || session.shipmentIds,
        customerNameEn: pair.customerNameEn || session.customerNameEn,
        customerNameAr: pair.customerNameAr || session.customerNameAr,
        issuedAt: issuedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        serverValidated: true,
      };
      saveSession(next);
      appendAudit(
        'portal',
        'token_refresh',
        'Portal access token refreshed',
        'تجديد رمز وصول البوابة',
      );
      return next;
    }
  }
  clearSession();
  return null;
}

export function clearSession(): void {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw) as PortalSession;
      if (s.serverValidated) {
        void serverLogout({ accessToken: s.accessToken, refreshToken: s.refreshToken });
      }
    }
  } catch {
    /* */
  }
  appendAudit('portal', 'logout', 'Portal session cleared', 'إنهاء جلسة البوابة');
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* */
  }
}

export async function fetchPortalShipments(session: PortalSession): Promise<PortalShipment[]> {
  if (session.serverValidated && session.accessToken) {
    try {
      const response = await apiFetch<{ shipments: PortalShipment[] }>('/portal/shipments', {
        token: session.accessToken,
      });
      return Array.isArray(response.shipments) ? response.shipments : [];
    } catch {
      return [];
    }
  }
  return getShipmentsForSession(session);
}

export function getShipmentsForSession(session: PortalSession): PortalShipment[] {
  const idSet = new Set(session.shipmentIds);
  // Include seed ids from session plus any user-added previous records for same tax
  return allShipments().filter(
    (s) =>
      s.taxNumber === session.taxNumber &&
      (idSet.has(s.id) || s.id.startsWith('shp-user-')),
  );
}

export function getShipmentById(
  session: PortalSession,
  shipmentId: string,
): PortalShipment | null {
  const list = getShipmentsForSession(session);
  return list.find((s) => s.id === shipmentId) ?? null;
}

export function sessionRemainingMs(session: PortalSession): number {
  return Math.max(0, new Date(session.expiresAt).getTime() - Date.now());
}

export const DEMO_CREDENTIALS = import.meta.env.DEV ? [
  {
    tax: '100123456',
    code: 'RAYA-DEMO-01',
    labelEn: 'Safari Est. — red lane / inspection',
    labelAr: 'مؤسسة سفاري — مسرب أحمر / معاينة',
  },
  {
    tax: '100123456',
    code: 'RAYA-DEMO-02',
    labelEn: 'Safari Est. — pre-arrival (no lane yet)',
    labelAr: 'مؤسسة سفاري — قبل الوصول (لا مسرب بعد)',
  },
  {
    tax: '200987654',
    code: 'RAYA-DEMO-03',
    labelEn: 'Al-Nour — delivered + blue PCA open',
    labelAr: 'النور — مُسلَّم + تدقيق أزرق مفتوح',
  },
  {
    tax: '200987654',
    code: 'RAYA-DEMO-04',
    labelEn: 'Al-Nour — yellow documentary check',
    labelAr: 'النور — مسرب أصفر فحص وثائقي',
  },
  {
    tax: '100123456',
    code: 'RAYA-DEMO-05',
    labelEn: 'Safari Est. — green lane released',
    labelAr: 'سفاري — مسرب أخضر مُفرَج',
  },
] as const : [] as const;
