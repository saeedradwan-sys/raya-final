/**
 * Server accounting API client.
 * The server is the source of truth for accounting figures; callers fall
 * back to the local calculation copies only when the API or staff session
 * is unavailable (dev without login).
 */
import { apiFetch, apiHealth } from '@/lib/api';
import type { ClearingReconciliation, JournalLine } from '@/lib/types';
import type { RecoveryItem } from '@/lib/recoveryQueue';

export interface AccountingMetrics {
  openReceivable: number;
  openPrepayLiability: number;
  recognizedRevenue: number;
  passThroughVolume: number;
  caseCount: number;
  openCount: number;
}

export interface ServerJournal {
  lines: JournalLine[];
  passThrough: number;
  revenue: number;
  prepay: number;
  trueUp: number;
  balanced: boolean;
}

export interface StatementLine {
  labelEn: string;
  labelAr: string;
  amount: number;
  kind: 'passthrough' | 'fee' | 'total';
}

export interface ReconState {
  glAdjust122100: number;
  glAdjust222100: number;
  note: string | null;
  updatedBy: string | null;
  updatedAt: string | null;
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

/** True when server accounting is usable (validated staff session + healthy API). */
export async function accountingApiAvailable(): Promise<boolean> {
  if (!staffToken()) return false;
  return apiHealth();
}

export async function fetchAccountingSummary(): Promise<{
  metrics: AccountingMetrics;
  recoveryQueue: RecoveryItem[];
} | null> {
  const token = staffToken();
  if (!token) return null;
  try {
    return await apiFetch('/accounting/summary', { token });
  } catch {
    return null;
  }
}

export async function fetchJournalPreview(params: {
  mode: string;
  duties: number;
  portFees: number;
  otherGov: number;
  agencyFee: number;
  stage?: string;
  prepayAmount?: number;
}): Promise<ServerJournal | null> {
  const token = staffToken();
  if (!token) return null;
  try {
    const res = await apiFetch<{ journal: ServerJournal }>('/accounting/journal/preview', {
      method: 'POST',
      token,
      body: JSON.stringify(params),
    });
    return res.journal;
  } catch {
    return null;
  }
}

export async function fetchStatement(caseId: string): Promise<StatementLine[] | null> {
  const token = staffToken();
  if (!token) return null;
  try {
    const res = await apiFetch<{ lines: StatementLine[] }>(
      `/accounting/statement/${encodeURIComponent(caseId)}`,
      { token },
    );
    return res.lines;
  } catch {
    return null;
  }
}

export interface JournalEntry {
  id: string;
  disbursementId: string;
  stage: string;
  mode: string;
  passThrough: number;
  revenue: number;
  prepay: number;
  trueUp: number;
  balanced: boolean;
  lines: JournalLine[];
  postedBy: string | null;
  createdAt: string;
}

/** Post (persist) a server-computed journal for a saved disbursement case. */
export async function postJournalEntry(
  disbursementId: string,
  stage: 'payout' | 'settle' | 'full' = 'full',
): Promise<JournalEntry | null> {
  const token = staffToken();
  if (!token) return null;
  try {
    const res = await apiFetch<{ entry: JournalEntry }>('/accounting/journal', {
      method: 'POST',
      token,
      body: JSON.stringify({ disbursementId, stage }),
    });
    return res.entry;
  } catch {
    return null;
  }
}

export async function fetchJournalEntries(caseId?: string): Promise<JournalEntry[] | null> {
  const token = staffToken();
  if (!token) return null;
  try {
    const query = caseId ? `?caseId=${encodeURIComponent(caseId)}` : '';
    const res = await apiFetch<{ entries: JournalEntry[] }>(`/accounting/journal${query}`, {
      token,
    });
    return res.entries;
  } catch {
    return null;
  }
}

/** Persist organization-level GL adjustments used by the reconciliation. */
export async function saveReconAdjustments(params: {
  glAdjust122100: number;
  glAdjust222100: number;
  note?: string;
}): Promise<ReconState | null> {
  const token = staffToken();
  if (!token) return null;
  try {
    const res = await apiFetch<{ state: ReconState }>('/accounting/reconciliation/adjustments', {
      method: 'PUT',
      token,
      body: JSON.stringify(params),
    });
    return res.state;
  } catch {
    return null;
  }
}

export async function fetchReconciliation(asOf: string): Promise<{
  reconciliation: ClearingReconciliation;
  state: ReconState;
} | null> {
  const token = staffToken();
  if (!token) return null;
  try {
    return await apiFetch(`/accounting/reconciliation?asOf=${encodeURIComponent(asOf)}`, { token });
  } catch {
    return null;
  }
}
