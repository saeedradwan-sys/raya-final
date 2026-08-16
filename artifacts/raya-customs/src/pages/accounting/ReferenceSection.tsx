import { Link } from 'react-router-dom';
import { Scale, Info } from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';
import { t } from '@/lib/i18n';
import {
  ACCOUNTING_PRINCIPLE,
  DOUBLE_ENTRY,
  CHART_INTRO,
  CHART_ACCOUNTS,
  FLOW_STEPS,
  GST_NOTE,
} from '@/content/accounting';
import { TERMS } from '@/content/terminology';

const ACCOUNT_TYPE_LABEL: Record<string, { en: string; ar: string }> = {
  asset: { en: 'Asset', ar: 'أصل' },
  liability: { en: 'Liability', ar: 'التزام' },
  equity: { en: 'Equity', ar: 'حقوق ملكية' },
  revenue: { en: 'Revenue', ar: 'إيراد' },
  expense: { en: 'Expense', ar: 'مصروف' },
};

/**
 * Reference / teaching content for the accounting workspace: core principle,
 * GST note, double-entry mechanism, chart of accounts, flows, and terminology.
 * Kept out of the main day-to-day workflow tabs.
 */
export default function ReferenceSection() {
  const { locale } = useLocale();

  return (
    <div>
      {/* Principle */}
      <div className="rounded-xl border border-warning/30 bg-warning/5 p-5 mb-6">
        <div className="flex items-start gap-3">
          <Scale size={18} className="text-warning shrink-0 mt-0.5" />
          <div>
            <h2 className="text-sm font-semibold text-warning mb-1">
              {t(locale, ACCOUNTING_PRINCIPLE.titleEn, ACCOUNTING_PRINCIPLE.titleAr)}
            </h2>
            <p className="text-xs text-muted leading-relaxed">
              {t(locale, ACCOUNTING_PRINCIPLE.bodyEn, ACCOUNTING_PRINCIPLE.bodyAr)}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-subtle bg-elevated p-5 mb-10 flex items-start gap-3">
        <Info size={16} className="text-accent shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-semibold text-white mb-1">
            {t(locale, GST_NOTE.titleEn, GST_NOTE.titleAr)}
          </h3>
          <p className="text-xs text-muted leading-relaxed">
            {t(locale, GST_NOTE.bodyEn, GST_NOTE.bodyAr)}
          </p>
        </div>
      </div>

      {/* Double-entry */}
      <div id="sec-double" className="mb-12">
        <h2 className="text-lg font-semibold text-white mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
          {t(locale, DOUBLE_ENTRY.titleEn, DOUBLE_ENTRY.titleAr)}
        </h2>
        <p className="text-sm text-muted mb-4 max-w-3xl leading-relaxed prose-ar">
          {t(locale, DOUBLE_ENTRY.ruleEn, DOUBLE_ENTRY.ruleAr)}
        </p>
        <div className="rounded-xl bg-navy-900 border border-subtle p-4 mb-5">
          <p className="text-xs text-dim mb-1">{t(locale, 'Accounting equation', 'المعادلة المحاسبية')}</p>
          <p className="text-sm font-mono text-accent" dir="ltr">
            {locale === 'ar' ? DOUBLE_ENTRY.equationAr : DOUBLE_ENTRY.equationEn}
          </p>
          {locale === 'ar' && (
            <p className="text-xs text-muted mt-1 font-mono" dir="ltr">{DOUBLE_ENTRY.equationEn}</p>
          )}
        </div>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
          {DOUBLE_ENTRY.rules.map((r) => (
            <li key={r.en} className="text-xs text-muted rounded-lg bg-elevated border border-subtle px-3 py-2 leading-relaxed prose-ar">
              {t(locale, r.en, r.ar)}
            </li>
          ))}
        </ul>
        <h3 className="text-sm font-semibold text-white mb-3">
          {t(locale, 'Worked examples (Raya clearing)', 'أمثلة عملية (تسوية راية)')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          {DOUBLE_ENTRY.examples.map((ex) => (
            <div key={ex.titleEn} className="rounded-xl bg-elevated border border-subtle p-4">
              <p className="text-xs font-semibold text-white mb-3">
                {t(locale, ex.titleEn, ex.titleAr)}
              </p>
              <ul className="space-y-1.5">
                {ex.lines.map((ln, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-mono text-accent" dir="ltr">{ln.account}</span>
                    <span className="text-muted flex-1 text-start">
                      {t(locale, ln.en, ln.ar)}
                    </span>
                    <span
                      className={
                        ln.side === 'debit'
                          ? 'text-amber-300 font-medium'
                          : 'text-sky-300 font-medium'
                      }
                    >
                      {ln.side === 'debit'
                        ? t(locale, 'Debit', 'مدين')
                        : t(locale, 'Credit', 'دائن')}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="text-xs text-dim leading-relaxed prose-ar max-w-3xl">
          {t(locale, DOUBLE_ENTRY.pnlEn, DOUBLE_ENTRY.pnlAr)}
        </p>
      </div>

      {/* Chart of accounts */}
      <h2 id="sec-coa" className="text-lg font-semibold text-white mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
        {t(locale, CHART_INTRO.titleEn, CHART_INTRO.titleAr)}
      </h2>
      <p className="text-sm text-muted mb-4 max-w-3xl leading-relaxed prose-ar">
        {t(locale, CHART_INTRO.bodyEn, CHART_INTRO.bodyAr)}
      </p>
      <div className="overflow-x-auto rounded-xl border border-subtle mb-4 table-desktop-only">
        <table className="w-full text-sm min-w-[560px]" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
          <thead>
            <tr className={`bg-navy-800 text-dim text-[11px] ${locale === 'ar' ? '' : 'uppercase tracking-wider'}`}>
              <th className="text-start px-3 py-2.5 font-medium">{t(locale, 'Code', 'الرمز')}</th>
              <th className="text-start px-3 py-2.5 font-medium">{t(locale, 'Name', 'الاسم')}</th>
              <th className="text-start px-3 py-2.5 font-medium">{t(locale, 'Type', 'النوع')}</th>
              <th className="text-start px-3 py-2.5 font-medium">{t(locale, 'Role', 'الدور')}</th>
            </tr>
          </thead>
          <tbody>
            {CHART_ACCOUNTS.map((a) => (
              <tr key={a.code} className="border-t border-subtle">
                <td className="px-3 py-3 font-mono text-accent text-xs" dir="ltr">{a.code}</td>
                <td className="px-3 py-3 text-white text-xs">{t(locale, a.nameEn, a.nameAr)}</td>
                <td className="px-3 py-3 text-xs text-muted">
                  {t(
                    locale,
                    ACCOUNT_TYPE_LABEL[a.type]?.en ?? a.type,
                    ACCOUNT_TYPE_LABEL[a.type]?.ar ?? a.type,
                  )}
                </td>
                <td className="px-3 py-3 text-xs text-dim leading-relaxed max-w-md">
                  {t(locale, a.roleEn, a.roleAr)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="cards-mobile-only space-y-3 mb-12">
        {CHART_ACCOUNTS.map((a) => (
          <div key={a.code} className="rounded-xl bg-elevated border border-subtle p-4">
            <p className="font-mono text-accent text-xs mb-1" dir="ltr">{a.code}</p>
            <p className="text-sm text-white mb-1">{t(locale, a.nameEn, a.nameAr)}</p>
            <p className="text-[11px] text-muted mb-2">
              {t(
                locale,
                ACCOUNT_TYPE_LABEL[a.type]?.en ?? a.type,
                ACCOUNT_TYPE_LABEL[a.type]?.ar ?? a.type,
              )}
            </p>
            <p className="text-xs text-dim leading-relaxed">{t(locale, a.roleEn, a.roleAr)}</p>
          </div>
        ))}
      </div>

      {/* Flows */}
      <div id="sec-flows" className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
        {(['pay_first', 'client_prepay'] as const).map((key) => {
          const flow = FLOW_STEPS[key];
          const steps = locale === 'ar' ? flow.stepsAr : flow.stepsEn;
          return (
            <div key={key} className="rounded-xl bg-elevated border border-subtle p-5">
              <h3 className="text-sm font-semibold text-white mb-3">
                {t(locale, flow.titleEn, flow.titleAr)}
              </h3>
              <ol className="space-y-2">
                {steps.map((s) => (
                  <li key={s} className="text-xs text-muted leading-relaxed">
                    {s}
                  </li>
                ))}
              </ol>
            </div>
          );
        })}
      </div>

      {/* Terminology */}
      <div id="sec-acct-terms">
        <h2 className="text-lg font-semibold text-white mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
          {t(locale, 'Accounting terminology', 'مصطلحات المحاسبة')}
        </h2>
        <p className="text-sm text-muted mb-5 max-w-3xl leading-relaxed prose-ar">
          {t(
            locale,
            'Arabic terms for clearing accounts, journals, and client recovery. Full glossary also on the ASYCUDA page.',
            'المصطلحات العربية لحسابات التسوية والقيود واسترداد العميل. المسرد الكامل أيضاً في صفحة الأسيكودا.',
          )}
        </p>
        <div className="overflow-x-auto rounded-xl border border-subtle">
          <table className="w-full text-sm" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
            <thead>
              <tr className={`bg-navy-800 text-dim text-[11px] ${locale === 'ar' ? '' : 'uppercase tracking-wider'}`}>
                <th className="text-start px-3 py-2.5 font-medium">{t(locale, 'English', 'الإنجليزية')}</th>
                <th className="text-start px-3 py-2.5 font-medium">{t(locale, 'Arabic', 'العربية')}</th>
                <th className="text-start px-3 py-2.5 font-medium">{t(locale, 'Meaning', 'المعنى')}</th>
              </tr>
            </thead>
            <tbody>
              {TERMS.filter((x) => x.category === 'accounting').map((term) => (
                <tr key={term.id} className="border-t border-subtle">
                  <td className="px-3 py-2.5 text-slate-300 text-xs">{term.en}</td>
                  <td className="px-3 py-2.5 text-white text-xs font-medium">{term.ar}</td>
                  <td className="px-3 py-2.5 text-dim text-xs leading-relaxed prose-ar">
                    {t(locale, term.defEn, term.defAr)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-dim mt-3">
          <Link to="/asycuda" className="text-accent hover:underline">
            {t(locale, 'Full customs terminology glossary', 'مسرد مصطلحات التخليص الكامل')}
          </Link>
        </p>
      </div>
    </div>
  );
}
