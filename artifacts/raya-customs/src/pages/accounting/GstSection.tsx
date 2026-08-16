import { useEffect, useRef, useState } from 'react';
import { Percent } from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';
import { t } from '@/lib/i18n';
import { formatJod } from '@/lib/disbursementCalc';
import { downloadTextFile, gstReportToCsv } from '@/lib/exportCsv';
import { appendAudit } from '@/lib/auditLog';
import { fetchGstReport, type GstReport } from '@/lib/accountingApi';

function monthBounds(): { from: string; to: string } {
  const now = new Date();
  const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const to = now.toISOString().slice(0, 10);
  return { from, to };
}

interface Props {
  serverAvailable: boolean;
}

/**
 * GST / tax report tab: period summary of taxable agency-fee revenue vs
 * non-taxable pass-through, fed by the persisted journal entries so the
 * figures always match posted journals.
 */
export default function GstSection({ serverAvailable }: Props) {
  const { locale } = useLocale();
  const bounds = monthBounds();
  const [from, setFrom] = useState(bounds.from);
  const [to, setTo] = useState(bounds.to);
  const [ratePct, setRatePct] = useState('16');
  const [report, setReport] = useState<GstReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const requestSeq = useRef(0);

  const load = async (f: string, tt: string, rp: string) => {
    const seq = ++requestSeq.current;
    setLoading(true);
    setError(false);
    const rate = Number(rp) / 100;
    const r = await fetchGstReport(f, tt, Number.isFinite(rate) ? rate : undefined);
    if (seq !== requestSeq.current) return; // a newer request superseded this one
    if (r) setReport(r);
    else setError(true);
    setLoading(false);
  };

  useEffect(() => {
    if (serverAvailable) void load(bounds.from, bounds.to, '16');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverAvailable]);

  return (
    <div className="rounded-xl bg-elevated border border-subtle p-6">
      <div className="flex items-center gap-2 mb-2">
        <Percent size={18} className="text-accent" />
        <h2 className="text-base font-semibold text-white">
          {t(locale, 'GST / sales tax report', 'تقرير ضريبة المبيعات')}
        </h2>
      </div>
      <p className="text-xs text-dim mb-5 prose-ar max-w-3xl">
        {t(
          locale,
          'Built from posted journal entries, so figures always match the ledger: GST applies to the agency fee (411100) only; pass-through duties and government charges are non-taxable. Confirm the treatment with your tax advisor.',
          'مبني على القيود المرحَّلة، لذا تطابق الأرقام دفتر الأستاذ دائماً: الضريبة على أتعاب التخليص (411100) فقط؛ الرسوم الممرَّرة والحكومية غير خاضعة. أكّد المعاملة مع مستشارك الضريبي.',
        )}
      </p>

      {!serverAvailable ? (
        <p className="text-xs text-amber-300">
          {t(
            locale,
            'Sign in with a validated staff session to run GST reports from posted journals.',
            'سجّل الدخول بجلسة موظف موثّقة لتشغيل تقارير الضريبة من القيود المرحَّلة.',
          )}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-3 mb-5 print:hidden">
            <label className="text-[11px] text-dim">
              {t(locale, 'From', 'من')}
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="block mt-1 text-xs rounded-lg bg-navy-900 border border-subtle text-white px-2 py-1.5"
              />
            </label>
            <label className="text-[11px] text-dim">
              {t(locale, 'To', 'إلى')}
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="block mt-1 text-xs rounded-lg bg-navy-900 border border-subtle text-white px-2 py-1.5"
              />
            </label>
            <label className="text-[11px] text-dim">
              {t(locale, 'Rate %', 'النسبة ٪')}
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={ratePct}
                onChange={(e) => setRatePct(e.target.value)}
                className="block mt-1 w-20 text-xs rounded-lg bg-navy-900 border border-subtle text-white px-2 py-1.5 font-mono"
              />
            </label>
            <button
              type="button"
              disabled={loading || !from || !to || from > to}
              className="text-xs px-3 py-1.5 rounded-lg bg-accent text-white hover:bg-accent-hover disabled:opacity-50"
              onClick={() => void load(from, to, ratePct)}
            >
              {loading ? t(locale, 'Running…', 'جارٍ التشغيل…') : t(locale, 'Run report', 'تشغيل التقرير')}
            </button>
            {report && (
              <button
                type="button"
                className="text-xs px-3 py-1.5 rounded-lg border border-subtle text-muted hover:text-white"
                onClick={() => {
                  downloadTextFile(`raya-gst-${report.from}-to-${report.to}.csv`, gstReportToCsv(report));
                  appendAudit('staff', 'export_gst', `Exported GST report ${report.from}..${report.to}`, `تصدير تقرير الضريبة ${report.from}..${report.to}`);
                }}
              >
                {t(locale, 'Export CSV', 'تصدير CSV')}
              </button>
            )}
          </div>
          {error && (
            <p className="text-xs text-danger mb-4">
              {t(locale, 'Could not run the report — check the period.', 'تعذّر تشغيل التقرير — تحقق من الفترة.')}
            </p>
          )}
          {report && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                <div className="rounded-xl bg-navy-900 border border-subtle p-4">
                  <p className="text-[11px] text-dim mb-1">
                    {t(locale, 'Taxable fee revenue', 'إيراد الأتعاب الخاضع')}
                  </p>
                  <p className="text-lg font-semibold text-success font-mono">
                    {formatJod(report.feeRevenue, locale)}
                  </p>
                </div>
                <div className="rounded-xl bg-navy-900 border border-subtle p-4">
                  <p className="text-[11px] text-dim mb-1">
                    {t(locale, 'GST collectible', 'الضريبة المستحقة التحصيل')}
                  </p>
                  <p className="text-lg font-semibold text-amber-300 font-mono">
                    {formatJod(report.gstCollectible, locale)}
                  </p>
                  <p className="text-[10px] text-dim mt-0.5">
                    {(report.rate * 100).toFixed(1)}% {t(locale, 'on fees', 'على الأتعاب')}
                  </p>
                </div>
                <div className="rounded-xl bg-navy-900 border border-subtle p-4">
                  <p className="text-[11px] text-dim mb-1">
                    {t(locale, 'Pass-through (non-taxable)', 'الممرَّر (غير خاضع)')}
                  </p>
                  <p className="text-lg font-semibold text-white font-mono">
                    {formatJod(report.passThrough, locale)}
                  </p>
                </div>
                <div className="rounded-xl bg-navy-900 border border-subtle p-4">
                  <p className="text-[11px] text-dim mb-1">
                    {t(locale, 'Journal entries in period', 'قيود الفترة')}
                  </p>
                  <p className="text-lg font-semibold text-white font-mono">{report.entryCount}</p>
                </div>
              </div>
              {report.rows.length === 0 ? (
                <p className="text-xs text-dim">
                  {t(
                    locale,
                    'No posted journals in this period — post journals from the workspace tab first.',
                    'لا قيود مرحَّلة في هذه الفترة — رحّل القيود من تبويب مساحة العمل أولاً.',
                  )}
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-subtle">
                  <table className="w-full text-xs min-w-[560px]" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
                    <thead>
                      <tr className="bg-navy-900 text-dim">
                        <th className="text-start px-3 py-2 font-medium">{t(locale, 'File', 'الملف')}</th>
                        <th className="text-start px-3 py-2 font-medium">{t(locale, 'Posted', 'التاريخ')}</th>
                        <th className="text-end px-3 py-2 font-medium">{t(locale, 'Pass-through', 'الممرَّر')}</th>
                        <th className="text-end px-3 py-2 font-medium">{t(locale, 'Fee revenue', 'إيراد الأتعاب')}</th>
                        <th className="text-end px-3 py-2 font-medium">{t(locale, 'GST on fee', 'ضريبة الأتعاب')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.rows.map((r) => (
                        <tr key={`${r.disbursementId}-${r.stage}`} className="border-t border-subtle">
                          <td className="px-3 py-2 font-mono text-white">{r.disbursementId}</td>
                          <td className="px-3 py-2 text-dim">{r.postedAt}</td>
                          <td className="px-3 py-2 text-end font-mono text-slate-300">
                            {formatJod(r.passThrough, locale)}
                          </td>
                          <td className="px-3 py-2 text-end font-mono text-success">
                            {formatJod(r.feeRevenue, locale)}
                          </td>
                          <td className="px-3 py-2 text-end font-mono text-amber-300">
                            {formatJod(r.gstOnFee, locale)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
