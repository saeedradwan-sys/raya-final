import { appendAudit } from '@/lib/auditLog';
import {
  ApiError,
  apiFetch,
  apiHealth,
  refreshAccessToken,
  serverLogout,
  validateAccessToken,
  type StaffLoginResponse,
} from '@/lib/api';

export type StaffRole = 'staff' | 'agent' | 'accounting' | 'viewer';

export interface StaffSession {
  token: string;
  /** JWT access token from server (preferred) */
  accessToken?: string;
  /** Opaque refresh token — rotated on each refresh */
  refreshToken?: string;
  role: StaffRole;
  displayNameEn: string;
  displayNameAr: string;
  issuedAt: string;
  expiresAt: string;
  permissions?: string[];
  /** true when session was issued/validated by the API */
  serverValidated?: boolean;
}

const STORAGE_KEY = 'raya-staff-session';
const SESSION_HOURS = 8;

/** Demo bootstrap tokens — local fallback only when API is down. */
export const DEMO_STAFF_TOKENS: Record<
  string,
  { role: StaffRole; nameEn: string; nameAr: string; permissions: string[] }
> = import.meta.env.DEV ? {
  'STAFF-DEMO-RAYA': {
    role: 'staff',
    nameEn: 'Ops broker (demo)',
    nameAr: 'مخلص عمليات (تجريبي)',
    permissions: [
      'shipments:read',
      'shipments:write',
      'clearing:read',
      'clearing:export',
      'audit:read',
    ],
  },
  'AGENT-DEMO-RAYA': {
    role: 'agent',
    nameEn: 'Field agent (demo)',
    nameAr: 'مندوب ميداني (تجريبي)',
    permissions: ['shipments:read', 'shipments:write'],
  },
  'ACCT-DEMO-RAYA': {
    role: 'accounting',
    nameEn: 'Accounting (demo)',
    nameAr: 'محاسبة (تجريبي)',
    permissions: [
      'shipments:read',
      'clearing:read',
      'clearing:export',
      'journals:post',
      'audit:read',
    ],
  },
} : {};

export type StaffLoginResult =
  | { ok: true; session: StaffSession }
  | { ok: false; error: 'required' | 'invalid' | 'network' | 'rate_limited' };

export function isStaffSessionExpired(session: StaffSession): boolean {
  return Date.now() >= new Date(session.expiresAt).getTime();
}

function saveSession(session: StaffSession) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    /* private mode */
  }
}

function localFallbackLogin(token: string): StaffLoginResult {
  const match = DEMO_STAFF_TOKENS[token];
  if (!match) return { ok: false, error: 'invalid' };
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + SESSION_HOURS * 60 * 60 * 1000);
  const session: StaffSession = {
    token,
    role: match.role,
    displayNameEn: match.nameEn,
    displayNameAr: match.nameAr,
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    permissions: match.permissions,
    serverValidated: false,
  };
  saveSession(session);
  appendAudit(
    'staff',
    'login_local',
    `Local fallback staff login as ${match.role}`,
    `دخول موظف محلي بدور ${match.role}`,
    { role: match.role, mode: 'local' },
  );
  return { ok: true, session };
}

/** Prefer server JWT issue; fall back to local demo map if API unreachable. */
export async function staffLogin(tokenRaw: string): Promise<StaffLoginResult> {
  const raw = tokenRaw.trim();
  const [emailPart, activationPart] = raw.split('|', 2);
  const hasEmailLogin = Boolean(emailPart && activationPart && emailPart.includes('@'));
  const token = hasEmailLogin ? '' : raw.toUpperCase();
  if (!raw) return { ok: false, error: 'required' };

  const online = await apiHealth();
  if (online) {
    try {
      const res = await apiFetch<StaffLoginResponse>('/auth/staff/login', {
        method: 'POST',
        body: JSON.stringify(hasEmailLogin ? { email: emailPart.trim(), activationCode: activationPart.trim() } : { token }),
      });
      const issuedAt = new Date();
      const expiresAt = new Date(issuedAt.getTime() + res.expiresIn * 1000);
      const session: StaffSession = {
        token,
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
        role: res.role as StaffRole,
        displayNameEn: res.displayNameEn,
        displayNameAr: res.displayNameAr,
        issuedAt: issuedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        permissions: res.permissions,
        serverValidated: true,
      };
      saveSession(session);
      appendAudit(
        'staff',
        'login',
        `Server JWT staff login as ${res.role}`,
        `دخول موظف بـ JWT بدور ${res.role}`,
        { role: res.role, mode: 'jwt' },
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
    ? localFallbackLogin(token)
    : { ok: false, error: 'network' };
}

export function loadStaffSession(): StaffSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as StaffSession;
    if (!session?.token || !session.expiresAt) return null;
    if (isStaffSessionExpired(session)) {
      clearStaffSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

/**
 * Re-validate JWT with the server. Clears session if server rejects.
 * Local-only sessions skip remote check.
 */
export async function revalidateStaffSession(
  session: StaffSession,
): Promise<StaffSession | null> {
  if (!session.serverValidated) {
    if (import.meta.env.PROD) {
      clearStaffSession();
      return null;
    }
    return isStaffSessionExpired(session) ? null : session;
  }
  if (session.accessToken) {
    const me = await validateAccessToken(session.accessToken);
    if (me && me.realm === 'staff') {
      return {
        ...session,
        role: (me.role as StaffRole) || session.role,
        permissions: me.permissions,
        serverValidated: true,
      };
    }
  }
  // Access expired/invalid → try refresh rotation
  if (session.refreshToken) {
    const pair = await refreshAccessToken(session.refreshToken);
    if (pair && pair.realm === 'staff') {
      const issuedAt = new Date();
      const expiresAt = new Date(issuedAt.getTime() + pair.expiresIn * 1000);
      const next: StaffSession = {
        ...session,
        accessToken: pair.accessToken,
        refreshToken: pair.refreshToken,
        role: (pair.role as StaffRole) || session.role,
        displayNameEn: pair.displayNameEn || session.displayNameEn,
        displayNameAr: pair.displayNameAr || session.displayNameAr,
        permissions: pair.permissions || session.permissions,
        issuedAt: issuedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        serverValidated: true,
      };
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* */
      }
      appendAudit(
        'staff',
        'token_refresh',
        'Staff access token refreshed',
        'تجديد رمز وصول الموظف',
      );
      return next;
    }
  }
  clearStaffSession();
  return null;
}

export function clearStaffSession(): void {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw) as StaffSession;
      if (s.serverValidated) {
        void serverLogout({ accessToken: s.accessToken, refreshToken: s.refreshToken });
      }
    }
  } catch {
    /* */
  }
  appendAudit('staff', 'logout', 'Staff session cleared', 'إنهاء جلسة الموظف');
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* */
  }
}

export function staffSessionRemainingMs(session: StaffSession): number {
  return Math.max(0, new Date(session.expiresAt).getTime() - Date.now());
}

export function staffHasPermission(session: StaffSession | null, perm: string): boolean {
  if (!session) return false;
  if (session.permissions?.includes(perm)) return true;
  // Legacy sessions without permissions array: role heuristic
  if (!session.permissions) {
    if (perm.startsWith('clearing') && session.role === 'agent') return false;
    if (session.role === 'staff' || session.role === 'accounting') return true;
  }
  return false;
}
