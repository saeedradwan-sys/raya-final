import type { ClearingReconciliation, DisbursementCase } from '@/lib/types';
import { clientStatementLines, passThroughTotal, round2 } from '@/lib/disbursementCalc';

function esc(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
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
