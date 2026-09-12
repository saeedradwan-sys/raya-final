import type { ClearingReconciliation, DisbursementCase } from '@/lib/types';
import { clientStatementLines, passThroughTotal, round2 } from '@/lib/disbursementCalc';

function esc(s: string): string {
  // Guard against spreadsheet formula injection: prefix cells that start
  // with a formula trigger so Excel/Sheets treat them as text.
  let v = s;
  if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`;
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export function downloadTextFile(filename: string, content: string, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob(['\ufeff' + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Month-end style clearing recon export */
export function clearingReconToCsv(recon: ClearingReconciliation): string {
  const lines: string[] = [];
  lines.push('section,key,value');
  lines.push(`summary,as_of,${recon.asOf}`);
  lines.push(`summary,subledger_122100,${recon.subledger122100}`);
  lines.push(`summary,gl_122100,${recon.gl122100}`);
  lines.push(`summary,diff_122100,${recon.diff122100}`);
  lines.push(`summary,subledger_222100,${recon.subledger222100}`);
  lines.push(`summary,gl_222100,${recon.gl222100}`);
  lines.push(`summary,diff_222100,${recon.diff222100}`);
  lines.push(`summary,tied_out,${recon.tiedOut}`);
  lines.push('');
  lines.push('declaration,client_en,account,open_balance,aging_days,bucket,status,exception_en');
  for (const l of recon.lines) {
    lines.push(
      [
        esc(l.declarationNo),
        esc(l.clientNameEn),
        l.account,
        l.openBalance,
        l.agingDays,
        l.agingBucket,
        l.status,
        esc(l.exceptionEn || ''),
      ].join(','),
    );
  }
  lines.push('');
  lines.push('aging_bucket,count,amount_122100,amount_222100');
  for (const b of ['0-7', '8-15', '16-30', '30+'] as const) {
    const row = recon.aging[b];
    lines.push(`${b},${row.count},${row.amount122100},${row.amount222100}`);
  }
  return lines.join('\n');
}

export function clientStatementToCsv(c: DisbursementCase): string {
  const rows = clientStatementLines(c);
  const header = 'label_en,label_ar,amount,kind';
  const body = rows.map((r) => [esc(r.labelEn), esc(r.labelAr), r.amount, r.kind].join(','));
  return [
    `declaration,${esc(c.declarationNo)}`,
    `client,${esc(c.clientNameEn)}`,
    `mode,${c.mode}`,
    `pass_through,${passThroughTotal(c.duties, c.portFees, c.otherGovCharges)}`,
    `agency_fee,${round2(c.agencyFee)}`,
    '',
    header,
    ...body,
  ].join('\n');
}

/** Invoice export (single invoice with statement lines). */
export function invoiceToCsv(inv: {
  invoiceNumber: string;
  status: string;
  currency: string;
  passThrough: number;
  agencyFee: number;
  gstRate: number;
  gstAmount: number;
  total: number;
  paidAmount?: number;
  balanceDue?: number;
  payments?: { receivedAt: string; amount: number; currency: string; reference?: string | null; note?: string | null }[];
  issuedAt: string | null;
  dueAt: string | null;
  payload: { declarationNo?: string; clientNameEn?: string; lines?: { labelEn: string; labelAr: string; amount: number; kind: string }[] };
}): string {
  const head = [
    `invoice_number,${esc(inv.invoiceNumber)}`,
    `status,${inv.status}`,
    `declaration,${esc(inv.payload.declarationNo || '')}`,
    `client,${esc(inv.payload.clientNameEn || '')}`,
    `issued_at,${inv.issuedAt || ''}`,
    `due_at,${inv.dueAt || ''}`,
    `currency,${inv.currency}`,
    `pass_through,${inv.passThrough}`,
    `agency_fee,${inv.agencyFee}`,
    `gst_rate,${inv.gstRate}`,
    `gst_amount,${inv.gstAmount}`,
    `total,${inv.total}`,
    `paid_amount,${inv.paidAmount ?? 0}`,
    `balance_due,${inv.balanceDue ?? inv.total}`,
    `payment_count,${inv.payments?.length ?? 0}`,
    '',
    'label_en,label_ar,amount,kind',
  ];
  const body = (inv.payload.lines || []).map((r) =>
    [esc(r.labelEn), esc(r.labelAr), r.amount, r.kind].join(','),
  );
  const payments = inv.payments?.length
    ? ['', 'received_at,amount,currency,reference,note', ...inv.payments.map((payment) => [payment.receivedAt, payment.amount, payment.currency, esc(payment.reference || ''), esc(payment.note || '')].join(','))]
    : [];
  return [...head, ...body, ...payments].join('\n');
}

/** Period GST/tax report export. */
export function gstReportToCsv(report: {
  from: string;
  to: string;
  rate: number;
  entryCount: number;
  feeRevenue: number;
  passThrough: number;
  gstCollectible: number;
  grossTaxable: number;
  rows: { disbursementId: string; stage: string; postedAt: string; passThrough: number; feeRevenue: number; gstOnFee: number }[];
}): string {
  const lines: string[] = [];
  lines.push('section,key,value');
  lines.push(`summary,period_from,${report.from}`);
  lines.push(`summary,period_to,${report.to}`);
  lines.push(`summary,gst_rate,${report.rate}`);
  lines.push(`summary,journal_entries,${report.entryCount}`);
  lines.push(`summary,fee_revenue_taxable,${report.feeRevenue}`);
  lines.push(`summary,gst_collectible,${report.gstCollectible}`);
  lines.push(`summary,pass_through_non_taxable,${report.passThrough}`);
  lines.push(`summary,gross_taxable_incl_gst,${report.grossTaxable}`);
  lines.push('');
  lines.push('file,stage,posted_at,pass_through,fee_revenue,gst_on_fee');
  for (const r of report.rows) {
    lines.push([esc(r.disbursementId), r.stage, r.postedAt, r.passThrough, r.feeRevenue, r.gstOnFee].join(','));
  }
  return lines.join('\n');
}
