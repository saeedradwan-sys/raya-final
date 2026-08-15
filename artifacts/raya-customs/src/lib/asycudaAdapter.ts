/**
 * ASYCUDA / NSW integration client.
 * Calls Raya `/api/asycuda/*` — simulation by default; live when server env is set.
 */
import { apiFetch, apiHealth } from '@/lib/api';
import type { DeclarationDraft } from '@/lib/declarationDraft';

export interface AsycudaChannelInfo {
  mode: 'simulation' | 'live';
  live: boolean;
  baseUrlConfigured: boolean;
  hasApiKey: boolean;
  message: string;
}

export interface AsycudaQueueEntry {
  id: string;
  createdAt: string;
  shipmentId: string | null;
  type: string;
  status: string;
  approvedBy: string;
  draft: unknown;
  channel: string;
  externalRef: string | null;
  response: unknown;
  error: string | null;
}

export interface AsycudaStatusResult {
  ok: boolean;
  live: boolean;
  ref: string;
  status?: string;
  selectivityLane?: string | null;
  pcaOpen?: boolean;
  lastFreeDay?: string;
  statusEn?: string;
  statusAr?: string;
  shipmentId?: string;
  reason: string;
  body?: unknown;
}

function staffToken(): string | null {
  try {
    const raw = sessionStorage.getItem('raya-staff-session');
    if (!raw) return null;
    const s = JSON.parse(raw) as { accessToken?: string; serverValidated?: boolean };
    if (s.serverValidated && s.accessToken) return s.accessToken;
  } catch {
    /* */
  }
  return null;
}

export async function getAsycudaChannelStatus(): Promise<AsycudaChannelInfo | null> {
  try {
    if (!(await apiHealth())) return null;
    return await apiFetch<AsycudaChannelInfo>('/asycuda/status');
  } catch {
    return null;
  }
}

export async function submitAsycudaDraft(opts: {
  draft: DeclarationDraft;
  shipmentId?: string;
  forceSimulate?: boolean;
}): Promise<{ ok: boolean; entry: AsycudaQueueEntry } | { error: string }> {
  const token = staffToken();
  if (!token) return { error: 'staff_jwt_required' };
  try {
    return await apiFetch('/asycuda/drafts', {
      method: 'POST',
      token,
      body: JSON.stringify({
        draft: opts.draft,
        shipmentId: opts.shipmentId,
        forceSimulate: opts.forceSimulate,
      }),
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'submit_failed' };
  }
}

export async function listAsycudaDrafts(limit = 30): Promise<{
  drafts: AsycudaQueueEntry[];
  channel: AsycudaChannelInfo;
} | null> {
  const token = staffToken();
  if (!token) return null;
  try {
    return await apiFetch(`/asycuda/drafts?limit=${limit}`, { token });
  } catch {
    return null;
  }
}

export async function fetchAsycudaDeclarationStatus(ref: string): Promise<AsycudaStatusResult | null> {
  const token = staffToken();
  if (!token) return null;
  try {
    return await apiFetch(`/asycuda/declarations/${encodeURIComponent(ref)}/status`, { token });
  } catch {
    return null;
  }
}

export async function postAsycudaSync(
  ref: string,
  shipmentId?: string,
): Promise<{ status: AsycudaStatusResult; shipment: unknown } | null> {
  const token = staffToken();
  if (!token) return null;
  try {
    return await apiFetch('/asycuda/sync', {
      method: 'POST',
      token,
      body: JSON.stringify({ ref, shipmentId }),
    });
  } catch {
    return null;
  }
}

export function listIntegrationRoadmap(): {
  phase: number;
  titleEn: string;
  titleAr: string;
  status: 'done' | 'next' | 'blocked';
}[] {
  return [
    {
      phase: 0,
      titleEn: 'Manual mirror + guides + audit',
      titleAr: 'مرآة يدوية + أدلة + تدقيق',
      status: 'done',
    },
    {
      phase: 1,
      titleEn: 'Declaration draft JSON/XML export',
      titleAr: 'تصدير مسودة البيان JSON/XML',
      status: 'done',
    },
    {
      phase: 2,
      titleEn: 'Channel API (simulate + live-ready)',
      titleAr: 'واجهة القناة (محاكاة + جاهزة للحي)',
      status: 'done',
    },
    {
      phase: 3,
      titleEn: 'Formal Customs credentials + live URL',
      titleAr: 'اعتمادات الجمارك + رابط حي',
      status: 'blocked',
    },
    {
      phase: 4,
      titleEn: 'ASYHUB / carrier pre-arrival (requested — refused by Customs)',
      titleAr: 'ASYHUB / بيانات ما قبل الوصول (تم الطلب — مرفوض من الجمارك)',
      status: 'blocked',
    },
  ];
}
