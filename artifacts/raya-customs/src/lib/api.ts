/**
 * API base for JWT auth server.
 * Vite proxy: /api → http://127.0.0.1:8787
 */
const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) || '/api';

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown) {
    super(
      typeof body === 'object' && body && 'error' in body
        ? String((body as { error: string }).error)
        : `HTTP ${status}`,
    );
    this.status = status;
    this.body = body;
  }
}

export async function apiFetch<T>(
  path: string,
  opts: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const { token, headers, ...rest } = opts;
  const h = new Headers(headers);
  if (token) h.set('Authorization', `Bearer ${token}`);
  if (rest.body && !h.has('Content-Type')) {
    h.set('Content-Type', 'application/json');
  }
  const res = await fetch(`${API_BASE}${path.replace(/^\/api/, '')}`, {
    ...rest,
    headers: h,
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}

export async function apiHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`, { method: 'GET' });
    if (!res.ok) return false;
    const body: unknown = await res.json();
    return (
      typeof body === 'object' &&
      body !== null &&
      'ok' in body &&
      (body as { ok?: unknown }).ok === true &&
      'service' in body &&
      (body as { service?: unknown }).service === 'raya-api'
    );
  } catch {
    return false;
  }
}

export interface TokenPairFields {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

export interface StaffLoginResponse extends TokenPairFields {
  realm: 'staff';
  role: string;
  displayNameEn: string;
  displayNameAr: string;
  permissions: string[];
}

export interface PortalLoginResponse extends TokenPairFields {
  realm: 'portal';
  taxNumber: string;
  shipmentIds: string[];
  customerNameEn: string;
  customerNameAr: string;
}

export interface RefreshResponse extends TokenPairFields {
  realm: 'staff' | 'portal';
  role?: string | null;
  taxNumber?: string | null;
  permissions?: string[];
  shipmentIds?: string[] | null;
  displayNameEn?: string;
  displayNameAr?: string;
  customerNameEn?: string;
  customerNameAr?: string;
}

export interface AuthMeResponse {
  sub: string;
  realm: 'staff' | 'portal';
  role: string | null;
  taxNumber: string | null;
  permissions: string[];
  nameEn?: string;
  nameAr?: string;
  shipmentIds: string[] | null;
  exp: number;
  iat: number;
  typ?: string;
}

export async function validateAccessToken(
  accessToken: string,
): Promise<AuthMeResponse | null> {
  try {
    return await apiFetch<AuthMeResponse>('/auth/me', { token: accessToken });
  } catch {
    return null;
  }
}

/** Exchange refresh token for a new access + refresh pair (rotation). */
export async function refreshAccessToken(
  refreshToken: string,
): Promise<RefreshResponse | null> {
  try {
    return await apiFetch<RefreshResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    return null;
  }
}

export async function serverLogout(opts: {
  accessToken?: string;
  refreshToken?: string;
}): Promise<void> {
  try {
    await apiFetch('/auth/logout', {
      method: 'POST',
      token: opts.accessToken,
      body: JSON.stringify({ refreshToken: opts.refreshToken }),
    });
  } catch {
    /* best-effort */
  }
}

// ---------------------------------------------------------------------------
// Llama Assist API helpers
// ---------------------------------------------------------------------------

export interface AgentRunResultFromServer {
  agentId: string;
  ranAt: string;
  suggestions: Array<{
    id: string;
    agentId: string;
    titleEn: string;
    titleAr: string;
    bodyEn: string;
    bodyAr: string;
    confidence: 'high' | 'medium' | 'low';
    priority: number;
    links?: { href: string; labelEn: string; labelAr: string }[];
    meta?: Record<string, string>;
  }>;
  disclaimerEn: string;
  disclaimerAr: string;
  source: 'llama';
}

/**
 * Call /api/assist to run a Llama-backed agent server-side.
 * Returns null if Llama is disabled (503) so callers can fall back.
 */
export async function llamaAssist(
  agentId: string,
  input: Record<string, unknown>,
  accessToken: string,
): Promise<AgentRunResultFromServer | null> {
  try {
    return await apiFetch<AgentRunResultFromServer>('/assist', {
      method: 'POST',
      token: accessToken,
      body: JSON.stringify({ agentId, input }),
    });
  } catch (err) {
    if (err instanceof ApiError && (err.status === 503 || err.status === 502)) {
      return null; // Llama disabled or unreachable — caller should fall back
    }
    throw err;
  }
}

export interface InvoiceParseResult {
  goods_description_en: string | null;
  goods_description_ar: string | null;
  hs_code_suggestion: string | null;
  hs_confidence_pct: number | null;
  country_of_origin: string | null;
  quantity: number | null;
  unit: string | null;
  cif_value: number | null;
  currency: string | null;
  incoterm: string | null;
  supplier_name: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  requires_permit: boolean;
  permit_authority: string | null;
  notes_en: string | null;
  needs_broker_review: boolean;
  source: 'llama';
  parsedAt: string;
}

/**
 * Call /api/draft/parse to extract declaration fields from invoice text.
 * Returns null if Llama is disabled.
 */
export async function llamaParseInvoice(
  text: string,
  accessToken: string,
): Promise<InvoiceParseResult | null> {
  try {
    return await apiFetch<InvoiceParseResult>('/draft/parse', {
      method: 'POST',
      token: accessToken,
      body: JSON.stringify({ text }),
    });
  } catch (err) {
    if (err instanceof ApiError && (err.status === 503 || err.status === 502)) {
      return null;
    }
    throw err;
  }
}
