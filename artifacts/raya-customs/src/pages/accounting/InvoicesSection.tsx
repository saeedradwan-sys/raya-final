import { useEffect, useState } from 'react';
import { CheckCircle2, Clock3, FileSpreadsheet, Receipt, WalletCards } from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';
import { t } from '@/lib/i18n';
import { formatJod, clientStatementLines } from '@/lib/disbursementCalc';
import type { DisbursementCase } from '@/lib/types';
import { clientStatementToCsv, downloadTextFile, invoiceToCsv } from '@/lib/exportCsv';
import { appendAudit } from '@/lib/auditLog';
import {
  fetchInvoices,
  fetchStatement,
  issueInvoiceForCase,
  updateInvoiceStatus,
  type Invoice,
  type InvoiceStatus,
  type StatementLine,
} from '@/lib/accountingApi';

const STATUS_STYLE: Record<InvoiceStatus, string> = {
  draft: 'bg-slate-500/15 text-slate-300',
  sent: 'bg-sky-500/15 text-sky-300',
  paid: 'bg-emerald-500/15 text-emerald-300',
  overdue: 'bg-red-500/15 text-red-300',
  void: 'bg-slate-500/15 text-slate-400 line-through',
};

const STATUS_LABEL: Record<InvoiceStatus, { en: string; ar: string }> = {
  draft: { en: 'Draft', ar: 'مسودة' },
  sent: { en: 'Sent', ar: 'مرسلة' },
  paid: { en: 'Paid', ar: 'مدفوعة' },
  overdue: { en: 'Overdue', ar: 'متأخرة' },
  void: { en: 'Void', ar: 'ملغاة' },
};

const NEXT_STATUSES: Record<InvoiceStatus, InvoiceStatus[]> = {
  draft: ['sent', 'void'],
  sent: ['paid', 'overdue', 'void'],
  overdue: ['paid', 'void'],
  paid: [],
  void: [],
};

interface Props {
  cases: DisbursementCase[];
  canMutate: boolean;
  serverAvailable: boolean;
}

/**
 * Invoices & statements tab: issue a client invoice from a saved disbursement
 * case, track its lifecycle (draft → sent → paid/overdue), export it, and
 * view/export the underlying client recovery statement.
 */
