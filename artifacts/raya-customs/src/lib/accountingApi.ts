/**
 * Server accounting API client.
 * The server is the source of truth for accounting figures; callers fall
 * back to the local calculation copies only when the API or staff session
 * is unavailable (dev without login).
 */
import { apiDownload, apiFetch, apiHealth } from '@/lib/api';
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

export interface FinanceControls {
  postedJournalCount: number;
  unbalancedJournalCount: number;
  openInvoiceCount: number;
  overdueInvoiceCount: number;
  overdueAmount: number;
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
  financeControls?: FinanceControls;
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

// --- Invoices ---

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'void';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  disbursementId: string;
  status: InvoiceStatus;
  currency: string;
  passThrough: number;
  agencyFee: number;
  gstRate: number;
  gstAmount: number;
  total: number;
  issuedAt: string | null;
  dueAt: string | null;
  paidAmount: number;
  balanceDue: number;
  payments: InvoicePayment[];
  payload: {
    declarationNo?: string;
    clientNameEn?: string;
    clientNameAr?: string;
    mode?: string;
    lines?: StatementLine[];
  };
  createdAt: string;
}

export interface InvoicePayment {
  id: string;
  invoiceId: string;
  amount: number;
  currency: string;
  receivedAt: string;
  reference: string | null;
  note: string | null;
  createdBy: string | null;
  createdAt: string;
}

export async function fetchInvoices(caseId?: string): Promise<Invoice[] | null> {
  const token = staffToken();
  if (!token) return null;
  try {
    const query = caseId ? `?caseId=${encodeURIComponent(caseId)}` : '';
    const res = await apiFetch<{ invoices: Invoice[] }>(`/accounting/invoices${query}`, { token });
    return res.invoices;
  } catch {
    return null;
  }
}

/** Issue (or return the existing open) invoice for a saved disbursement case. */
export async function issueInvoiceForCase(
  disbursementId: string,
  gstRate?: number,
): Promise<{ invoice: Invoice; existed: boolean } | null> {
  const token = staffToken();
  if (!token) return null;
  try {
    return await apiFetch('/accounting/invoices', {
      method: 'POST',
      token,
      body: JSON.stringify({ disbursementId, gstRate }),
    });
  } catch {
    return null;
  }
}

export async function updateInvoiceStatus(
  id: string,
  status: InvoiceStatus,
): Promise<Invoice | null> {
  const token = staffToken();
  if (!token) return null;
  try {
    const res = await apiFetch<{ invoice: Invoice }>(
      `/accounting/invoices/${encodeURIComponent(id)}`,
      { method: 'PATCH', token, body: JSON.stringify({ status }) },
    );
    return res.invoice;
  } catch {
    return null;
  }
}

export async function recordInvoicePayment(params: {
  invoiceId: string;
  amount: number;
  receivedAt: string;
  reference?: string;
  note?: string;
  idempotencyKey: string;
}): Promise<{ invoice: Invoice; payment: InvoicePayment; existed: boolean } | null> {
  const token = staffToken();
  if (!token) return null;
  try {
    return await apiFetch(`/accounting/invoices/${encodeURIComponent(params.invoiceId)}/payments`, {
      method: 'POST',
      token,
      body: JSON.stringify(params),
    });
  } catch {
    return null;
  }
}

export async function downloadInvoiceReceipt(
  invoiceId: string,
  paymentId?: string,
): Promise<{ blob: Blob; filename: string | null } | null> {
  const token = staffToken();
  if (!token) return null;
  try {
    const suffix = paymentId
      ? `/payments/${encodeURIComponent(paymentId)}/receipt.pdf`
      : '/receipt.pdf';
    return await apiDownload(`/accounting/invoices/${encodeURIComponent(invoiceId)}${suffix}`, { token });
  } catch {
    return null;
  }
}

// --- GST report ---

export interface GstReportRow {
  disbursementId: string;
  stage: string;
  postedAt: string;
  passThrough: number;
  feeRevenue: number;
  gstOnFee: number;
}

export interface GstReport {
  from: string;
  to: string;
  rate: number;
  entryCount: number;
  feeRevenue: number;
  passThrough: number;
  gstCollectible: number;
  grossTaxable: number;
  rows: GstReportRow[];
}

export async function fetchGstReport(
  from: string,
  to: string,
  rate?: number,
): Promise<GstReport | null> {
  const token = staffToken();
  if (!token) return null;
  try {
    const rateQ = rate != null ? `&rate=${encodeURIComponent(rate)}` : '';
    const res = await apiFetch<{ report: GstReport }>(
      `/accounting/gst?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}${rateQ}`,
      { token },
    );
    return res.report;
  } catch {
    return null;
  }
}

// --- Reconciliation resolutions ---

export interface ReconResolution {
  resolved: boolean;
  note: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
}

export async function fetchReconciliationFull(asOf: string): Promise<{
  reconciliation: ClearingReconciliation;
  state: ReconState;
  resolutions: Record<string, ReconResolution>;
} | null> {
  const token = staffToken();
  if (!token) return null;
  try {
    return await apiFetch(`/accounting/reconciliation?asOf=${encodeURIComponent(asOf)}`, { token });
  } catch {
    return null;
  }
}

export async function resolveReconItem(
  caseId: string,
  resolved: boolean,
  note?: string,
): Promise<ReconResolution | null> {
  const token = staffToken();
  if (!token) return null;
  try {
    const res = await apiFetch<{ state: ReconResolution }>('/accounting/reconciliation/resolve', {
      method: 'PUT',
      token,
      body: JSON.stringify({ caseId, resolved, note }),
    });
    return res.state;
  } catch {
    return null;
  }
}