export default function InvoicesSection({ cases, canMutate, serverAvailable }: Props) {
  const { locale } = useLocale();
  const [caseId, setCaseId] = useState(cases[0]?.id ?? '');
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [serverStatement, setServerStatement] = useState<StatementLine[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<'issued' | 'existing' | 'error' | null>(null);

  const selectedCase = cases.find((c) => c.id === caseId) ?? cases[0];

  useEffect(() => {
    if (!caseId && cases[0]?.id) setCaseId(cases[0].id);
  }, [cases, caseId]);

  useEffect(() => {
    let cancelled = false;
    fetchInvoices().then((rows) => {
      if (!cancelled) setInvoices(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedCase?.id) return;
    let cancelled = false;
    setServerStatement(null);
    fetchStatement(selectedCase.id).then((lines) => {
      if (!cancelled) setServerStatement(lines);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedCase?.id]);

  const statementLines =
    serverStatement ?? (selectedCase ? clientStatementLines(selectedCase) : []);
  const invoiceRows = invoices ?? [];
  const invoiceKpis = {
    open: invoiceRows.filter((invoice) => !['paid', 'void'].includes(invoice.status)).reduce((sum, invoice) => sum + invoice.total, 0),
    overdue: invoiceRows.filter((invoice) => invoice.status === 'overdue').reduce((sum, invoice) => sum + invoice.total, 0),
    collected: invoiceRows.filter((invoice) => invoice.status === 'paid').reduce((sum, invoice) => sum + invoice.total, 0),
  };

  /** HTML-escape a dynamic value before it is written into the print document.
   * Invoice payload fields originate from persisted disbursement data, so
   * they must never be interpolated raw (stored XSS). */
  const escHtml = (value: unknown): string =>
    String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const printInvoice = (inv: Invoice) => {
    const w = window.open('', '_blank', 'width=720,height=900');
    if (!w) return;
    const rows = (inv.payload.lines || [])
      .map(
        (r) =>
          `<tr${r.kind === 'total' ? ' style="font-weight:bold;background:#f1f5f9"' : ''}><td style="padding:6px 10px;border-top:1px solid #e2e8f0">${escHtml(locale === 'ar' ? r.labelAr : r.labelEn)}</td><td style="padding:6px 10px;border-top:1px solid #e2e8f0;text-align:end;font-family:monospace">${escHtml(Number(r.amount).toFixed(2))}</td></tr>`,
      )
      .join('');
    w.document.write(`<!doctype html><html dir="${locale === 'ar' ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><title>${escHtml(inv.invoiceNumber)}</title></head>
<body style="font-family:system-ui,sans-serif;color:#0f172a;padding:32px;max-width:640px;margin:auto">
<h1 style="font-size:20px;margin-bottom:2px">RAYA Customs Clearance</h1>
<p style="color:#64748b;font-size:13px;margin-top:0">${locale === 'ar' ? 'فاتورة تخليص جمركي' : 'Customs clearance invoice'}</p>
<table style="width:100%;font-size:13px;margin:16px 0"><tr>
<td><b>${locale === 'ar' ? 'رقم الفاتورة' : 'Invoice'}</b>: ${escHtml(inv.invoiceNumber)}<br>
<b>${locale === 'ar' ? 'البيان' : 'Declaration'}</b>: ${escHtml(inv.payload.declarationNo || inv.disbursementId)}<br>
<b>${locale === 'ar' ? 'العميل' : 'Client'}</b>: ${escHtml(locale === 'ar' ? inv.payload.clientNameAr || inv.payload.clientNameEn || '' : inv.payload.clientNameEn || '')}</td>
<td style="text-align:end"><b>${locale === 'ar' ? 'تاريخ الإصدار' : 'Issued'}</b>: ${escHtml(inv.issuedAt || '')}<br>
<b>${locale === 'ar' ? 'الاستحقاق' : 'Due'}</b>: ${escHtml(inv.dueAt || '')}<br>
<b>${locale === 'ar' ? 'الحالة' : 'Status'}</b>: ${STATUS_LABEL[inv.status][locale === 'ar' ? 'ar' : 'en']}</td>
</tr></table>
<table style="width:100%;font-size:13px;border:1px solid #e2e8f0;border-radius:8px;border-collapse:collapse">${rows}
<tr><td style="padding:6px 10px;border-top:1px solid #e2e8f0">${locale === 'ar' ? `ضريبة المبيعات على الأتعاب (${escHtml((inv.gstRate * 100).toFixed(0))}٪)` : `GST on agency fee (${escHtml((inv.gstRate * 100).toFixed(0))}%)`}</td><td style="padding:6px 10px;border-top:1px solid #e2e8f0;text-align:end;font-family:monospace">${escHtml(inv.gstAmount.toFixed(2))}</td></tr>
<tr style="font-weight:bold;background:#0f172a;color:#fff"><td style="padding:8px 10px">${locale === 'ar' ? 'الإجمالي شامل الضريبة' : 'Total incl. GST'}</td><td style="padding:8px 10px;text-align:end;font-family:monospace">${escHtml(inv.total.toFixed(2))} ${escHtml(inv.currency)}</td></tr>
</table>
<p style="color:#64748b;font-size:11px;margin-top:16px">${locale === 'ar' ? 'الرسوم الجمركية والحكومية ممرَّرة وليست خاضعة للضريبة — الضريبة على أتعاب التخليص فقط.' : 'Customs and government charges are pass-through and non-taxable — GST applies to the agency fee only.'}</p>
<script>window.print()</script></body></html>`);
    w.document.close();
  };

  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-6">
        <div className="rounded-xl border border-subtle bg-navy-900/70 p-4">
          <div className="flex items-center gap-2 text-[11px] text-dim"><WalletCards size={14} className="text-accent" />{t(locale, 'Open receivable', 'الذمم المفتوحة')}</div>
          <p className="mt-2 font-mono text-lg font-semibold text-white">{formatJod(invoiceKpis.open, locale)}</p>
          <p className="mt-1 text-[10px] text-dim">{invoiceRows.filter((invoice) => !['paid', 'void'].includes(invoice.status)).length} {t(locale, 'open invoices', 'فواتير مفتوحة')}</p>
        </div>
        <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
          <div className="flex items-center gap-2 text-[11px] text-amber-100"><Clock3 size={14} />{t(locale, 'Overdue watch', 'مراقبة المتأخرات')}</div>
          <p className="mt-2 font-mono text-lg font-semibold text-amber-200">{formatJod(invoiceKpis.overdue, locale)}</p>
          <p className="mt-1 text-[10px] text-amber-100/70">{invoiceRows.filter((invoice) => invoice.status === 'overdue').length} {t(locale, 'need collection follow-up', 'تحتاج متابعة التحصيل')}</p>
        </div>
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4">
          <div className="flex items-center gap-2 text-[11px] text-emerald-100"><CheckCircle2 size={14} />{t(locale, 'Collected', 'المحصّل')}</div>
          <p className="mt-2 font-mono text-lg font-semibold text-emerald-200">{formatJod(invoiceKpis.collected, locale)}</p>
          <p className="mt-1 text-[10px] text-emerald-100/70">{invoiceRows.filter((invoice) => invoice.status === 'paid').length} {t(locale, 'paid invoices', 'فواتير مدفوعة')}</p>
        </div>
      </div>
      {/* Issue invoice */}
      <div className="rounded-xl bg-elevated border border-subtle p-6 mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Receipt size={18} className="text-accent" />
          <h2 className="text-base font-semibold text-white">
            {t(locale, 'Issue client invoice', 'إصدار فاتورة عميل')}
          </h2>
        </div>
        <p className="text-xs text-dim mb-4 prose-ar">
          {t(
            locale,
            'The server computes the invoice from the saved file: pass-through + agency fee + GST on the fee. One open invoice per file — reissuing returns the existing one.',
            'الخادم يحسب الفاتورة من الملف المحفوظ: الممرَّر + الأتعاب + الضريبة على الأتعاب. فاتورة مفتوحة واحدة لكل ملف — إعادة الإصدار تعيد الفاتورة القائمة.',
          )}
        </p>
        {!serverAvailable && (
          <p className="text-xs text-amber-300 mb-4">
            {t(
              locale,
              'Sign in with a validated staff session to issue and track invoices.',
              'سجّل الدخول بجلسة موظف موثّقة لإصدار الفواتير وتتبعها.',
            )}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2 mb-2 print:hidden">
          <select
            value={selectedCase?.id ?? ''}
            onChange={(e) => setCaseId(e.target.value)}
            className="rounded-lg bg-navy-900 border border-subtle px-3 py-1.5 text-xs text-white"
          >
            {cases.map((d) => (
              <option key={d.id} value={d.id}>
                {d.declarationNo} — {locale === 'ar' ? d.clientNameAr : d.clientNameEn}
              </option>
            ))}
          </select>
          {canMutate && serverAvailable && (
            <button
              type="button"
              disabled={busy || !selectedCase}
              className="text-xs px-3 py-1.5 rounded-lg bg-accent text-white hover:bg-accent-hover disabled:opacity-50"
              onClick={async () => {
                if (!selectedCase) return;
                setBusy(true);
                setNotice(null);
                const res = await issueInvoiceForCase(selectedCase.id);
                if (res) {
                  setNotice(res.existed ? 'existing' : 'issued');
                  const rows = await fetchInvoices();
                  if (rows) setInvoices(rows);
                } else {
                  setNotice('error');
                }
                setBusy(false);
              }}
            >
              {busy ? t(locale, 'Issuing…', 'جارٍ الإصدار…') : t(locale, 'Issue invoice', 'إصدار فاتورة')}
            </button>
          )}
          {notice === 'issued' && (
            <span className="text-[11px] text-emerald-400">
              {t(locale, 'Invoice issued and audited.', 'صدرت الفاتورة وسُجّلت في التدقيق.')}
            </span>
          )}
          {notice === 'existing' && (
            <span className="text-[11px] text-sky-300">
              {t(locale, 'An open invoice already exists for this file.', 'توجد فاتورة مفتوحة لهذا الملف.')}
            </span>
          )}
          {notice === 'error' && (
            <span className="text-[11px] text-danger">
              {t(locale, 'Could not issue — save the file to the server first.', 'تعذّر الإصدار — احفظ الملف على الخادم أولاً.')}
            </span>
          )}
        </div>

        {/* Invoice list */}
        {invoices && invoices.length > 0 ? (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-xs" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
              <thead>
                <tr className="text-dim border-b border-subtle">
                  <th className="text-start px-3 py-2">{t(locale, 'Invoice', 'الفاتورة')}</th>
                  <th className="text-start px-3 py-2">{t(locale, 'File / client', 'الملف / العميل')}</th>
                  <th className="text-end px-3 py-2">{t(locale, 'Total', 'الإجمالي')}</th>
                  <th className="text-start px-3 py-2">{t(locale, 'Due', 'الاستحقاق')}</th>
                  <th className="text-start px-3 py-2">{t(locale, 'Status', 'الحالة')}</th>
                  <th className="text-start px-3 py-2 print:hidden">{t(locale, 'Actions', 'إجراءات')}</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-subtle/50 align-top">
                    <td className="px-3 py-2 font-mono text-white whitespace-nowrap">{inv.invoiceNumber}</td>
                    <td className="px-3 py-2 text-muted">
                      <span className="font-mono text-slate-300">{inv.payload.declarationNo || inv.disbursementId}</span>
                      <span className="block text-dim">
                        {locale === 'ar'
                          ? inv.payload.clientNameAr || inv.payload.clientNameEn
                          : inv.payload.clientNameEn}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-end font-mono text-white whitespace-nowrap">
                      {formatJod(inv.total, locale)}
                    </td>
                    <td className="px-3 py-2 text-dim whitespace-nowrap">{inv.dueAt || '—'}</td>
                    <td className="px-3 py-2">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[inv.status]}`}>
                        {t(locale, STATUS_LABEL[inv.status].en, STATUS_LABEL[inv.status].ar)}
                      </span>
                    </td>
                    <td className="px-3 py-2 print:hidden">
                      <div className="flex flex-wrap gap-1.5">
                        {canMutate &&
                          NEXT_STATUSES[inv.status].map((next) => (
                            <button
                              key={next}
                              type="button"
                              className="text-[10px] px-2 py-0.5 rounded border border-subtle text-muted hover:text-white"
                              onClick={async () => {
                                const updated = await updateInvoiceStatus(inv.id, next);
                                if (updated) {
                                  setInvoices((prev) =>
                                    prev ? prev.map((r) => (r.id === updated.id ? updated : r)) : prev,
                                  );
                                }
                              }}
                            >
                              {t(locale, `Mark ${STATUS_LABEL[next].en.toLowerCase()}`, `تعليم ${STATUS_LABEL[next].ar}`)}
                            </button>
                          ))}
                        <button
                          type="button"
                          className="text-[10px] px-2 py-0.5 rounded border border-subtle text-muted hover:text-white"
                          onClick={() => {
                            downloadTextFile(`raya-${inv.invoiceNumber}.csv`, invoiceToCsv(inv));
                            appendAudit('staff', 'export_invoice', `Exported invoice ${inv.invoiceNumber}`, `تصدير فاتورة ${inv.invoiceNumber}`);
                          }}
                        >
                          CSV
                        </button>
                        <button
                          type="button"
                          className="text-[10px] px-2 py-0.5 rounded border border-subtle text-muted hover:text-white"
                          onClick={() => printInvoice(inv)}
                        >
                          {t(locale, 'Print', 'طباعة')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-dim mt-4">
            {invoices === null
              ? serverAvailable
                ? t(locale, 'Loading invoices…', 'جارٍ تحميل الفواتير…')
                : ''
              : t(locale, 'No invoices issued yet.', 'لا فواتير صادرة بعد.')}
          </p>
        )}
      </div>

      {/* Client statement */}
      <div className="rounded-xl bg-elevated border border-subtle p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={18} className="text-accent" />
            <h2 className="text-base font-semibold text-white">
              {t(locale, 'Client recovery statement', 'كشف استرداد العميل')}
            </h2>
          </div>
          {selectedCase && (
            <button
              type="button"
              className="text-xs px-3 py-1.5 rounded-lg border border-subtle text-muted hover:text-white print:hidden"
              onClick={() => {
                downloadTextFile(
                  `raya-statement-${selectedCase.declarationNo.replace(/\//g, '-')}.csv`,
                  clientStatementToCsv(selectedCase),
                );
                appendAudit(
                  'staff',
                  'export_statement',
                  `Exported statement ${selectedCase.declarationNo}`,
                  `تصدير كشف ${selectedCase.declarationNo}`,
                );
              }}
            >
              {t(locale, 'Export statement CSV', 'تصدير الكشف CSV')}
            </button>
          )}
        </div>
        {selectedCase && (
          <>
            <p className="text-xs text-muted mb-4">
              {t(locale, selectedCase.clientNameEn, selectedCase.clientNameAr)} ·{' '}
              <span className="font-mono">{selectedCase.declarationNo}</span> ·{' '}
              {selectedCase.mode === 'pay_first'
                ? t(locale, 'Pay-first', 'دفع أولاً')
                : t(locale, 'Prepay', 'مقدم')}
            </p>
            <table className="w-full text-xs" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
              <thead>
                <tr className="text-dim border-b border-subtle">
                  <th className="text-start py-2 font-medium">{t(locale, 'Description', 'الوصف')}</th>
                  <th className="text-end py-2 font-medium">{t(locale, 'Amount (JOD)', 'المبلغ (د.أ)')}</th>
                </tr>
              </thead>
              <tbody>
                {statementLines.map((row) => (
                  <tr
                    key={row.labelEn}
                    className={`border-t border-subtle ${
                      row.kind === 'total' ? 'bg-navy-900/60 font-semibold' : ''
                    }`}
                  >
                    <td className="py-2.5 text-muted">
                      {t(locale, row.labelEn, row.labelAr)}
                      {row.kind === 'fee' && (
                        <span className="ms-2 text-[10px] text-success">
                          {t(locale, '→ revenue', '→ إيراد')}
                        </span>
                      )}
                      {row.kind === 'passthrough' && row.labelEn.startsWith('Pass') && (
                        <span className="ms-2 text-[10px] text-dim">
                          {t(locale, '→ clearing', '→ تسوية')}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 text-end font-mono text-slate-300">
                      {formatJod(row.amount, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
